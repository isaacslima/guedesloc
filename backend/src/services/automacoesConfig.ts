import { db } from './firestore.js'

export type ModoAutomacao = 'desligada' | 'teste' | 'producao'
export type AutonomiaAutomacao = 'manual' | 'automatica'

export interface RegraDistribuicao {
  modo: ModoAutomacao
  autonomia: AutonomiaAutomacao
  tempoRespostaMin: number
  tempoExtraConfirmarMin: number
  maxTentativas: number | null
  enviarParaPendenciaSeRecusarTodos: boolean
}

export interface RegraSimples {
  modo: ModoAutomacao
  autonomia: AutonomiaAutomacao
  tempoAposGatilhoMin: number
  maxCobrancas: number
}

export interface RegraRetirada {
  modo: ModoAutomacao
  autonomia: AutonomiaAutomacao
  diasAposEntregaPrimeiraCobranca: number
  tempoEntreCobrancasHoras: number
  maxCobrancas: number
}

export interface AutomacoesConfig {
  pausarTodas: boolean
  distribuicao: RegraDistribuicao
  confirmacaoDia: { modo: ModoAutomacao; autonomia: AutonomiaAutomacao; horarioPadrao: string }
  confirmacaoEntrega: RegraSimples
  cobrancaFoto: RegraSimples
  cobrancaRetirada: RegraRetirada
  janelaInicio: string
  janelaFim: string
}

export const AUTOMACOES_CONFIG_PADRAO: AutomacoesConfig = {
  pausarTodas: false,
  distribuicao: {
    modo: 'desligada', autonomia: 'manual', tempoRespostaMin: 15, tempoExtraConfirmarMin: 20,
    maxTentativas: null, enviarParaPendenciaSeRecusarTodos: true,
  },
  confirmacaoDia: { modo: 'desligada', autonomia: 'manual', horarioPadrao: '08:00' },
  confirmacaoEntrega: { modo: 'desligada', autonomia: 'manual', tempoAposGatilhoMin: 0, maxCobrancas: 2 },
  cobrancaFoto: { modo: 'desligada', autonomia: 'manual', tempoAposGatilhoMin: 30, maxCobrancas: 2 },
  cobrancaRetirada: { modo: 'desligada', autonomia: 'manual', diasAposEntregaPrimeiraCobranca: 3, tempoEntreCobrancasHoras: 24, maxCobrancas: 3 },
  janelaInicio: '08:00',
  janelaFim: '18:00',
}

const DOC_REF = () => db.collection('automacoes_config').doc('config')

export async function buscarAutomacoesConfig(): Promise<AutomacoesConfig> {
  const snap = await DOC_REF().get()
  if (!snap.exists) return AUTOMACOES_CONFIG_PADRAO
  const dados = snap.data()!
  // merge raso com o padrão — documento parcial (campo novo adicionado depois) não quebra
  return {
    ...AUTOMACOES_CONFIG_PADRAO,
    ...dados,
    distribuicao: { ...AUTOMACOES_CONFIG_PADRAO.distribuicao, ...dados.distribuicao },
    confirmacaoDia: { ...AUTOMACOES_CONFIG_PADRAO.confirmacaoDia, ...dados.confirmacaoDia },
    confirmacaoEntrega: { ...AUTOMACOES_CONFIG_PADRAO.confirmacaoEntrega, ...dados.confirmacaoEntrega },
    cobrancaFoto: { ...AUTOMACOES_CONFIG_PADRAO.cobrancaFoto, ...dados.cobrancaFoto },
    cobrancaRetirada: { ...AUTOMACOES_CONFIG_PADRAO.cobrancaRetirada, ...dados.cobrancaRetirada },
  } as AutomacoesConfig
}

/** 'pular' = desligada; 'simular' = teste (só loga o que faria); 'sugerir' = produção+manual (não executa sozinha); 'executar' = produção+automática. */
export type DecisaoAutomacao = 'pular' | 'simular' | 'sugerir' | 'executar'

export function decidirAcao(modo: ModoAutomacao, autonomia: AutonomiaAutomacao): DecisaoAutomacao {
  if (modo === 'desligada') return 'pular'
  if (modo === 'teste') return 'simular'
  return autonomia === 'automatica' ? 'executar' : 'sugerir'
}

export function dentroDaJanela(config: AutomacoesConfig, agora: Date = new Date()): boolean {
  const [hIni, mIni] = config.janelaInicio.split(':').map(Number)
  const [hFim, mFim] = config.janelaFim.split(':').map(Number)
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()
  const minutosIni = (hIni ?? 0) * 60 + (mIni ?? 0)
  const minutosFim = (hFim ?? 23) * 60 + (mFim ?? 59)
  return minutosAgora >= minutosIni && minutosAgora <= minutosFim
}
