import { db, FieldValue, sanitizarIdDocumento } from './firestore.js'
import { logger } from './logger.js'

export interface IdempotencyCheckResult {
  isDuplicate: boolean
  previousStatus?: 'processando' | 'sucesso' | 'erro'
  mensagem?: string
}

// Map em memória: fast-path local, evita ida ao Firestore a cada requisição.
// Some num restart do processo — a coleção idempotencia_logs abaixo é quem dá
// durabilidade de verdade (Card 1.4 do backlog).
const memoryIdempotencyStore = new Map<string, { status: 'processando' | 'sucesso' | 'erro'; timestamp: number }>()

/**
 * Nunca deixa escapar — isso já é chamado de dentro de um catch de erro (ver
 * registrarErroIdempotencia), e uma segunda falha aqui não pode virar
 * rejection não tratada e derrubar o processo.
 */
async function persistirLogFirestore(
  key: string,
  seguradoraId: string,
  numeroOsSeguradora: string,
  status: 'sucesso' | 'erro',
): Promise<void> {
  try {
    await db
      .collection('idempotencia_logs')
      .doc(sanitizarIdDocumento(key))
      .set(
        { key, seguradoraId, numeroOsSeguradora, status, processadoEm: FieldValue.serverTimestamp() },
        { merge: true },
      )
  } catch (err) {
    logger.error('Falha ao persistir log de idempotência no Firestore', { idempotencyKey: key, erro: err instanceof Error ? err.message : String(err) })
  }
}

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

export async function registrarSucessoIdempotencia(
  idempotencyKey: string,
  seguradoraId: string,
  numeroOsSeguradora: string,
): Promise<void> {
  memoryIdempotencyStore.set(idempotencyKey, { status: 'sucesso', timestamp: Date.now() })
  await persistirLogFirestore(idempotencyKey, seguradoraId, numeroOsSeguradora, 'sucesso')
}

export async function registrarErroIdempotencia(
  idempotencyKey: string,
  seguradoraId?: string,
  numeroOsSeguradora?: string,
): Promise<void> {
  memoryIdempotencyStore.set(idempotencyKey, { status: 'erro', timestamp: Date.now() })
  if (seguradoraId && numeroOsSeguradora) {
    await persistirLogFirestore(idempotencyKey, seguradoraId, numeroOsSeguradora, 'erro')
  }
}
