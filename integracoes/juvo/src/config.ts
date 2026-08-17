import { conectar } from './db'
import { CONTAINER_ABAS } from './types'
import type { AbaConfig } from './types'

interface LinhaAbaConfig {
  id: number
  nome: string
  ordem: number
}

interface LinhaAbaColuna {
  aba_id: number
  nome_campo: string
  ordem: number
}

/**
 * Monta a lista de abas/colunas a partir das tabelas aba_config/aba_coluna,
 * para permitir adicionar ou ajustar abas (novos status, novas colunas) sem
 * precisar alterar código — só inserindo/atualizando linhas no banco.
 */
export async function carregarAbas(): Promise<AbaConfig[]> {
  const conn = await conectar()

  const [abasRows] = await conn.query(
    `SELECT id, nome, ordem FROM aba_config WHERE ativo = 1 ORDER BY ordem ASC`,
  )
  const abas = abasRows as LinhaAbaConfig[]

  const [colunasRows] = await conn.query(
    `SELECT aba_id, nome_campo, ordem FROM aba_coluna ORDER BY aba_id ASC, ordem ASC`,
  )
  const colunas = colunasRows as LinhaAbaColuna[]

  return abas.map((aba) => ({
    nome: aba.nome,
    painel: `${CONTAINER_ABAS} > div:nth-child(${aba.ordem})`,
    colunas: colunas.filter((c) => c.aba_id === aba.id).map((c) => c.nome_campo),
  }))
}
