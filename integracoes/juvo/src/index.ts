import 'dotenv/config'
import { executarAutomacao } from './scraper'
import { conectar, desconectar, iniciarExecucao, finalizarExecucao } from './db'
import { definirExecucao, logger } from './logger'
import { Sentry, sentryAtivo } from './sentry'

async function main() {
  console.log('[Juvo] Iniciando automação manual...')

  await conectar()
  const execId = await iniciarExecucao()
  definirExecucao(execId)
  logger.info('Execução iniciada')

  try {
    const resultado = await executarAutomacao()

    await finalizarExecucao(
      execId,
      resultado.status,
      resultado.osColetadas,
      resultado.erros.length > 0 ? resultado.erros.join('\n') : undefined,
    )

    if (resultado.erros.length > 0) {
      console.warn('[Juvo] Erros durante a execução:')
      resultado.erros.forEach(e => console.warn(' -', e))
      logger.warn('Execução concluída com erros', { erros: resultado.erros })
    }

    console.log(`[Juvo] Automação finalizada. Status: ${resultado.status} | OS novas: ${resultado.osColetadas} | OS atualizadas: ${resultado.osAtualizadas}`)
    logger.info('Execução finalizada', {
      status: resultado.status,
      osNovas: resultado.osColetadas,
      osAtualizadas: resultado.osAtualizadas,
    })
    process.exit(resultado.status === 'erro' ? 1 : 0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Juvo] Erro fatal:', msg)
    logger.error('Erro fatal na execução', { erro: msg })
    // Exceção completa (com stack) além da mensagem que já foi pro logger —
    // essa é a falha mais grave da execução, vale a fidelidade extra no Sentry.
    if (sentryAtivo) Sentry.captureException(err)
    await finalizarExecucao(execId, 'erro', 0, msg)
    process.exit(1)
  } finally {
    await desconectar()
  }
}

main()
