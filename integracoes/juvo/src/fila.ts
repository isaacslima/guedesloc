import { conectar } from './db'
import type { AcaoFila } from './types'

/** Publica uma ação para a automação executar na próxima execução (o "trigger manual"). */
export async function enfileirarAcao(
  numeroOs: string,
  tipoAcao: string,
  payload?: Record<string, unknown>,
): Promise<number> {
  const conn = await conectar()
  const [result] = await conn.execute(
    `INSERT INTO fila_acoes (numero_os, tipo_acao, payload) VALUES (?, ?, ?)`,
    [numeroOs, tipoAcao, payload ? JSON.stringify(payload) : null],
  )
  return (result as { insertId: number }).insertId
}

export async function buscarPendentes(limite = 10): Promise<AcaoFila[]> {
  const conn = await conectar()
  const [rows] = await conn.query(
    `SELECT id, numero_os, tipo_acao, payload
     FROM fila_acoes
     WHERE status = 'pendente'
     ORDER BY criado_em ASC
     LIMIT ?`,
    [limite],
  )

  return (rows as Array<{ id: number; numero_os: string; tipo_acao: string; payload: unknown }>).map((r) => ({
    id: r.id,
    numeroOs: r.numero_os,
    tipoAcao: r.tipo_acao,
    payload: (r.payload as Record<string, unknown> | null) ?? null,
  }))
}

export async function marcarEmExecucao(id: number): Promise<void> {
  const conn = await conectar()
  await conn.execute(
    `UPDATE fila_acoes SET status = 'em_execucao', iniciado_em = NOW(), tentativas = tentativas + 1 WHERE id = ?`,
    [id],
  )
}

export async function marcarConcluida(id: number): Promise<void> {
  const conn = await conectar()
  await conn.execute(
    `UPDATE fila_acoes SET status = 'concluido', concluido_em = NOW(), mensagem_erro = NULL WHERE id = ?`,
    [id],
  )
}

export async function marcarErro(id: number, mensagem: string): Promise<void> {
  const conn = await conectar()
  await conn.execute(`UPDATE fila_acoes SET status = 'erro', mensagem_erro = ? WHERE id = ?`, [mensagem, id])
}
