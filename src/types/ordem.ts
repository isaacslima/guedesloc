// ============================================================
// Modelo Unificado de Ordem de Serviço (Backlog Fase 2, Card 9.1)
// ============================================================
// Substitui os dois modelos divergentes que existiam antes:
//   - OrdemDeServico (manual, coleção `ordens`, src/types/index.ts)
//   - OrdemDeServicoCanonica (integrada, coleção `ordens_integradas`,
//     src/types/integracao.ts, somente leitura)
// Toda OS — venha de seguradora via API/RPA, criada manualmente, ou colada
// via IA (Fase 2, Cards 9.5/9.6 — ainda não implementados) — vive agora na
// mesma coleção `ordens`, com o mesmo formato.

export type OSStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'

export type OSOrigem = 'manual' | 'integrada_api' | 'integrada_rpa' | 'colada_ia' | 'pdf_lote'

/**
 * As 10 etapas do kanban operacional (Backlog Fase 5, Card 9.7). O campo já
 * existe no modelo desde a Fase 2 para não exigir outra migração de dado
 * quando o kanban for construído — mas a UI de kanban em si é entregue só
 * na Fase 5. Até lá, `etapa` é derivada de `status` de forma heurística
 * (ver src/lib/etapaOS.ts) e não reflete o fluxo operacional fino ainda.
 */
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

export interface HistoricoEntradaOS {
  em: string // ISO date string
  usuario?: string
  etapaAnterior: OSEtapa | null
  etapaNova: OSEtapa
  motivo?: string
}

/**
 * Nenhum dos dois modelos antigos tinha endereço estruturado (ambos só
 * guardavam string livre) — `texto` preserva compatibilidade e é sempre
 * preenchido; os campos estruturados ficam opcionais até uma integração
 * (ex.: RPA da Tempo Assist, que já extrai os campos separados antes de
 * juntar tudo numa string em integracoes/juvo/src/canonico.ts) passar a
 * enviá-los separadamente.
 */
export interface EnderecoOS {
  texto: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  referencia?: string
}

export interface ClienteOS {
  nome: string
  telefone?: string
  cpfCnpj?: string
  email?: string
  endereco: EnderecoOS
}

export interface ServicoOS {
  tipo: string
  descricao: string
  valor?: number
}

export interface DatasOS {
  criacao: string
  agendamento?: string
  entregaReal?: string
  retiradaReal?: string
  conclusao?: string
}

export interface OrdemUnificada {
  id: string
  origem: OSOrigem
  status: OSStatus
  etapa: OSEtapa

  /** Número interno Guedesloc (manual: `OS-2026-001`; integrada: mesmo valor de numeroOsSeguradora). */
  numero: string
  numeroOsSeguradora?: string
  idempotencyKey?: string
  seguradoraId?: string
  seguradoraNome?: string

  cliente: ClienteOS
  /** Referência ao cadastro de src/composables/useClientes.ts — só existe pra OS de origem manual. */
  clienteId?: string
  equipamentoId?: string
  equipamentoNome?: string
  prestadoresIds: string[]
  prestadoresNomes: string[]

  servico: ServicoOS
  observacoes?: string

  datas: DatasOS
  historico: HistoricoEntradaOS[]
  camposAdicionais?: Record<string, unknown>

  /**
   * Exceção ao prazo padrão de retirada (Backlog Fase 6, Card 13.2) — em
   * dias corridos após `datas.entregaReal`. Quando ausente, usa o padrão
   * global (`configuracoes/operacional`, ver useConfiguracoesOperacionais.ts).
   */
  slaRetiradaDiasOverride?: number
}

export type OrdemUnificadaInput = Omit<OrdemUnificada, 'id' | 'numero' | 'etapa' | 'historico' | 'datas'> & {
  datas: Omit<DatasOS, 'criacao'>
}

export const OS_STATUS_LABEL: Record<OSStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export const OS_ORIGEM_LABEL: Record<OSOrigem, string> = {
  manual: 'Manual',
  integrada_api: 'Integrada (API)',
  integrada_rpa: 'Integrada (RPA)',
  colada_ia: 'Colada (IA)',
  pdf_lote: 'PDF em lote',
}
