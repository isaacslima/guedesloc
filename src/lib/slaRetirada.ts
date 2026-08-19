import type { OrdemUnificada } from '@/types/ordem'

export type SituacaoRetirada = 'atrasada' | 'vence_hoje' | 'no_prazo' | 'nao_aplicavel'

export interface SlaRetiradaInfo {
  aplicavel: boolean
  prazoDias: number
  diasDesdeEntrega: number
  diasRestantes: number
  situacao: SituacaoRetirada
}

/**
 * SLA de prazo de retirada (Backlog Fase 6, Card 13.2) — só se aplica a OS
 * já entregues e ainda não retiradas. `prazoDias` vem do override da OS
 * (`slaRetiradaDiasOverride`) ou do padrão global.
 */
export function calcularSlaRetirada(os: OrdemUnificada, slaPadraoDias: number): SlaRetiradaInfo {
  const prazoDias = os.slaRetiradaDiasOverride ?? slaPadraoDias
  if (os.etapa !== 'entregue_aguardando_retirada' || !os.datas.entregaReal) {
    return { aplicavel: false, prazoDias, diasDesdeEntrega: 0, diasRestantes: prazoDias, situacao: 'nao_aplicavel' }
  }
  const diasDesdeEntrega = (Date.now() - new Date(os.datas.entregaReal).getTime()) / 86_400_000
  const diasRestantes = prazoDias - diasDesdeEntrega
  let situacao: SituacaoRetirada = 'no_prazo'
  if (diasRestantes < 0) situacao = 'atrasada'
  else if (diasRestantes < 1) situacao = 'vence_hoje'
  return { aplicavel: true, prazoDias, diasDesdeEntrega, diasRestantes, situacao }
}
