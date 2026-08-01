import type { OrdemDeServicoCanonica } from '../types/integracao'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validarOSCanonica(payload: unknown): ValidationResult {
  const errors: string[] = []

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload deve ser um objeto válido.'] }
  }

  const data = payload as Partial<OrdemDeServicoCanonica>

  if (!data.numeroOsSeguradora || typeof data.numeroOsSeguradora !== 'string' || !data.numeroOsSeguradora.trim()) {
    errors.push('Campo obrigatorio ausente ou invalido: numeroOsSeguradora')
  }

  if (!data.seguradoraId || typeof data.seguradoraId !== 'string' || !data.seguradoraId.trim()) {
    errors.push('Campo obrigatorio ausente ou invalido: seguradoraId')
  }

  if (!data.seguradoraNome || typeof data.seguradoraNome !== 'string' || !data.seguradoraNome.trim()) {
    errors.push('Campo obrigatorio ausente ou invalido: seguradoraNome')
  }

  if (!data.cliente || typeof data.cliente !== 'object') {
    errors.push('Campo obrigatorio ausente: cliente')
  } else {
    if (!data.cliente.nome || typeof data.cliente.nome !== 'string' || !data.cliente.nome.trim()) {
      errors.push('Campo obrigatorio ausente em cliente: cliente.nome')
    }
    if (!data.cliente.endereco || typeof data.cliente.endereco !== 'string' || !data.cliente.endereco.trim()) {
      errors.push('Campo obrigatorio ausente em cliente: cliente.endereco')
    }
  }

  if (!data.servico || typeof data.servico !== 'object') {
    errors.push('Campo obrigatorio ausente: servico')
  } else {
    if (!data.servico.tipo || typeof data.servico.tipo !== 'string') {
      errors.push('Campo obrigatorio ausente em servico: servico.tipo')
    }
    if (typeof data.servico.valor !== 'number' || Number.isNaN(data.servico.valor) || data.servico.valor < 0) {
      errors.push('Campo obrigatorio invalido em servico: servico.valor deve ser um numero >= 0')
    }
  }

  const statusValidos: Array<OrdemDeServicoCanonica['status']> = ['aberta', 'em_andamento', 'concluida', 'cancelada']
  if (!data.status || !statusValidos.includes(data.status)) {
    errors.push(`Campo status invalido. Valores aceitos: ${statusValidos.join(', ')}`)
  }

  if (!data.datas || typeof data.datas !== 'object' || !data.datas.criacao) {
    errors.push('Campo obrigatorio ausente: datas.criacao')
  }

  // Gera chave de idempotência automaticamente se não informada
  if (data.seguradoraId && data.numeroOsSeguradora && !data.idempotencyKey) {
    data.idempotencyKey = `${data.seguradoraId}:${data.numeroOsSeguradora}`
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
