import { describe, it, expect } from 'vitest'
import { validarOSCanonica } from '../lib/osValidator'

describe('validarOSCanonica', () => {
  it('deve validar com sucesso um payload canônico completo', () => {
    const payloadValido = {
      idempotencyKey: 'tempo_assist:OS-10020',
      numeroOsSeguradora: 'OS-10020',
      seguradoraId: 'tempo_assist',
      seguradoraNome: 'Tempo Assist',
      status: 'aberta',
      cliente: {
        nome: 'João Silva',
        endereco: 'Rua das Flores, 123',
        telefone: '(11) 99999-8888',
      },
      servico: {
        tipo: 'remocao_cacamba',
        descricao: 'Remoção de entulho',
        valor: 450.0,
      },
      datas: {
        criacao: '2026-07-31T00:00:00.000Z',
      },
    }

    const res = validarOSCanonica(payloadValido)
    expect(res.valid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('deve rejeitar payload sem campos obrigatórios', () => {
    const payloadInvalido = {
      seguradoraId: 'tempo_assist',
      // numeroOsSeguradora ausente
      cliente: { nome: 'João' }, // endereco ausente
    }

    const res = validarOSCanonica(payloadInvalido)
    expect(res.valid).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
  })
})
