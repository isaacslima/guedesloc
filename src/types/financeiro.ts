// ============================================================
// Financeiro (Backlog Fase 7 — Epic 5 Recebíveis + Epic 6 Pagamentos)
// ============================================================

// ─── Card 5.1 — Tabela de preços por seguradora/serviço ────────
export interface PrecoServico {
  id: string
  seguradoraId: string
  seguradoraNome: string
  servicoTipo: string
  valor: number
  /** ISO date. Reajuste nunca sobrescreve — fecha a vigência anterior e abre uma nova. */
  vigenciaInicio: string
  /** Ausente = vigência atual (ainda vigente). */
  vigenciaFim?: string
  criadoEm: string
}

export type PrecoServicoInput = Pick<PrecoServico, 'seguradoraId' | 'seguradoraNome' | 'servicoTipo' | 'valor'>

// ─── Card 5.2/5.3 — Recebíveis (lançamento por OS finalizada) ──
export type StatusRecebivel = 'pendente' | 'conciliado' | 'divergente'

export interface Recebivel {
  /** Mesmo id da OS de origem — um lançamento por OS finalizada, geração idempotente. */
  id: string
  osId: string
  osNumero: string
  seguradoraId?: string
  seguradoraNome?: string
  servicoTipo: string
  cidade?: string
  /** null quando não há preço vigente cadastrado pra essa seguradora/serviço na data da finalização. */
  valorEsperado: number | null
  valorConfirmado?: number
  status: StatusRecebivel
  dataFinalizacao: string
  dataConciliacao?: string
  observacaoConciliacao?: string
  criadoEm: string
}

// ─── Card 6.1 — Regra de repasse por prestador ──────────────────
export type TipoRegraRepasse = 'valor_fixo' | 'percentual'

export interface RegraRepasse {
  tipo: TipoRegraRepasse
  /** Valor fixo em R$, ou percentual (0-100) sobre o valor esperado do recebível da mesma OS. */
  valor: number
}

// ─── Card 6.2/6.4 — Repasse por OS + Lote de pagamento ──────────
export type StatusRepasse = 'sem_regra' | 'pendente' | 'em_lote' | 'pago'

export interface Repasse {
  /** Mesmo id da OS de origem. */
  id: string
  osId: string
  osNumero: string
  prestadorId: string
  prestadorNome: string
  regraTipo?: TipoRegraRepasse
  regraValor?: number
  valorDevido: number
  status: StatusRepasse
  loteId?: string
  dataFinalizacao: string
  criadoEm: string
}

export type StatusLote = 'gerado' | 'pago'

export interface LotePagamento {
  id: string
  prestadorId: string
  prestadorNome: string
  periodoInicio: string
  periodoFim: string
  totalOS: number
  valorTotal: number
  status: StatusLote
  dataPagamento?: string
  /** Link do comprovante (upload ou colado) — Card 6.4. */
  comprovanteUrl?: string
  criadoEm: string
}

export const STATUS_RECEBIVEL_LABEL: Record<StatusRecebivel, string> = {
  pendente: 'Pendente',
  conciliado: 'Conciliado',
  divergente: 'Divergente',
}

export const STATUS_REPASSE_LABEL: Record<StatusRepasse, string> = {
  sem_regra: 'Sem regra cadastrada',
  pendente: 'Pendente',
  em_lote: 'Em lote',
  pago: 'Pago',
}
