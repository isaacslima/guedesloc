// ============================================================
// Tipos do Dominio de Integrações Guedesloc (Modelo Canônico)
// ============================================================

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

// ============================================================
// Modelo Canônico de Ordem de Serviço (OS)
// ============================================================

export type OSStatusCanonico = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'

export interface ClienteCanonico {
  nome: string
  cpfCnpj?: string
  telefone?: string
  email?: string
  endereco: string
  cidade?: string
  estado?: string
  cep?: string
}

export interface ServicoCanonico {
  tipo: string // ex: 'remocao_cacamba', 'guincho', 'reparo'
  descricao: string
  valor: number
}

export interface PrestadorCanonico {
  id?: string
  nome?: string
  cpfCnpj?: string
  telefone?: string
}

export interface DatasCanonicas {
  criacao: string // ISO Date String
  agendamento?: string
  conclusao?: string
}

export interface OrdemDeServicoCanonica {
  idempotencyKey: string // seguradoraId + ":" + numeroOsSeguradora
  numeroOsSeguradora: string
  seguradoraId: string
  seguradoraNome: string
  numeroOsInterno?: string
  cliente: ClienteCanonico
  servico: ServicoCanonico
  status: OSStatusCanonico
  prestador?: PrestadorCanonico
  datas: DatasCanonicas
  camposAdicionais?: Record<string, unknown>
}

// ============================================================
// Eventos de Integração (Pub/Sub)
// ============================================================

export type TipoEventoOS = 'os.criada' | 'os.status_alterado' | 'os.cancelada' | 'os.finalizada'

export interface EventoOS {
  id: string
  tipoEvento: TipoEventoOS
  timestamp: string
  idempotencyKey: string
  os: OrdemDeServicoCanonica
}

// ============================================================
// Registro de Idempotência
// ============================================================

export interface IdempotencyLog {
  key: string // idempotencyKey
  seguradoraId: string
  numeroOsSeguradora: string
  processadoEm: string
  status: 'processando' | 'sucesso' | 'erro'
  erroMensagem?: string
}
