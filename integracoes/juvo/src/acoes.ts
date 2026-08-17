import type { Page } from 'playwright'
import type { AcaoFila } from './types'
import { buscarPendentes, marcarConcluida, marcarEmExecucao, marcarErro } from './fila'

type ExecutorAcao = (page: Page, acao: AcaoFila) => Promise<void>

/**
 * Um executor por tipo_acao (coluna aba_coluna.tipo_acao no banco: 'aceite',
 * 'finalizar', 'atualizar_confirmacao_chegada', 'ver_funcionario', ...).
 * TODO: ainda não temos os seletores reais dos botões — mapear aqui quando
 * definidos. Até lá, ações desses tipos ficam pendentes/erro na fila.
 */
const EXECUTORES: Record<string, ExecutorAcao> = {}

export async function processarFilaAcoes(page: Page): Promise<void> {
  const pendentes = await buscarPendentes()
  if (pendentes.length === 0) return

  console.log(`[Fila] ${pendentes.length} ação(ões) pendente(s)`)

  for (const acao of pendentes) {
    await marcarEmExecucao(acao.id)
    const executor = EXECUTORES[acao.tipoAcao]

    if (!executor) {
      const msg = `Tipo de ação "${acao.tipoAcao}" ainda não mapeado`
      console.warn(`[Fila]   ! OS ${acao.numeroOs}: ${msg}`)
      await marcarErro(acao.id, msg)
      continue
    }

    try {
      await executor(page, acao)
      await marcarConcluida(acao.id)
      console.log(`[Fila]   OK OS ${acao.numeroOs} (${acao.tipoAcao})`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Fila]   ! OS ${acao.numeroOs} (${acao.tipoAcao}): ${msg}`)
      await marcarErro(acao.id, msg)
    }
  }
}
