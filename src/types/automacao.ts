// Mesma forma de backend/src/services/automacoesConfig.ts — duplicado
// porque front e backend são projetos separados (mesmo padrão já usado
// pra OSEtapa/etapaOS.ts).

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

export const MODO_LABEL: Record<ModoAutomacao, string> = {
  desligada: 'Desligada',
  teste: 'Teste',
  producao: 'Produção',
}

export const AUTONOMIA_LABEL: Record<AutonomiaAutomacao, string> = {
  manual: 'Manual — nunca executa sozinha, apenas sugere',
  automatica: 'Automática — executa sozinha',
}
