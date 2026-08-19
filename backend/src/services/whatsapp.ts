import { db, FieldValue } from './firestore.js'
import { logger } from './logger.js'
import { montarTemplate, type TipoMensagemWhatsapp } from './whatsappTemplates.js'
import { enviarTextoZapi, zapiConfigurado } from './zapi.js'
import type { OSEtapa } from './etapaOS.js'
import { derivarStatusDeEtapa } from './etapaOS.js'

export interface HistoricoEntradaOS {
  em: string
  etapaAnterior: OSEtapa | null
  etapaNova: OSEtapa
  motivo?: string
}

/** Exportado — reaproveitado pelo motor de automações (backend/src/services/automacoesEngine.ts). */
export async function registrarHistorico(osId: string, etapaNova: OSEtapa, motivo: string, extra: Record<string, unknown> = {}) {
  const osRef = db.collection('ordens').doc(osId)
  const osSnap = await osRef.get()
  if (!osSnap.exists) return
  const dados = osSnap.data()!
  const historicoAnterior: HistoricoEntradaOS[] = Array.isArray(dados.historico) ? dados.historico : []
  const novaEntrada: HistoricoEntradaOS = { em: new Date().toISOString(), etapaAnterior: dados.etapa ?? null, etapaNova, motivo }
  await osRef.update({
    etapa: etapaNova,
    status: derivarStatusDeEtapa(etapaNova),
    historico: [...historicoAnterior, novaEntrada],
    ...extra,
  })
}

// ─── Envio (Cards 11.1 + 11.3) ──────────────────────────────────

export interface ResultadoEnvioMensagemOS {
  sucesso: boolean
  simulado?: boolean
  mensagemId?: string
  erro?: string
}

export async function enviarMensagemOS(osId: string, tipo: TipoMensagemWhatsapp, prestadorIdParam?: string): Promise<ResultadoEnvioMensagemOS> {
  const osSnap = await db.collection('ordens').doc(osId).get()
  if (!osSnap.exists) return { sucesso: false, erro: 'OS não encontrada.' }
  const os = osSnap.data()!

  const prestadorId = prestadorIdParam ?? os.prestadoresIds?.[0]
  if (!prestadorId) return { sucesso: false, erro: 'OS sem prestador atribuído.' }

  const prestSnap = await db.collection('prestadores').doc(prestadorId).get()
  if (!prestSnap.exists) return { sucesso: false, erro: 'Prestador não encontrado.' }
  const prestador = prestSnap.data()!
  const telefone = ((prestador.telefone as string) || '').replace(/\D/g, '')
  if (!telefone) return { sucesso: false, erro: 'Prestador sem telefone cadastrado.' }

  const texto = montarTemplate(tipo, {
    numero: os.numero,
    clienteNome: os.cliente?.nome ?? '',
    endereco: os.cliente?.endereco?.texto ?? '',
    servicoTipo: os.servico?.tipo ?? '',
    agendamento: os.datas?.agendamento?.toDate ? os.datas.agendamento.toDate().toISOString() : os.datas?.agendamento,
  })

  const resultado = await enviarTextoZapi(telefone, texto)

  const msgRef = await db.collection('mensagens_whatsapp').add({
    osId,
    numeroOs: os.numero,
    prestadorId,
    prestadorNome: prestador.nome ?? '',
    prestadorTelefone: telefone,
    direcao: 'enviada',
    tipo,
    texto,
    status: resultado.sucesso ? (resultado.simulado ? 'simulado' : 'enviado') : 'falha',
    messageIdProvedor: resultado.messageId ?? null,
    erro: resultado.erro ?? null,
    criadoEm: FieldValue.serverTimestamp(),
  })

  if (resultado.sucesso) {
    logger.info('Mensagem WhatsApp enviada', { osId, tipo, prestadorId, simulado: resultado.simulado })
  } else {
    logger.error('Falha ao enviar mensagem WhatsApp', { osId, tipo, prestadorId, erro: resultado.erro })
  }

  return { sucesso: resultado.sucesso, simulado: resultado.simulado, mensagemId: msgRef.id, erro: resultado.erro }
}

// ─── Recebimento (Cards 11.2 + 11.4) ────────────────────────────

interface CallbackTexto {
  type?: string
  fromMe?: boolean
  phone?: string
  messageId?: string
  text?: { message?: string }
}

/**
 * Payload bruto sempre é persistido (Card 11.2), independente de
 * conseguirmos interpretar. Interpretação de "1"/"2" (Card 11.4) só se
 * aplica quando a OS correlacionada está com etapa
 * `distribuindo_aguardando_resposta` — qualquer outra etapa ou resposta
 * fora do padrão fica só registrada, pra um humano tratar na inbox.
 */
export async function processarCallbackWhatsapp(payload: unknown): Promise<void> {
  await db.collection('callbacks_whatsapp').add({ payload: payload ?? null, recebidoEm: FieldValue.serverTimestamp() })

  const dados = payload as CallbackTexto
  if (dados?.fromMe) return // eco da nossa própria mensagem, ignora
  if (dados?.type && dados.type !== 'ReceivedCallback') return // status de entrega/leitura etc., não é mensagem de texto

  const texto = dados?.text?.message
  const telefone = dados?.phone?.replace(/\D/g, '')
  if (!texto || !telefone) return

  // Duas igualdades (sem orderBy) não precisam de índice composto — o
  // volume de mensagens por telefone é baixo, então ordenar em memória
  // evita depender de criar índice manualmente no Firestore.
  const enviadasParaTelefone = await db
    .collection('mensagens_whatsapp')
    .where('prestadorTelefone', '==', telefone)
    .where('direcao', '==', 'enviada')
    .get()

  const maisRecente = enviadasParaTelefone.docs
    .map((d) => d.data())
    .sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0))[0]

  const osId: string | null = maisRecente?.osId ?? null

  await db.collection('mensagens_whatsapp').add({
    osId,
    prestadorTelefone: telefone,
    direcao: 'recebida',
    tipo: 'livre',
    texto,
    status: 'recebido',
    messageIdProvedor: dados.messageId ?? null,
    criadoEm: FieldValue.serverTimestamp(),
  })

  logger.info('Mensagem WhatsApp recebida', { telefone, osId, texto })

  if (!osId) return

  const osSnap = await db.collection('ordens').doc(osId).get()
  if (!osSnap.exists || osSnap.data()?.etapa !== 'distribuindo_aguardando_resposta') return

  const resposta = texto.trim()
  if (resposta === '1') {
    await registrarHistorico(osId, 'confirmada_aguardando_dia', 'Prestador respondeu 1-ACEITAR via WhatsApp')
    logger.info('Distribuição aceita via WhatsApp', { osId, telefone })
  } else if (resposta === '2') {
    await registrarHistorico(osId, 'aguardando_distribuicao', 'Prestador respondeu 2-RECUSAR via WhatsApp', {
      prestadoresIds: [],
      prestadoresNomes: [],
    })
    logger.info('Distribuição recusada via WhatsApp', { osId, telefone })
  }
  // "3" ou qualquer outra resposta: fica só registrada, sem mudar etapa —
  // alguém humano trata na inbox (Card 11.5).
}

export { zapiConfigurado }
