export type OSStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'

export type OSEtapa =
  | 'aguardando_distribuicao'
  | 'distribuindo_aguardando_resposta'
  | 'confirmada_aguardando_dia'
  | 'confirmacao_hoje'
  | 'aguardando_entrega'
  | 'entregue_aguardando_foto'
  | 'entregue_aguardando_retirada'
  | 'finalizada'
  | 'pendencia'
  | 'cancelada'

/**
 * Mesma heurística de src/lib/etapaOS.ts no frontend — deriva uma etapa do
 * kanban (Fase 5) a partir do status simplificado, enquanto não existe um
 * fluxo real de distribuição/confirmação/entrega gerando etapas de verdade
 * (Card 9.7).
 */
export function derivarEtapaDeStatus(status: OSStatus): OSEtapa {
  switch (status) {
    case 'aberta':
      return 'aguardando_distribuicao'
    case 'em_andamento':
      return 'aguardando_entrega'
    case 'concluida':
      return 'finalizada'
    case 'cancelada':
      return 'cancelada'
  }
}

/**
 * Mesma heurística de src/lib/etapaOS.ts no frontend (usada lá pro
 * mover-etapa manual do Kanban) — reaproveitada aqui pra manter `status`
 * em sincronia sempre que o motor de automações ou um callback do
 * WhatsApp move a `etapa` de uma OS (ver registrarHistorico em whatsapp.ts).
 */
export function derivarStatusDeEtapa(etapa: OSEtapa): OSStatus {
  switch (etapa) {
    case 'aguardando_distribuicao':
    case 'distribuindo_aguardando_resposta':
      return 'aberta'
    case 'finalizada':
      return 'concluida'
    case 'cancelada':
      return 'cancelada'
    default:
      return 'em_andamento'
  }
}
