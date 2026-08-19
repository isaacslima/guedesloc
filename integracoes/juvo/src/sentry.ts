import * as Sentry from '@sentry/node'

/**
 * Desligado por padrão — só ativa se `SENTRY_DSN` estiver definido. Sem
 * DSN, `Sentry.init` nunca é chamado: zero custo, zero chamada de rede.
 */
export const sentryAtivo = Boolean(process.env.SENTRY_DSN)

if (sentryAtivo) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
  })
}

export { Sentry }
