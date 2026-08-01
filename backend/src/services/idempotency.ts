export interface IdempotencyCheckResult {
  isDuplicate: boolean
  previousStatus?: 'processando' | 'sucesso' | 'erro'
  mensagem?: string
}

// Map em memória para garantia em runtime local / fallback
const memoryIdempotencyStore = new Map<string, { status: 'processando' | 'sucesso' | 'erro'; timestamp: number }>()

export async function verificarEBloquearIdempotencia(
  idempotencyKey: string,
  seguradoraId: string,
  numeroOsSeguradora: string
): Promise<IdempotencyCheckResult> {
  const key = idempotencyKey || `${seguradoraId}:${numeroOsSeguradora}`

  const existing = memoryIdempotencyStore.get(key)
  if (existing) {
    if (existing.status === 'processando') {
      return {
        isDuplicate: true,
        previousStatus: 'processando',
        mensagem: 'Requisição em processamento concorrente.',
      }
    }
    if (existing.status === 'sucesso') {
      return {
        isDuplicate: true,
        previousStatus: 'sucesso',
        mensagem: 'Requisição já processada com sucesso anteriormente (idempotente).',
      }
    }
  }

  // Marcar como processando
  memoryIdempotencyStore.set(key, { status: 'processando', timestamp: Date.now() })
  return { isDuplicate: false }
}

export async function registrarSucessoIdempotencia(idempotencyKey: string): Promise<void> {
  memoryIdempotencyStore.set(idempotencyKey, { status: 'sucesso', timestamp: Date.now() })
}

export async function registrarErroIdempotencia(idempotencyKey: string): Promise<void> {
  memoryIdempotencyStore.set(idempotencyKey, { status: 'erro', timestamp: Date.now() })
}
