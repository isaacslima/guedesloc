// Resiliência do RPA (Backlog Fase 10, Card 4.3) — retry com backoff
// exponencial e detecção de "possível mudança de layout do portal" (seletor
// não encontrado), separado do resto do fluxo pra reaproveitar tanto no
// disparo manual (index.ts) quanto no agendado (scheduler.ts).
import { logger } from './logger'

const MAX_TENTATIVAS = Number(process.env.RPA_MAX_TENTATIVAS) || 3
const BACKOFF_BASE_MS = Number(process.env.RPA_BACKOFF_BASE_MS) || 5_000

/**
 * Erros de timeout/seletor do Playwright têm mensagens características —
 * indício de que o portal mudou de layout (elemento que devia existir não
 * apareceu), diferente de uma falha de rede/instabilidade pontual. Não é
 * 100% preciso (timeout também pode ser rede lenta), mas separa o sinal
 * "algo no portal provavelmente mudou" do resto pro time investigar.
 */
export function ehErroDeSeletorOuLayout(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /Timeout \d+ms exceeded|waiting for locator|waiting for selector|strict mode violation|element is not visible|element is not attached/i.test(msg)
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Reexecuta `fn` até `MAX_TENTATIVAS` vezes com backoff exponencial
 * (5s, 10s, 20s... por padrão) antes de desistir. Cada falha intermediária
 * é logada como aviso (não como erro fatal — só a última tentativa é);
 * falhas que parecem mudança de layout do portal são sinalizadas à parte,
 * pra não se perder no meio de erros transitórios comuns (rede, timeout de
 * carregamento).
 */
export async function executarComRetry<T>(fn: () => Promise<T>, rotulo: string): Promise<T> {
  let ultimoErro: unknown

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      return await fn()
    } catch (err) {
      ultimoErro = err
      const msg = err instanceof Error ? err.message : String(err)
      const pareceLayout = ehErroDeSeletorOuLayout(err)

      if (pareceLayout) {
        logger.error(`[Resiliência] ${rotulo}: possível mudança de layout do portal (tentativa ${tentativa}/${MAX_TENTATIVAS})`, {
          rotulo,
          tentativa,
          maxTentativas: MAX_TENTATIVAS,
          possivelMudancaLayout: true,
          erro: msg,
        })
      }

      if (tentativa === MAX_TENTATIVAS) break

      const espera = BACKOFF_BASE_MS * 2 ** (tentativa - 1)
      logger.warn(`[Resiliência] ${rotulo}: falhou (tentativa ${tentativa}/${MAX_TENTATIVAS}), tentando de novo em ${espera}ms`, {
        rotulo,
        tentativa,
        esperaMs: espera,
        erro: msg,
      })
      await esperar(espera)
    }
  }

  throw ultimoErro
}
