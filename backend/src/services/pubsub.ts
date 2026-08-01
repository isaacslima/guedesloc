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
    console.log(`[PubSub] Evento publicado no topico '${topicName}':`, {
      id: payload.id,
      idempotencyKey: payload.idempotencyKey,
      timestamp: payload.timestamp,
    })
    return true
  } catch (error) {
    console.error(`[PubSub] Erro ao publicar evento no topico '${tipoEvento}':`, error)
    return false
  }
}
