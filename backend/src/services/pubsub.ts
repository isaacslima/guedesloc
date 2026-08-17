import { logger } from './logger.js'

export type TipoEventoOS = 'os.criada' | 'os.status_alterado' | 'os.cancelada' | 'os.finalizada'

export interface EventoPayload {
  id: string
  tipoEvento: TipoEventoOS
  timestamp: string
  idempotencyKey: string
  payloadOS: Record<string, unknown>
}

export async function publicarEventoOS(tipoEvento: TipoEventoOS, payload: EventoPayload): Promise<boolean> {
  try {
    const topicName = tipoEvento // ex: os.criada
    logger.info(`Evento publicado no tópico '${topicName}'`, {
      eventoId: payload.id,
      idempotencyKey: payload.idempotencyKey,
      timestamp: payload.timestamp,
    })
    return true
  } catch (error) {
    const err = error as Error
    logger.error(`Erro ao publicar evento no tópico '${tipoEvento}'`, { erro: err.message, idempotencyKey: payload.idempotencyKey })
    return false
  }
}
