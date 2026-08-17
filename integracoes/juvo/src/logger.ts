import { Logging } from '@google-cloud/logging'

const LOG_NAME = process.env.LOG_NAME || 'guedesloc-juvo-rpa'
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'guedesloc'

// Desligado por padrão: só liga em ambiente com o recurso/IAM provisionado
// (ver infra/terraform — role roles/logging.logWriter na gateway_sa). Local,
// sem isso, a tentativa de autenticar já derrubou o processo inteiro (a lib
// do GCP rejeitou uma promise que ninguém mais aguardava, virando exceção
// não tratada) — então nem instancia o client se não for usar.
const CLOUD_LOGGING_ENABLED = process.env.CLOUD_LOGGING_ENABLED === 'true'
const cloudLog = CLOUD_LOGGING_ENABLED ? new Logging({ projectId: PROJECT_ID }).log(LOG_NAME) : null

type Severidade = 'INFO' | 'WARNING' | 'ERROR'

let execucaoId: string | undefined

/** Marca todos os logs subsequentes desta execução com o id gerado por iniciarExecucao() (db.ts). */
export function definirExecucao(id: number | string): void {
  execucaoId = String(id)
}

/**
 * Sempre escreve no console (stdout/stderr) independente do Cloud Logging —
 * a visibilidade local não pode depender de rede/credencial do GCP estarem
 * ok. O envio ao Cloud Logging é best-effort: falha nele nunca derruba a
 * automação (backlog Card 8.1).
 */
function escrever(severidade: Severidade, mensagem: string, dados?: Record<string, unknown>): void {
  const prefixo = execucaoId ? `[Juvo] [exec:${execucaoId}]` : '[Juvo]'
  const saida = severidade === 'ERROR' ? console.error : severidade === 'WARNING' ? console.warn : console.log
  saida(`${prefixo} ${mensagem}`, dados ?? '')

  if (!cloudLog) return

  try {
    const labels = execucaoId ? { execucaoId } : undefined
    const entry = cloudLog.entry(
      { severity: severidade, resource: { type: 'global' }, labels },
      { mensagem, ...dados },
    )
    cloudLog.write(entry).catch((err) => {
      console.error(`[Juvo] Falha ao enviar log ao Cloud Logging: ${err instanceof Error ? err.message : String(err)}`)
    })
  } catch (err) {
    console.error(`[Juvo] Falha ao montar/enviar log ao Cloud Logging: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const logger = {
  info: (mensagem: string, dados?: Record<string, unknown>) => escrever('INFO', mensagem, dados),
  warn: (mensagem: string, dados?: Record<string, unknown>) => escrever('WARNING', mensagem, dados),
  error: (mensagem: string, dados?: Record<string, unknown>) => escrever('ERROR', mensagem, dados),
}
