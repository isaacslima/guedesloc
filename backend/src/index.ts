import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { serviceAuthMiddleware } from './middleware/auth.js'
import {
  verificarEBloquearIdempotencia,
  registrarSucessoIdempotencia,
  registrarErroIdempotencia,
} from './services/idempotency.js'
import { publicarEventoOS, type TipoEventoOS } from './services/pubsub.js'
import { db, FieldValue, sanitizarIdDocumento } from './services/firestore.js'
import { logger } from './services/logger.js'

interface RequestComId extends Request {
  requestId?: string
}

const app = express()
const PORT = process.env.PORT || 8080

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
    await db
      .collection('ordens_integradas')
      .doc(sanitizarIdDocumento(idempotencyKey))
      .set({ ...payload, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true })

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

app.listen(PORT, () => {
  logger.info(`Gateway Backend rodando na porta ${PORT}`, { port: PORT })
})
