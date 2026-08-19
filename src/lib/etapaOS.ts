import type { OSEtapa, OSStatus } from '@/types/ordem'

/**
 * Deriva uma etapa do kanban (Fase 5) a partir do status simplificado —
 * usado enquanto não existe um fluxo real de kanban gerando/avançando
 * etapas (Card 9.7). É só um mapeamento inicial grosseiro pra a coluna
 * `etapa` não ficar vazia; não reflete distribuição/confirmação/entrega
 * reais até a Fase 5 existir. Mesma heurística replicada em
 * backend/src/services/etapaOS.ts pro Gateway.
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
 * Caminho inverso — usado quando o kanban (Card 9.7) move a OS pra uma
 * etapa manualmente, pra manter o `status` simplificado coerente (ainda é
 * ele que alimenta o Dashboard e os filtros mais antigos). Mapeamento
 * também grosseiro por natureza — várias etapas caem no mesmo status.
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
