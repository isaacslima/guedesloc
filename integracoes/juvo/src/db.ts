import mysql from 'mysql2/promise'
import type { Connection } from 'mysql2/promise'
import type { DetalheAssistencia, OsColetada } from './types'

let connection: Connection | null = null

export async function conectar(): Promise<Connection> {
  if (connection) return connection

  connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'juvo_user',
    password: process.env.MYSQL_PASSWORD || 'juvo_pass',
    database: process.env.MYSQL_DATABASE || 'juvo_automation',
  })

  console.log('[DB] Conectado ao MySQL')
  return connection
}

export async function desconectar(): Promise<void> {
  if (connection) {
    await connection.end()
    connection = null
    console.log('[DB] Desconectado do MySQL')
  }
}

export type ResultadoSalvarOs = 'novo' | 'atualizado' | 'sem_alteracao'

/**
 * Faz upsert da OS e registra o rastreio de mudança de status em
 * ordens_servico_historico: se a OS não existe, cria como registro novo
 * (status_anterior NULL); se existe e o status mudou (ex.: reagendados →
 * em_andamento_aguardando_chegada), atualiza e registra a transição; se o
 * status é o mesmo, só atualiza o snapshot de dados_linha (ex.: tempo/etapa).
 */
export async function salvarOs(os: OsColetada): Promise<ResultadoSalvarOs> {
  const conn = await conectar()
  const dadosJson = JSON.stringify(os.dadosLinha)

  const [linhas] = await conn.execute(
    `SELECT status FROM ordens_servico WHERE numero_os = ? LIMIT 1`,
    [os.numeroOs],
  )
  const existente = (linhas as Array<{ status: string }>)[0]

  if (!existente) {
    await conn.execute(
      `INSERT INTO ordens_servico (numero_os, status, dados_linha) VALUES (?, ?, ?)`,
      [os.numeroOs, os.divOrigem, dadosJson],
    )
    await conn.execute(
      `INSERT INTO ordens_servico_historico (numero_os, status_anterior, status_novo) VALUES (?, NULL, ?)`,
      [os.numeroOs, os.divOrigem],
    )
    return 'novo'
  }

  if (existente.status !== os.divOrigem) {
    await conn.execute(
      `UPDATE ordens_servico SET status = ?, dados_linha = ? WHERE numero_os = ?`,
      [os.divOrigem, dadosJson, os.numeroOs],
    )
    await conn.execute(
      `INSERT INTO ordens_servico_historico (numero_os, status_anterior, status_novo) VALUES (?, ?, ?)`,
      [os.numeroOs, existente.status, os.divOrigem],
    )
    return 'atualizado'
  }

  await conn.execute(
    `UPDATE ordens_servico SET dados_linha = ? WHERE numero_os = ?`,
    [dadosJson, os.numeroOs],
  )
  return 'sem_alteracao'
}

/**
 * Checagem barata (sem escrever) pra decidir se vale a pena abrir o modal de
 * detalhe da OS — abrir modal é caro (clique + espera + parse), então só faz
 * sentido pra OS novas, que mudaram de aba/status desde a última coleta, ou
 * que mudaram de status mas nunca confirmaram sincronizado_firebase_em
 * (envio anterior ao Gateway falhou ou nunca foi tentado) — senão uma falha
 * de rede/Gateway numa execução deixaria a OS presa pra sempre, porque o
 * MySQL já registrou o status daquela aba mesmo sem o envio ter dado certo.
 */
export async function precisaSincronizar(numeroOs: string, statusAba: string): Promise<boolean> {
  const conn = await conectar()
  const [linhas] = await conn.execute(
    `SELECT status, sincronizado_firebase_em FROM ordens_servico WHERE numero_os = ? LIMIT 1`,
    [numeroOs],
  )
  const existente = (linhas as Array<{ status: string; sincronizado_firebase_em: Date | null }>)[0]
  if (!existente) return true
  if (existente.status !== statusAba) return true
  return existente.sincronizado_firebase_em === null
}

/**
 * Upsert simples por numero_os — diferente de salvarOs, aqui não há
 * histórico de transição, o modal é lido de novo a cada execução e
 * sobrescreve o snapshot anterior.
 */
export async function salvarDetalheAssistencia(numeroOs: string, d: DetalheAssistencia): Promise<void> {
  const conn = await conectar()
  await conn.execute(
    `INSERT INTO detalhes_assistencia (
       numero_os, assistencia, cliente, segmento, segurado, contato, telefone,
       valor_tempo, valor_usuario, valor_total, tipo_acionamento, nome_servico,
       descricao, data_abertura, previsao_inicio, previsao_fim, data_aceite,
       endereco_origem, endereco_destino, condicao_servico, resumo_problema,
       campos_texto, campos_ocultos
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       assistencia = VALUES(assistencia),
       cliente = VALUES(cliente),
       segmento = VALUES(segmento),
       segurado = VALUES(segurado),
       contato = VALUES(contato),
       telefone = VALUES(telefone),
       valor_tempo = VALUES(valor_tempo),
       valor_usuario = VALUES(valor_usuario),
       valor_total = VALUES(valor_total),
       tipo_acionamento = VALUES(tipo_acionamento),
       nome_servico = VALUES(nome_servico),
       descricao = VALUES(descricao),
       data_abertura = VALUES(data_abertura),
       previsao_inicio = VALUES(previsao_inicio),
       previsao_fim = VALUES(previsao_fim),
       data_aceite = VALUES(data_aceite),
       endereco_origem = VALUES(endereco_origem),
       endereco_destino = VALUES(endereco_destino),
       condicao_servico = VALUES(condicao_servico),
       resumo_problema = VALUES(resumo_problema),
       campos_texto = VALUES(campos_texto),
       campos_ocultos = VALUES(campos_ocultos)`,
    [
      numeroOs,
      d.assistencia,
      d.cliente,
      d.segmento,
      d.segurado,
      d.contato,
      d.telefone,
      d.valorTempo,
      d.valorUsuario,
      d.valorTotal,
      d.tipoAcionamento,
      d.nomeServico,
      d.descricao,
      d.dataAbertura,
      d.previsaoInicio,
      d.previsaoFim,
      d.dataAceite,
      d.enderecoOrigem ? JSON.stringify(d.enderecoOrigem) : null,
      d.enderecoDestino ? JSON.stringify(d.enderecoDestino) : null,
      d.condicaoServico,
      d.resumoProblema,
      JSON.stringify(d.camposTexto),
      JSON.stringify(d.camposOcultos),
    ],
  )
}

export async function marcarSincronizadoFirebase(numeroOs: string): Promise<void> {
  const conn = await conectar()
  await conn.execute(
    `UPDATE ordens_servico SET sincronizado_firebase_em = NOW() WHERE numero_os = ?`,
    [numeroOs],
  )
}

export async function iniciarExecucao(): Promise<number> {
  const conn = await conectar()
  const [result] = await conn.execute(
    `INSERT INTO execucoes (status) VALUES ('em_andamento')`,
  )
  return (result as { insertId: number }).insertId
}

export async function finalizarExecucao(
  id: number,
  status: 'sucesso' | 'erro',
  osColetadas: number,
  mensagem?: string,
): Promise<void> {
  const conn = await conectar()
  await conn.execute(
    `UPDATE execucoes
     SET finalizado_em = NOW(), status = ?, os_coletadas = ?, mensagem = ?
     WHERE id = ?`,
    [status, osColetadas, mensagem ?? null, id],
  )
}
