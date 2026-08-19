// ============================================================
// Tipos base da aplicação Guedesloc
// ============================================================

import type { RegraRepasse } from './financeiro'

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

/**
 * Ativo entra na cascata de distribuição automática (Fase 5); Pausado e
 * Bloqueado ficam de fora dela, mas continuam disponíveis pra atribuição
 * manual (backlog Fase 3, Card 10.1).
 */
export type SituacaoPrestador = 'ativo' | 'pausado' | 'bloqueado'

/** Uma cidade coberta pelo prestador, com prioridade de acionamento — prioridade menor é chamado primeiro na cascata (Card 10.2). */
export interface CidadeAtendida {
  cidade: string
  estado?: string
  prioridade: number
}

export interface Prestador {
  id: string
  nome: string
  /** Texto livre — não é mais um dropdown fixo de especialidades de manutenção (herdado de outro domínio de negócio, incoerente com locação de caçamba). */
  especialidade?: string
  telefone: string
  email: string
  cpf: string
  cidade?: string
  estado?: string
  regiao?: string
  /** Sem limite se vazio/undefined. */
  limiteOsPorDia?: number
  observacao?: string
  situacao: SituacaoPrestador
  cidadesAtendidas: CidadeAtendida[]
  /** Como esse prestador é remunerado por OS finalizada (Backlog Fase 7, Card 6.1). Ausente = sem regra cadastrada ainda. */
  regraRepasse?: RegraRepasse
  criadoEm: string
}

export type PrestadorInput = Omit<Prestador, 'id' | 'criadoEm'>

// ============================================================
// O modelo de Ordem de Serviço (antigo OrdemDeServico/OSStatus/OSTipo) foi
// unificado com o modelo integrado em src/types/ordem.ts (backlog Fase 2,
// Card 9.1) — usar OrdemUnificada/OSStatus de lá.
// ============================================================

export const EQUIPAMENTO_STATUS_LABEL: Record<Equipamento['status'], string> = {
  disponivel: 'Disponível',
  em_uso: 'Em Uso',
  manutencao: 'Manutenção',
  inativo: 'Inativo',
}
