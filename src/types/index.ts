// ============================================================
// Tipos base da aplicação Guedesloc
// ============================================================

export interface Cliente {
  id: string
  nome: string
  cnpj: string
  telefone: string
  email: string
  endereco: string
  cidade: string
  status: 'ativo' | 'inativo'
  criadoEm: string // ISO date string
}

export type ClienteInput = Omit<Cliente, 'id' | 'criadoEm'>

// ============================================================

export interface Equipamento {
  id: string
  nome: string
  tipo: string
  marca: string
  modelo: string
  numeroDeSerie: string
  clienteId?: string // opcional — pode ser equipamento em estoque
  clienteNome?: string // desnormalizado para facilitar exibição
  status: 'disponivel' | 'em_uso' | 'manutencao' | 'inativo'
  criadoEm: string
}

export type EquipamentoInput = Omit<Equipamento, 'id' | 'criadoEm'>

// ============================================================

export interface Prestador {
  id: string
  nome: string
  especialidade: string
  telefone: string
  email: string
  cpf: string
  status: 'ativo' | 'inativo'
  criadoEm: string
}

export type PrestadorInput = Omit<Prestador, 'id' | 'criadoEm'>

// ============================================================

export type OSStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'
export type OSTipo = 'corretiva' | 'preventiva' | 'instalacao'

export interface OrdemDeServico {
  id: string
  numero: string // ex: OS-2026-001
  tipo: OSTipo
  status: OSStatus
  clienteId: string
  clienteNome: string // desnormalizado
  equipamentoId?: string
  equipamentoNome?: string // desnormalizado
  prestadoresIds: string[]
  prestadoresNomes: string[] // desnormalizado
  descricao: string
  observacoes?: string
  dataCriacao: string // ISO date
  dataAgendamento?: string // ISO date
}

export type OrdemDeServicoInput = Omit<OrdemDeServico, 'id' | 'numero' | 'dataCriacao'>

// ============================================================

export const OS_STATUS_LABEL: Record<OSStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export const OS_TIPO_LABEL: Record<OSTipo, string> = {
  corretiva: 'Corretiva',
  preventiva: 'Preventiva',
  instalacao: 'Instalação',
}

export const EQUIPAMENTO_STATUS_LABEL: Record<Equipamento['status'], string> = {
  disponivel: 'Disponível',
  em_uso: 'Em Uso',
  manutencao: 'Manutenção',
  inativo: 'Inativo',
}
