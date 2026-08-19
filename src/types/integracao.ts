// ============================================================
// Tipos do Dominio de Integrações Guedesloc (cadastro de integradoras)
// ============================================================
// O modelo canônico de Ordem de Serviço (antigo OrdemDeServicoCanonica)
// foi unificado com o modelo manual em src/types/ordem.ts (backlog Fase 2,
// Card 9.1) — ambos vivem agora só em OrdemUnificada.

export type TipoIntegracao = 'API' | 'RPA'
export type StatusIntegradora = 'ativa' | 'inativa' | 'homologacao'

export interface Integradora {
  id: string
  nome: string
  codigo: string // ex: 'tempo_assist', 'porto_seguro', 'europ'
  tipoIntegracao: TipoIntegracao
  status: StatusIntegradora
  secretRef?: string // Referência ao Secret Manager (ex: secrets/tempo_assist_key)
  endpointUrl?: string
  slaMinutos: number
  criadoEm: string
  atualizadoEm: string
  ultimaSincronizacaoSucesso?: string
  ultimaSincronizacaoFalha?: string
  mensagemUltimoErro?: string
}

export type IntegradoraInput = Omit<Integradora, 'id' | 'criadoEm' | 'atualizadoEm'>
