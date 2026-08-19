import * as Sentry from '@sentry/vue'
import type { App } from 'vue'

/**
 * Desligado por padrão — só ativa se `VITE_SENTRY_DSN` estiver definido no
 * `.env` (ou nas variáveis de ambiente de build). Sem DSN, `Sentry.init`
 * nunca é chamado: zero custo, zero chamada de rede, comportamento idêntico
 * a antes de existir Sentry no projeto.
 */
export function initSentry(app: App): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    app,
    dsn,
    environment: import.meta.env.MODE,
    // Só captura de erro por enquanto — sem tracing de performance (evita
    // custo/quota extra até decidirem que precisam disso).
    tracesSampleRate: 0,
  })
}
