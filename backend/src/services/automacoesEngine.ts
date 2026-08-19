// Motor da Central de Automações (backlog Fase 5, Cards 12.2-12.7). Roda
// por polling (ver setInterval em index.ts) — reavalia o estado de todas
// as OS elegíveis a cada tick, em vez de agendar ações futuras de verdade.
// Isso é mais simples e evita depender de infraestrutura de fila/scheduler
// (Cloud Tasks etc., ainda não provisionada — ver gaps de infra da Fase 0).
import { db } from './firestore.js'
import { logger } from './logger.js'
import { enviarMensagemOS } from './whatsapp.js'
import { registrarHistorico } from './whatsapp.js'
import { registrarFila } from './automacoesFila.js'
import {
  buscarAutomacoesConfig,
  decidirAcao,
  dentroDaJanela,
  type AutomacoesConfig,
} from './automacoesConfig.js'

function minutosDesde(iso: string | undefined): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 60_000
}

function horasDesde(iso: string | undefined): number {
  return minutosDesde(iso) / 60
}

function ultimaTransicaoEm(historico: unknown): string | undefined {
  if (!Array.isArray(historico) || historico.length === 0) return undefined
  return historico[historico.length - 1]?.em
}

// ─── Card 12.2 — Distribuição automática ────────────────────────
async function processarDistribuicao(config: AutomacoesConfig): Promise<void> {
  const acao = decidirAcao(config.distribuicao.modo, config.distribuicao.autonomia)
  if (acao === 'pular') return

  const snap = await db.collection('ordens').where('etapa', 'in', ['aguardando_distribuicao', 'distribuindo_aguardando_resposta']).get()
  if (snap.empty) return

  const prestadoresSnap = await db.collection('prestadores').where('situacao', '==', 'ativo').get()
  const prestadoresAtivos = prestadoresSnap.docs.map((p) => ({ id: p.id, ...p.data() }) as { id: string; nome: string; cidadesAtendidas?: { cidade: string; prioridade: number }[] })

  for (const doc of snap.docs) {
    const os = doc.data()
    const cidade = (os.cliente?.endereco?.cidade as string | undefined)?.trim().toLowerCase()
    if (!cidade) continue // sem endereço estruturado, motor não consegue sugerir (gap conhecido, ver Card 9.1/10.2)

    if (os.etapa === 'distribuindo_aguardando_resposta') {
      const tempoEsperaMin = config.distribuicao.tempoRespostaMin + config.distribuicao.tempoExtraConfirmarMin
      if (minutosDesde(ultimaTransicaoEm(os.historico)) < tempoEsperaMin) continue // ainda dentro do prazo de resposta
    }

    const tentativas: string[] = os.tentativasDistribuicaoAutomatica || []
    const candidatos = prestadoresAtivos
      .filter((p) => !tentativas.includes(p.id))
      .map((p) => ({ p, cobertura: (p.cidadesAtendidas || []).find((c) => c.cidade?.trim().toLowerCase() === cidade) }))
      .filter((x) => x.cobertura)
      .sort((a, b) => a.cobertura!.prioridade - b.cobertura!.prioridade)

    if (config.distribuicao.maxTentativas != null && tentativas.length >= config.distribuicao.maxTentativas) {
      if (config.distribuicao.enviarParaPendenciaSeRecusarTodos && os.etapa !== 'pendencia') {
        await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'distribuicao', situacao: acao === 'executar' ? 'executada' : acao === 'sugerir' ? 'sugerida' : 'simulada', detalhe: 'Esgotadas as tentativas de distribuição automática, sem prestador disponível' })
        if (acao === 'executar') {
          await registrarHistorico(doc.id, 'pendencia', 'Distribuição automática: esgotadas as tentativas, sem prestador disponível')
        }
      }
      continue
    }

    if (candidatos.length === 0) continue // sem próximo candidato disponível ainda

    const proximo = candidatos[0]!.p

    if (acao === 'simular' || acao === 'sugerir') {
      await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'distribuicao', situacao: acao === 'sugerir' ? 'sugerida' : 'simulada', prestadorId: proximo.id, prestadorNome: proximo.nome, detalhe: `Próximo da cascata: ${proximo.nome}` })
      continue
    }

    // executar de verdade
    const resultado = await enviarMensagemOS(doc.id, 'distribuicao', proximo.id)
    if (!resultado.sucesso) {
      await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'distribuicao', situacao: 'falha', prestadorId: proximo.id, prestadorNome: proximo.nome, detalhe: resultado.erro })
      continue
    }
    await registrarHistorico(doc.id, 'distribuindo_aguardando_resposta', `Distribuição automática ofertada a ${proximo.nome}`, {
      prestadoresIds: [proximo.id],
      prestadoresNomes: [proximo.nome],
      tentativasDistribuicaoAutomatica: [...tentativas, proximo.id],
    })
    await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'distribuicao', situacao: 'executada', prestadorId: proximo.id, prestadorNome: proximo.nome })
    logger.info('Distribuição automática executada', { osId: doc.id, prestadorId: proximo.id })
  }
}

// ─── Card 12.3 — Confirmação do dia ─────────────────────────────
async function processarConfirmacaoDia(config: AutomacoesConfig): Promise<void> {
  const acao = decidirAcao(config.confirmacaoDia.modo, config.confirmacaoDia.autonomia)
  if (acao === 'pular') return

  const [hPadrao, mPadrao] = config.confirmacaoDia.horarioPadrao.split(':').map(Number)
  const agora = new Date()
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()
  if (minutosAgora < (hPadrao ?? 8) * 60 + (mPadrao ?? 0)) return // ainda não chegou o horário padrão hoje

  const snap = await db.collection('ordens').where('etapa', '==', 'confirmada_aguardando_dia').get()
  for (const doc of snap.docs) {
    const os = doc.data()
    if (!os.datas?.agendamento) continue
    const agendamento = os.datas.agendamento.toDate ? os.datas.agendamento.toDate() : new Date(os.datas.agendamento)
    if (agendamento.toDateString() !== agora.toDateString()) continue // agendamento não é hoje

    const jaEnviadoHoje = os.automacao?.confirmacaoDiaEnviadaEm
      && new Date(os.automacao.confirmacaoDiaEnviadaEm).toDateString() === agora.toDateString()
    if (jaEnviadoHoje) continue

    if (acao === 'simular' || acao === 'sugerir') {
      await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'confirmacao_dia', situacao: acao === 'sugerir' ? 'sugerida' : 'simulada' })
      continue
    }

    const resultado = await enviarMensagemOS(doc.id, 'confirmacao_dia')
    await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'confirmacao_dia', situacao: resultado.sucesso ? 'executada' : 'falha', detalhe: resultado.erro })
    if (resultado.sucesso) {
      await registrarHistorico(doc.id, 'confirmacao_hoje', 'Confirmação do dia automática enviada', {
        'automacao.confirmacaoDiaEnviadaEm': new Date().toISOString(),
      })
    }
  }
}

// ─── Card 12.4 — Confirmação de entrega ─────────────────────────
async function processarConfirmacaoEntrega(config: AutomacoesConfig): Promise<void> {
  const acao = decidirAcao(config.confirmacaoEntrega.modo, config.confirmacaoEntrega.autonomia)
  if (acao === 'pular') return

  const snap = await db.collection('ordens').where('etapa', '==', 'aguardando_entrega').get()
  for (const doc of snap.docs) {
    const os = doc.data()
    if (!os.datas?.agendamento) continue
    const agendamento = os.datas.agendamento.toDate ? os.datas.agendamento.toDate() : new Date(os.datas.agendamento)
    if (agendamento.getTime() > Date.now()) continue // janela do agendamento ainda não chegou

    const cobrancas = os.automacao?.confirmacaoEntregaCobrancas ?? 0
    if (cobrancas >= config.confirmacaoEntrega.maxCobrancas) continue
    if (minutosDesde(os.automacao?.confirmacaoEntregaUltimoEnvioEm) < config.confirmacaoEntrega.tempoAposGatilhoMin) continue

    if (acao === 'simular' || acao === 'sugerir') {
      await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'confirmacao_entrega', situacao: acao === 'sugerir' ? 'sugerida' : 'simulada' })
      continue
    }

    const resultado = await enviarMensagemOS(doc.id, 'confirmacao_entrega')
    await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'confirmacao_entrega', situacao: resultado.sucesso ? 'executada' : 'falha', detalhe: resultado.erro })
    if (resultado.sucesso) {
      await db.collection('ordens').doc(doc.id).update({
        'automacao.confirmacaoEntregaCobrancas': cobrancas + 1,
        'automacao.confirmacaoEntregaUltimoEnvioEm': new Date().toISOString(),
      })
    }
  }
}

// ─── Card 12.5 — Cobrança de foto ───────────────────────────────
async function processarCobrancaFoto(config: AutomacoesConfig): Promise<void> {
  const acao = decidirAcao(config.cobrancaFoto.modo, config.cobrancaFoto.autonomia)
  if (acao === 'pular') return

  const snap = await db.collection('ordens').where('etapa', '==', 'entregue_aguardando_foto').get()
  for (const doc of snap.docs) {
    const os = doc.data()
    if (minutosDesde(ultimaTransicaoEm(os.historico)) < config.cobrancaFoto.tempoAposGatilhoMin) continue

    const cobrancas = os.automacao?.fotoCobrancas ?? 0
    if (cobrancas >= config.cobrancaFoto.maxCobrancas) continue
    if (minutosDesde(os.automacao?.fotoUltimoEnvioEm) < config.cobrancaFoto.tempoAposGatilhoMin) continue

    if (acao === 'simular' || acao === 'sugerir') {
      await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'cobranca_foto', situacao: acao === 'sugerir' ? 'sugerida' : 'simulada' })
      continue
    }

    const resultado = await enviarMensagemOS(doc.id, 'cobranca_foto')
    await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'cobranca_foto', situacao: resultado.sucesso ? 'executada' : 'falha', detalhe: resultado.erro })
    if (resultado.sucesso) {
      await db.collection('ordens').doc(doc.id).update({
        'automacao.fotoCobrancas': cobrancas + 1,
        'automacao.fotoUltimoEnvioEm': new Date().toISOString(),
      })
    }
  }
}

// ─── Card 12.6 — Cobrança de retirada ────────────────────────────
async function processarCobrancaRetirada(config: AutomacoesConfig): Promise<void> {
  const acao = decidirAcao(config.cobrancaRetirada.modo, config.cobrancaRetirada.autonomia)
  if (acao === 'pular') return

  const snap = await db.collection('ordens').where('etapa', '==', 'entregue_aguardando_retirada').get()
  for (const doc of snap.docs) {
    const os = doc.data()
    const entregaReal = os.datas?.entregaReal
    const referencia = entregaReal ? new Date(entregaReal) : new Date(ultimaTransicaoEm(os.historico) ?? Date.now())
    const diasDesdeEntrega = (Date.now() - referencia.getTime()) / 86_400_000

    const cobrancas = os.automacao?.retiradaCobrancas ?? 0
    if (cobrancas >= config.cobrancaRetirada.maxCobrancas) continue

    if (cobrancas === 0) {
      if (diasDesdeEntrega < config.cobrancaRetirada.diasAposEntregaPrimeiraCobranca) continue
    } else {
      if (horasDesde(os.automacao?.retiradaUltimoEnvioEm) < config.cobrancaRetirada.tempoEntreCobrancasHoras) continue
    }

    if (acao === 'simular' || acao === 'sugerir') {
      await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'cobranca_retirada', situacao: acao === 'sugerir' ? 'sugerida' : 'simulada' })
      continue
    }

    const resultado = await enviarMensagemOS(doc.id, 'cobranca_retirada')
    await registrarFila({ osId: doc.id, numeroOs: os.numero, tipo: 'cobranca_retirada', situacao: resultado.sucesso ? 'executada' : 'falha', detalhe: resultado.erro })
    if (resultado.sucesso) {
      await db.collection('ordens').doc(doc.id).update({
        'automacao.retiradaCobrancas': cobrancas + 1,
        'automacao.retiradaUltimoEnvioEm': new Date().toISOString(),
      })
    }
  }
}

/**
 * Um "tick" do motor — chamado periodicamente (setInterval em index.ts) e
 * também exposto via POST /api/v1/automacoes/tick pra testar sem esperar
 * o intervalo (backlog Fase 5, Cards 12.1-12.7).
 */
export async function executarTick(): Promise<{ executado: boolean; motivo?: string }> {
  const config = await buscarAutomacoesConfig()

  if (config.pausarTodas) return { executado: false, motivo: 'Automações pausadas (switch geral).' }
  if (!dentroDaJanela(config)) return { executado: false, motivo: 'Fora da janela de horário permitido.' }

  try {
    await processarDistribuicao(config)
    await processarConfirmacaoDia(config)
    await processarConfirmacaoEntrega(config)
    await processarCobrancaFoto(config)
    await processarCobrancaRetirada(config)
    return { executado: true }
  } catch (err) {
    logger.error('Erro no tick do motor de automações', { erro: err instanceof Error ? err.message : String(err) })
    return { executado: false, motivo: 'Erro — ver logs.' }
  }
}
