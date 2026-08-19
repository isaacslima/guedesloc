import type { OSEtapa } from '@/types/ordem'

/** Ordem das colunas do kanban (backlog Fase 5, Card 9.7). */
export const ETAPAS_KANBAN: OSEtapa[] = [
  'aguardando_distribuicao',
  'distribuindo_aguardando_resposta',
  'confirmada_aguardando_dia',
  'confirmacao_hoje',
  'aguardando_entrega',
  'entregue_aguardando_foto',
  'entregue_aguardando_retirada',
  'finalizada',
  'pendencia',
  'cancelada',
]

export const ETAPA_LABEL: Record<OSEtapa, string> = {
  aguardando_distribuicao: 'Aguardando distribuição',
  distribuindo_aguardando_resposta: 'Distribuindo / Aguardando resposta',
  confirmada_aguardando_dia: 'Confirmada / Aguardando dia',
  confirmacao_hoje: 'Confirmação de hoje',
  aguardando_entrega: 'Aguardando entrega',
  entregue_aguardando_foto: 'Entregue / Aguardando foto',
  entregue_aguardando_retirada: 'Entregue / Aguardando retirada',
  finalizada: 'Finalizada',
  pendencia: 'Pendência',
  cancelada: 'Cancelada',
}

/** Mesma paleta semântica já usada em status (âmbar/azul/esmeralda/vermelho), estendida — nunca substituída (Card 0). */
export const ETAPA_COR: Record<OSEtapa, string> = {
  aguardando_distribuicao: 'bg-amber-100 text-amber-700 border border-amber-200',
  distribuindo_aguardando_resposta: 'bg-blue-100 text-blue-700 border border-blue-200',
  confirmada_aguardando_dia: 'bg-blue-100 text-blue-700 border border-blue-200',
  confirmacao_hoje: 'bg-violet-100 text-violet-700 border border-violet-200',
  aguardando_entrega: 'bg-violet-100 text-violet-700 border border-violet-200',
  entregue_aguardando_foto: 'bg-teal-100 text-teal-700 border border-teal-200',
  entregue_aguardando_retirada: 'bg-teal-100 text-teal-700 border border-teal-200',
  finalizada: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  pendencia: 'bg-orange-100 text-orange-700 border border-orange-200',
  cancelada: 'bg-red-100 text-red-600 border border-red-200',
}
