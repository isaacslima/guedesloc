import { Logging } from '@google-cloud/logging'
import { Sentry, sentryAtivo } from './sentry.js'

const LOG_NAME = process.env.LOG_NAME || 'guedesloc-gateway-backend'
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'guedesloc'

// Desligado por padrão: só liga em ambiente com o recurso/IAM provisionado
// (ver infra/terraform — role roles/logging.logWriter na gateway_sa). Local,
// sem isso, uma tentativa de autenticar já derrubou o processo (erro
// ENOENT/PERMISSION_DENIED não tratado dentro da lib do GCP) — então nem
// instancia o client se não for usar.
const CLOUD_LOGGING_ENABLED = process.env.CLOUD_LOGGING_ENABLED === 'true'
const cloudLog = CLOUD_LOGGING_ENABLED ? new Logging({ projectId: PROJECT_ID }).log(LOG_NAME) : null

type Severidade = 'INFO' | 'WARNING' | 'ERROR'
type Labels = Record<string, string>

/**
 * Sempre escreve no console (stdout/stderr) independente do Cloud Logging —
 * a visibilidade local não pode depender de rede/credencial do GCP estarem
 * ok (ver backlog Card 8.1). O envio ao Cloud Logging é best-effort: falha
 * nele nunca derruba a requisição que está sendo processada.
 */
function escrever(severidade: Severidade, mensagem: string, dados?: Record<string, unknown>, labels?: Labels): void {
  const timestamp = new Date().toISOString()
  const linha = { severity: severidade, timestamp, service: LOG_NAME, mensagem, ...dados, ...(labels ? { labels } : {}) }
  const saida = severidade === 'ERROR' ? console.error : severidade === 'WARNING' ? console.warn : console.log
  saida(JSON.stringify(linha))

  // Todo erro logado pelo app (não só exceção não tratada) vira issue
  // centralizada no Sentry — é o mesmo caminho usado por praticamente todo
  // catch do Gateway (ver index.ts, idempotency.ts).
  if (sentryAtivo && severidade === 'ERROR') {
    Sentry.captureMessage(mensagem, { level: 'error', extra: dados, tags: labels })
  }

  if (!cloudLog) return

  try {
    const entry = cloudLog.entry({ severity: severidade, resource: { type: 'global' }, labels }, { mensagem, ...dados })
    cloudLog.write(entry).catch((err) => {
      console.error(JSON.stringify({
        severity: 'ERROR',
        timestamp: new Date().toISOString(),
        service: LOG_NAME,
        mensagem: 'Falha ao enviar log ao Cloud Logging',
        erro: err instanceof Error ? err.message : String(err),
      }))
    })
  } catch (err) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      timestamp: new Date().toISOString(),
      service: LOG_NAME,
      mensagem: 'Falha ao montar/enviar log ao Cloud Logging',
      erro: err instanceof Error ? err.message : String(err),
    }))
  }
}

export const logger = {
  info: (mensagem: string, dados?: Record<string, unknown>, labels?: Labels) => escrever('INFO', mensagem, dados, labels),
  warn: (mensagem: string, dados?: Record<string, unknown>, labels?: Labels) => escrever('WARNING', mensagem, dados, labels),
  error: (mensagem: string, dados?: Record<string, unknown>, labels?: Labels) => escrever('ERROR', mensagem, dados, labels),
}
