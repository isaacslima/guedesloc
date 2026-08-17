import 'dotenv/config'
import cron from 'node-cron'
import { executarAutomacao } from './scraper'
import { conectar, desconectar, iniciarExecucao, finalizarExecucao } from './db'

const SCHEDULE = process.env.CRON_SCHEDULE || '0 6,18 * * *'
let rodando = false

async function executarCiclo() {
  if (rodando) {
    console.log('[Scheduler] Execução anterior ainda em andamento, pulando este ciclo.')
    return
  }

  rodando = true
  console.log(`[Scheduler] Iniciando ciclo agendado — ${new Date().toISOString()}`)

  await conectar()
  const execId = await iniciarExecucao()

  try {
    const resultado = await executarAutomacao()

    await finalizarExecucao(
      execId,
      resultado.status,
      resultado.osColetadas,
      resultado.erros.length > 0 ? resultado.erros.join('\n') : undefined,
    )

    console.log(`[Scheduler] Ciclo finalizado. Status: ${resultado.status} | OS novas: ${resultado.osColetadas} | OS atualizadas: ${resultado.osAtualizadas}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Scheduler] Erro no ciclo:', msg)
    await finalizarExecucao(execId, 'erro', 0, msg)
  } finally {
    rodando = false
    await desconectar()
  }
}

if (!cron.validate(SCHEDULE)) {
  console.error(`[Scheduler] CRON_SCHEDULE inválido: "${SCHEDULE}"`)
  process.exit(1)
}

console.log(`[Scheduler] Automação agendada com cron: "${SCHEDULE}"`)
cron.schedule(SCHEDULE, executarCiclo)

// Executa imediatamente na inicialização também
executarCiclo()
