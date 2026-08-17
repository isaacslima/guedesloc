export interface OsColetada {
  numeroOs: string
  dadosLinha: Record<string, string>
  divOrigem: string
  /** Preenchido quando a OS é nova ou mudou de status (ver db.ts::precisaSincronizar) — dados do modal "Detalhes da assistência". */
  detalheAssistencia?: DetalheAssistencia
}

/**
 * Extraído do modal "Detalhes da assistência" (aberto ao clicar no id da OS,
 * em qualquer aba, quando precisaSincronizar indica que vale abrir). Só os
 * campos estáveis entre tipos de serviço viram campo próprio;
 * camposTexto/camposOcultos guardam o dump genérico de tudo que apareceu no
 * modal, pra não perder dado de tipos de serviço ainda não mapeados.
 */
export interface DetalheAssistencia {
  assistencia: string | null
  cliente: string | null
  segmento: string | null
  segurado: string | null
  contato: string | null
  telefone: string | null
  valorTempo: number | null
  valorUsuario: number | null
  valorTotal: number | null
  tipoAcionamento: string | null
  nomeServico: string | null
  descricao: string | null
  /** 'YYYY-MM-DD HH:MM:SS' ou null — montado direto de regex, sem Date/timezone. */
  dataAbertura: string | null
  previsaoInicio: string | null
  previsaoFim: string | null
  dataAceite: string | null
  enderecoOrigem: Record<string, unknown> | null
  enderecoDestino: Record<string, unknown> | null
  condicaoServico: string | null
  resumoProblema: string | null
  camposTexto: Record<string, string>
  camposOcultos: Record<string, string>
}

export interface ResultadoExecucao {
  osColetadas: number
  osAtualizadas: number
  erros: string[]
  status: 'sucesso' | 'erro'
}

export interface AbaConfig {
  /** Nome/status da aba, usado como divOrigem/status no banco e no nome dos arquivos de debug. */
  nome: string
  /** Painel/container da aba dentro da tela de Ordens de Serviço. */
  painel: string
  /**
   * Nome dos campos de cada linha, na ordem em que os divs filhos diretos de
   * SELETORES.linhaOs aparecem dentro dessa aba (não há cabeçalho <thead>, a
   * ordem é fixa no layout — e varia de aba para aba). Carregado do banco
   * (tabelas aba_config/aba_coluna) por carregarAbas() em src/config.ts.
   */
  colunas: string[]
}

export interface AcaoFila {
  id: number
  numeroOs: string
  tipoAcao: string
  payload: Record<string, unknown> | null
}

export interface ConfigSeletores {
  /** Botão que abre o menu de navegação do portal, exibido logo após o login. */
  botaoAbrirMenu: string
  /** Item do menu (3º item) que leva à tela de Ordens de Serviço. */
  itemMenuOrdens: string
  /** Seletor de cada linha/card de OS, relativo ao painel de cada aba. */
  linhaOs: string
  /** Botão de fechar do popup/modal que aparece logo após o login. */
  botaoFecharPopup: string
  /**
   * Overlay compartilhado por qualquer modal do portal (popup de login e o
   * modal "Detalhes da assistência" usam a mesma casca) — usado pra esperar
   * o modal de detalhe aparecer/sumir.
   */
  overlayModal: string
}

// Container comum às abas (Novos, Reagendados, ...) — cada aba é o Nº-ésimo
// filho direto desse container. O Nº-ésimo vem de aba_config.ordem (banco).
export const CONTAINER_ABAS =
  '#root > div.relative.overflow-y-auto.\\[\\&\\:\\:-webkit-scrollbar\\]\\:block.\\[\\&\\:\\:-webkit-scrollbar\\]\\:w-\\[5px\\].\\[\\&\\:\\:-webkit-scrollbar-thumb\\]\\:bg-\\[darkgrey\\] > div > div'

// Seletores configuráveis — ajuste após inspecionar o DOM em HEADLESS=false
export const SELETORES: ConfigSeletores = {
  botaoAbrirMenu:
    '#root > div.flex.gap-4.h-\\[calc\\(100vh-72px\\)\\].overflow-y-auto.relative.m-auto.px-7.pt-7.max-\\[1270px\\]\\:flex-col.max-\\[725px\\]\\:px-3.max-\\[725px\\]\\:pt-3 > div > div.relative.z-\\[1\\].flex.w-full.flex-\\[0\\].items-center.justify-between > button',
  itemMenuOrdens:
    '#root > div.flex.gap-4.h-\\[calc\\(100vh-72px\\)\\].overflow-y-auto.relative.m-auto.px-7.pt-7.max-\\[1270px\\]\\:flex-col.max-\\[725px\\]\\:px-3.max-\\[725px\\]\\:pt-3 > div > div.relative.z-\\[1\\].flex.w-full.flex-\\[0\\].items-center.justify-between > div > div:nth-child(3)',
  linhaOs: 'table tbody tr',
  botaoFecharPopup:
    'body > div.fixed.inset-0.z-\\[1000\\].flex.items-center.justify-center.bg-black\\/25.animate-fade-in > div > div.flex.items-center.justify-between.px-4.py-3.text-white > button',
  overlayModal: 'body > div.fixed.inset-0.z-\\[1000\\].flex.items-center.justify-center.bg-black\\/25.animate-fade-in',
}
