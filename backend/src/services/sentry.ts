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
    // Só captura de erro por enquanto — sem tracing de performance.
    tracesSampleRate: 0,
  })
}

// Nota: com `tsx`/ESM, o Sentry avisa "express is not instrumented" no
// boot — a auto-instrumentação de rotas Express precisa de um preload via
// `node --import` que este setup (tsx direto) não usa. Não afeta a captura
// manual (`Sentry.captureMessage`/`captureException`, usada em logger.ts e
// no catch fatal do webhook) — só os breadcrumbs automáticos de HTTP, que
// não estamos usando (tracesSampleRate: 0). Resolver isso só vale a pena
// se decidirem ligar tracing de performance no futuro.

export { Sentry }
