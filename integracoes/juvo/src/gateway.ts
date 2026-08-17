import type { OrdemDeServicoCanonica } from './canonico'
import { logger } from './logger'

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080'
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || ''

export type ResultadoEnvioGateway = 'enviado' | 'duplicado' | 'erro'

/**
 * POST /api/v1/os/ingest no Gateway (backend/) — único ponto autorizado a
 * escrever no Firestore (ver backlog/fase-0-fundacao.md Card 3.1). 409
 * significa que o Gateway já reconhece essa OS pela idempotencyKey — trata
 * como sucesso (já está sincronizada), não como erro.
 */
export async function enviarParaGateway(payload: OrdemDeServicoCanonica): Promise<ResultadoEnvioGateway> {
  try {
    const resposta = await fetch(`${GATEWAY_URL}/api/v1/os/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': GATEWAY_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (resposta.status === 201) return 'enviado'
    if (resposta.status === 409) return 'duplicado'

    const corpo = await resposta.text().catch(() => '')
    console.error(`[Gateway] Falha ao enviar OS ${payload.numeroOsSeguradora}: HTTP ${resposta.status} — ${corpo}`)
    logger.error('Falha ao enviar OS ao Gateway', { numeroOs: payload.numeroOsSeguradora, httpStatus: resposta.status, corpo })
    return 'erro'
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Gateway] Erro de rede ao enviar OS ${payload.numeroOsSeguradora}: ${msg}`)
    logger.error('Erro de rede ao enviar OS ao Gateway', { numeroOs: payload.numeroOsSeguradora, erro: msg })
    return 'erro'
  }
}
