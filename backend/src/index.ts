import 'dotenv/config'
// Sentry precisa inicializar antes de qualquer outro módulo pra conseguir
// instrumentar erros desde o começo.
import { Sentry } from './services/sentry.js'
import { randomUUID } from 'node:crypto'
import express from 'express'
import cors from 'cors'
import type { NextFunction, Request, Response } from 'express'
import { serviceAuthMiddleware, firebaseAuthMiddleware, type AuthenticatedRequest } from './middleware/auth.js'
import {
  verificarEBloquearIdempotencia,
  registrarSucessoIdempotencia,
  registrarErroIdempotencia,
} from './services/idempotency.js'
import { publicarEventoOS, type TipoEventoOS } from './services/pubsub.js'
import { db, FieldValue, Timestamp, sanitizarIdDocumento } from './services/firestore.js'
import { logger } from './services/logger.js'
import { derivarEtapaDeStatus, type OSEtapa, type OSStatus } from './services/etapaOS.js'
import { enviarMensagemOS, processarCallbackWhatsapp, zapiConfigurado } from './services/whatsapp.js'
import type { TipoMensagemWhatsapp } from './services/whatsappTemplates.js'
import { executarTick } from './services/automacoesEngine.js'
import { criarUsuario } from './services/usuarios.js'

interface RequestComId extends Request {
  requestId?: string
}

const app = express()
const PORT = process.env.PORT || 8080

// Só o front autenticado por Firebase chama o Gateway direto do navegador
// (rotas /api/v1/whatsapp/*, Card 11.1) — adapters (RPA/API) não passam
// por CORS, são server-to-server.
const ORIGENS_PERMITIDAS = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim())
app.use(cors({ origin: ORIGENS_PERMITIDAS }))

app.use(express.json())

// Loga toda requisição (método, rota, status, duração) — sem isso, falhas
// silenciosas (ex.: 401 de auth, 422 de validação) nunca aparecem em lugar
// nenhum (backlog Card 8.1).
app.use((req: RequestComId, res: Response, next: NextFunction) => {
  const requestId = randomUUID()
  const inicio = Date.now()
  req.requestId = requestId

  res.on('finish', () => {
    const duracaoMs = Date.now() - inicio
    const dados = { method: req.method, path: req.originalUrl, statusCode: res.statusCode, duracaoMs }
    if (res.statusCode >= 500) logger.error(`${req.method} ${req.originalUrl} ${res.statusCode}`, dados, { requestId })
    else if (res.statusCode >= 400) logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode}`, dados, { requestId })
    else logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, dados, { requestId })
  })

  next()
})

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'guedesloc-gateway-backend', timestamp: new Date().toISOString() })
})

// Ingestão Canônica de OS v1 (API Gateway)
app.post('/api/v1/os/ingest', serviceAuthMiddleware, async (req: RequestComId, res: Response): Promise<void> => {
  try {
    const payload = req.body

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ sucesso: false, erro: 'Payload JSON inválido.' })
      return
    }

    const { seguradoraId, seguradoraNome, numeroOsSeguradora, status, cliente, servico, datas } = payload

    // Validação de Campos Obrigatórios
    if (!seguradoraId || !numeroOsSeguradora || !cliente?.nome || !cliente?.endereco || !servico?.tipo || !datas?.criacao) {
      res.status(422).json({
        sucesso: false,
        erro: 'Payload fora do Contrato Canônico. Verifique campos obrigatórios (seguradoraId, numeroOsSeguradora, cliente, servico, datas).',
      })
      return
    }

    const idempotencyKey = payload.idempotencyKey || `${seguradoraId}:${numeroOsSeguradora}`

    // Checagem de Idempotência
    const idempotencyCheck = await verificarEBloquearIdempotencia(idempotencyKey, seguradoraId, numeroOsSeguradora)
    if (idempotencyCheck.isDuplicate) {
      res.status(409).json({
        sucesso: false,
        idempotente: true,
        mensagem: idempotencyCheck.mensagem,
        idempotencyKey,
      })
      return
    }

    // Grava no Firestore — único ponto de escrita de OS (backlog Card 3.1).
    // idempotencyKey como ID do documento: reenvio (ou reinício do Gateway,
    // que zera o Map em memória) só sobrescreve, nunca duplica.
    //
    // Coleção unificada `ordens` (backlog Fase 2, Card 9.3) — mesma que o
    // front usa pras OS manuais (src/composables/useOrdens.ts). Formato do
    // documento espelha src/types/ordem.ts::OrdemUnificada.
    const docRef = db.collection('ordens').doc(sanitizarIdDocumento(idempotencyKey))
    const existente = await docRef.get()
    const dadosExistentes = existente.data()
    const etapaAnterior: OSEtapa | null = existente.exists ? (dadosExistentes?.etapa ?? null) : null
    const historicoAnterior = existente.exists && Array.isArray(dadosExistentes?.historico) ? dadosExistentes!.historico : []
    const etapaNova = derivarEtapaDeStatus(status as OSStatus)

    await docRef.set({
      // `origem` fixo em integrada_rpa porque hoje só existe o piloto RPA
      // (Tempo Assist/Juvo) — quando o primeiro adapter de API real entrar
      // (backlog Fase 1, Card 2.1), decidir a origem por seguradora em vez
      // de fixo aqui.
      origem: 'integrada_rpa',
      seguradoraId,
      seguradoraNome,
      numero: numeroOsSeguradora,
      numeroOsSeguradora,
      idempotencyKey,
      status,
      etapa: etapaNova,
      cliente: {
        nome: cliente.nome,
        telefone: cliente.telefone ?? null,
        cpfCnpj: cliente.cpfCnpj ?? null,
        email: cliente.email ?? null,
        endereco: { texto: cliente.endereco },
      },
      prestadoresIds: [],
      prestadoresNomes: [],
      servico: {
        tipo: servico.tipo,
        descricao: servico.descricao ?? '',
        valor: typeof servico.valor === 'number' ? servico.valor : null,
      },
      datas: {
        criacao: Timestamp.fromDate(new Date(datas.criacao)),
        agendamento: datas.agendamento ?? null,
        conclusao: datas.conclusao ?? null,
      },
      historico: [
        ...historicoAnterior,
        {
          em: new Date().toISOString(),
          etapaAnterior,
          etapaNova,
          motivo: existente.exists ? 'Atualização recebida da integração' : 'Criação via integração',
        },
      ],
      camposAdicionais: payload.camposAdicionais ?? null,
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true })

    logger.info('OS gravada no Firestore', { idempotencyKey, seguradoraId, numeroOsSeguradora, status }, { requestId: req.requestId ?? '' })

    // Determina o eventoPubSub
    let tipoEvento: TipoEventoOS = 'os.criada'
    if (status === 'concluida') tipoEvento = 'os.finalizada'
    else if (status === 'cancelada') tipoEvento = 'os.cancelada'
    else if (status === 'em_andamento') tipoEvento = 'os.status_alterado'

    // Publica o Evento no Barramento Pub/Sub
    const eventoId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    await publicarEventoOS(tipoEvento, {
      id: eventoId,
      tipoEvento,
      timestamp: new Date().toISOString(),
      idempotencyKey,
      payloadOS: payload,
    })

    await registrarSucessoIdempotencia(idempotencyKey, seguradoraId, numeroOsSeguradora)

    res.status(201).json({
      sucesso: true,
      mensagem: 'Ordem de serviço ingerida e evento publicado com sucesso.',
      idempotencyKey,
      eventoId,
      tipoEvento,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const err = error as Error
    logger.error('Erro ao processar ingestão de OS', { erro: err.message, stack: err.stack }, { requestId: req.requestId ?? '' })
    // Nunca deixar uma falha secundária aqui (ex.: Firestore) escapar do
    // catch e derrubar o processo — isso já aconteceu (ver commit que
    // corrigiu OS com "/" no id) porque o erro original já está sendo
    // tratado; uma segunda exceção não pode virar rejection não tratada.
    if (req.body?.idempotencyKey) {
      try {
        await registrarErroIdempotencia(req.body.idempotencyKey, req.body?.seguradoraId, req.body?.numeroOsSeguradora)
      } catch (erroSecundario) {
        logger.error('Falha ao registrar erro de idempotência (secundária, ignorada)', {
          erro: erroSecundario instanceof Error ? erroSecundario.message : String(erroSecundario),
        }, { requestId: req.requestId ?? '' })
      }
    }
    res.status(500).json({ sucesso: false, erro: 'Erro interno ao processar ingestão de OS.', detalhe: err.message })
  }
})

// ─── WhatsApp (backlog Fase 4) ──────────────────────────────────

const TIPOS_MENSAGEM_VALIDOS: TipoMensagemWhatsapp[] = [
  'distribuicao', 'confirmacao_dia', 'confirmacao_entrega', 'cobranca_foto', 'cobranca_retirada',
]

// Envio (Cards 11.1 + 11.3) — primeira rota chamada pelo front autenticado
// via Firebase (não por um adapter/serviço), fecha o gap do Card 3.2.
app.post('/api/v1/whatsapp/enviar', firebaseAuthMiddleware, async (req: AuthenticatedRequest & RequestComId, res: Response): Promise<void> => {
  try {
    const { osId, tipo, prestadorId } = req.body ?? {}
    if (!osId || !TIPOS_MENSAGEM_VALIDOS.includes(tipo)) {
      res.status(422).json({ sucesso: false, erro: `Campos obrigatórios: osId, tipo (um de ${TIPOS_MENSAGEM_VALIDOS.join(', ')}).` })
      return
    }

    const resultado = await enviarMensagemOS(osId, tipo, prestadorId)
    if (!resultado.sucesso) {
      res.status(422).json({ sucesso: false, erro: resultado.erro })
      return
    }
    res.status(201).json(resultado)
  } catch (error) {
    const err = error as Error
    logger.error('Erro ao enviar mensagem WhatsApp', { erro: err.message, stack: err.stack }, { requestId: req.requestId ?? '' })
    res.status(500).json({ sucesso: false, erro: 'Erro interno ao enviar mensagem WhatsApp.' })
  }
})

// Webhook (Cards 11.2 + 11.4) — chamado pela Z-API, não pelo front nem por
// um adapter conhecido; protegido por segredo compartilhado (query string
// ou header, dependendo do que a Z-API permitir configurar).
app.post('/api/v1/whatsapp/webhook', async (req: Request, res: Response): Promise<void> => {
  const segredoEsperado = process.env.WHATSAPP_WEBHOOK_SECRET
  const segredoRecebido = (req.headers['x-webhook-secret'] as string | undefined) ?? (req.query.secret as string | undefined)

  if (!segredoEsperado || segredoRecebido !== segredoEsperado) {
    logger.warn('Webhook do WhatsApp rejeitado: segredo ausente/inválido', { path: req.originalUrl })
    res.status(401).json({ sucesso: false, erro: 'Não autorizado.' })
    return
  }

  try {
    await processarCallbackWhatsapp(req.body)
    res.status(200).json({ sucesso: true })
  } catch (error) {
    const err = error as Error
    logger.error('Erro ao processar callback do WhatsApp', { erro: err.message, stack: err.stack })
    res.status(500).json({ sucesso: false })
  }
})

// Diagnóstico simples (Card 11.6, versão mínima até existir uma tela de
// Configurações de verdade na Fase 8) — não exige auth de escrita, só
// informa se a integração está configurada.
app.get('/api/v1/whatsapp/status', firebaseAuthMiddleware, async (_req: Request, res: Response): Promise<void> => {
  const ultimoCallback = await db.collection('callbacks_whatsapp').orderBy('recebidoEm', 'desc').limit(1).get()
  const ultimoRecebidoEm = ultimoCallback.empty ? null : ultimoCallback.docs[0]!.data().recebidoEm?.toDate?.()?.toISOString() ?? null

  res.json({
    zapiConfigurado,
    webhookProtegido: Boolean(process.env.WHATSAPP_WEBHOOK_SECRET),
    ultimoCallbackRecebidoEm: ultimoRecebidoEm,
  })
})

// ─── Central de Automações (backlog Fase 5) ─────────────────────
// Configuração (automacoes_config) e fila de execução (automacoes_fila)
// são lidas/escritas direto pelo front via Firestore SDK — sem segredo
// envolvido, diferente do WhatsApp. Só o gatilho manual do motor passa
// pelo Gateway, pra poder testar sem esperar o setInterval abaixo.
app.post('/api/v1/automacoes/tick', firebaseAuthMiddleware, async (_req: Request, res: Response): Promise<void> => {
  const resultado = await executarTick()
  res.json(resultado)
})

// ─── Usuários e permissões (backlog Fase 8, Card 14.1) ──────────
// Único caminho de criação de conta — o Admin SDK aqui é o que tem
// permissão de criar usuários Firebase Auth de terceiros; o SDK client
// não consegue. Checagem de "só Super Admin cria" fica no service.
app.post('/api/v1/usuarios', firebaseAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, nome, perfil } = req.body ?? {}
  if (!email || !nome || !perfil) {
    res.status(400).json({ sucesso: false, erro: 'email, nome e perfil são obrigatórios.' })
    return
  }
  try {
    const resultado = await criarUsuario(req.user!.uid, email, nome, perfil)
    res.json({ sucesso: true, ...resultado })
  } catch (err) {
    logger.warn('Falha ao criar usuário', { erro: err instanceof Error ? err.message : String(err) })
    res.status(403).json({ sucesso: false, erro: err instanceof Error ? err.message : 'Erro ao criar usuário.' })
  }
})

// Precisa vir depois de todas as rotas — captura qualquer erro não tratado
// explicitamente (defesa extra; hoje toda rota já tem try/catch próprio).
Sentry.setupExpressErrorHandler(app)

// Tick periódico do motor de automações — local por enquanto (setInterval
// dentro do próprio processo do Gateway); Cloud Scheduler + Cloud Run Jobs
// fica pra quando a infra GCP real existir (gap da Fase 0/1).
const INTERVALO_AUTOMACOES_MS = Number(process.env.AUTOMACOES_INTERVALO_MS) || 60_000
setInterval(() => {
  executarTick().catch((err) => logger.error('Falha no tick periódico de automações', { erro: err instanceof Error ? err.message : String(err) }))
}, INTERVALO_AUTOMACOES_MS)

app.listen(PORT, () => {
  logger.info(`Gateway Backend rodando na porta ${PORT}`, { port: PORT })
})
