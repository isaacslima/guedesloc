import type { DetalheAssistencia } from './types'

/**
 * "Tempo Assist" é a integradora/plataforma que este scraper acessa — não é
 * a seguradora final por trás de cada OS (ex.: "BB SEGUROS", capturada em
 * detalhe.cliente e guardada em camposAdicionais). O projeto principal já
 * usa 'tempo_assist' como código de integradora de exemplo
 * (guedesloc/src/types/integracao.ts, comentário do campo Integradora.codigo).
 */
export const SEGURADORA_ID = 'tempo_assist'
export const SEGURADORA_NOME = 'Tempo Assist'

export type StatusCanonico = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'

const STATUS_CANONICO: Record<string, StatusCanonico> = {
  novos: 'aberta',
  reagendados: 'aberta',
  agendados: 'em_andamento',
  cancelados: 'cancelada',
}

export interface OrdemDeServicoCanonica {
  idempotencyKey: string
  numeroOsSeguradora: string
  seguradoraId: string
  seguradoraNome: string
  cliente: {
    nome: string
    telefone?: string
    endereco: string
  }
  servico: {
    tipo: string
    descricao: string
    valor: number
  }
  status: StatusCanonico
  datas: {
    criacao: string
    agendamento?: string
  }
  camposAdicionais?: Record<string, unknown>
}

function formatarEndereco(endereco: Record<string, unknown> | null): string | null {
  if (!endereco) return null
  const partes = [
    endereco['logradouro'],
    endereco['numero'],
    endereco['complemento'],
    endereco['bairro'],
    endereco['cidade'],
    endereco['siglaUf'] ?? endereco['uf'],
    endereco['cep'],
  ].filter((parte): parte is string => typeof parte === 'string' && parte.trim() !== '' && parte !== '--')
  return partes.length > 0 ? partes.join(', ') : null
}

/**
 * As datas salvas pelo scraper (src/scraper.ts::parseDataHora) já são
 * horário de Brasília — o portal exibe tudo em BRT. Fixa o offset -03:00
 * (Brasil não tem horário de verão desde 2019) em vez de assumir UTC.
 */
function paraIso(dataHora: string | null | undefined): string | undefined {
  if (!dataHora) return undefined
  return `${dataHora.replace(' ', 'T')}-03:00`
}

/**
 * cliente.nome/cliente.endereco são obrigatórios no contrato canônico, mas
 * só existem quando o modal de detalhe foi lido (ver
 * scraper.ts::processarAba + db.ts::precisaSincronizar). Sem esses dois
 * campos, não monta payload — melhor não enviar do que mandar algo que o
 * Gateway vai rejeitar (422).
 */
export function mapearParaCanonico(
  numeroOs: string,
  statusAba: string,
  detalhe: DetalheAssistencia,
): OrdemDeServicoCanonica | null {
  const nomeCliente = detalhe.segurado || detalhe.contato
  const endereco = formatarEndereco(detalhe.enderecoOrigem)
  const dataCriacao = paraIso(detalhe.dataAbertura)

  if (!nomeCliente || !endereco || !dataCriacao) {
    console.warn(
      `[Canonico] OS ${numeroOs}: dado obrigatório ausente (segurado=${nomeCliente ?? 'null'}, ` +
        `endereco=${endereco ?? 'null'}, dataAbertura=${dataCriacao ?? 'null'}) — não enviado ao Gateway`,
    )
    return null
  }

  return {
    idempotencyKey: `${SEGURADORA_ID}:${numeroOs}`,
    numeroOsSeguradora: numeroOs,
    seguradoraId: SEGURADORA_ID,
    seguradoraNome: SEGURADORA_NOME,
    cliente: {
      nome: nomeCliente,
      telefone: detalhe.telefone ?? undefined,
      endereco,
    },
    servico: {
      tipo: detalhe.nomeServico || detalhe.tipoAcionamento || 'não especificado',
      descricao: detalhe.descricao ?? '',
      valor: detalhe.valorTotal ?? 0,
    },
    status: STATUS_CANONICO[statusAba] ?? 'aberta',
    datas: {
      criacao: dataCriacao,
      agendamento: paraIso(detalhe.previsaoInicio),
    },
    camposAdicionais: {
      seguradoraFinal: detalhe.cliente,
      segmento: detalhe.segmento,
      assistencia: detalhe.assistencia,
      tipoAcionamento: detalhe.tipoAcionamento,
      valorTempo: detalhe.valorTempo,
      valorUsuario: detalhe.valorUsuario,
      previsaoFim: paraIso(detalhe.previsaoFim),
      dataAceite: paraIso(detalhe.dataAceite),
      condicaoServico: detalhe.condicaoServico,
      resumoProblema: detalhe.resumoProblema,
      enderecoDestino: detalhe.enderecoDestino,
      camposTexto: detalhe.camposTexto,
      camposOcultos: detalhe.camposOcultos,
    },
  }
}
