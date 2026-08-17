import 'dotenv/config'
import express from 'express'
import type { Request, Response } from 'express'
import { conectar } from './db'

const PORT = Number(process.env.VIEWER_PORT) || 3000

function escapeHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function layout(titulo: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(titulo)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f7f7f8; color: #1a1a1a; }
  h1 { margin-top: 0; }
  h2 { font-size: 16px; margin-top: 28px; }
  table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  th, td { padding: 8px 12px; border-bottom: 1px solid #e5e5e5; text-align: left; font-size: 14px; vertical-align: top; }
  th { background: #f0f0f2; }
  tr:hover { background: #fafafa; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #e5e7eb; white-space: nowrap; }
  nav { margin-bottom: 20px; }
  nav a { margin-right: 16px; font-weight: 600; }
  .filtros { margin-bottom: 16px; }
  .filtros a { margin-right: 8px; padding: 4px 10px; border: 1px solid #ddd; border-radius: 6px; background: #fff; font-size: 13px; }
  .filtros a.ativo { background: #2563eb; color: #fff; border-color: #2563eb; }
</style>
</head>
<body>
<nav><a href="/">Ordens de Serviço</a><a href="/fila">Fila de Ações</a></nav>
${corpo}
</body>
</html>`
}

interface LinhaOs {
  numero_os: string
  status: string
  dados_linha: Record<string, string> | null
  criado_em: string
  atualizado_em: string
}

const app = express()

app.get('/', async (req: Request, res: Response) => {
  const conn = await conectar()
  const statusFiltro = typeof req.query.status === 'string' ? req.query.status : null

  const [statusRows] = await conn.query(
    `SELECT status, COUNT(*) AS total FROM ordens_servico GROUP BY status ORDER BY status`,
  )
  const filtros = statusRows as Array<{ status: string; total: number }>

  const [rows] = await conn.query(
    statusFiltro
      ? `SELECT numero_os, status, dados_linha, criado_em, atualizado_em FROM ordens_servico WHERE status = ? ORDER BY atualizado_em DESC`
      : `SELECT numero_os, status, dados_linha, criado_em, atualizado_em FROM ordens_servico ORDER BY atualizado_em DESC`,
    statusFiltro ? [statusFiltro] : [],
  )
  const linhas = rows as LinhaOs[]

  const totalGeral = filtros.reduce((soma, f) => soma + f.total, 0)
  const filtrosHtml = [
    `<a href="/"${!statusFiltro ? ' class="ativo"' : ''}>Todas (${totalGeral})</a>`,
    ...filtros.map(
      (f) =>
        `<a href="/?status=${encodeURIComponent(f.status)}"${f.status === statusFiltro ? ' class="ativo"' : ''}>${escapeHtml(f.status)} (${f.total})</a>`,
    ),
  ].join('')

  const linhasHtml = linhas
    .map((l) => {
      const d = l.dados_linha ?? {}
      return `<tr>
        <td><a href="/os/${encodeURIComponent(l.numero_os)}">${escapeHtml(l.numero_os)}</a></td>
        <td><span class="status">${escapeHtml(l.status)}</span></td>
        <td>${escapeHtml(d['descricaoServico'])}</td>
        <td>${escapeHtml(d['tempo'])}</td>
        <td>${escapeHtml(d['etapa'])}</td>
        <td>${escapeHtml(l.atualizado_em)}</td>
      </tr>`
    })
    .join('')

  res.send(
    layout(
      'Ordens de Serviço',
      `<h1>Ordens de Serviço</h1>
      <div class="filtros">${filtrosHtml}</div>
      <table>
        <thead><tr><th>Número OS</th><th>Status</th><th>Serviço</th><th>Tempo</th><th>Etapa</th><th>Atualizado em</th></tr></thead>
        <tbody>${linhasHtml || '<tr><td colspan="6">Nenhuma OS coletada ainda.</td></tr>'}</tbody>
      </table>`,
    ),
  )
})

app.get('/os/:numeroOs', async (req: Request, res: Response) => {
  const conn = await conectar()
  const numeroOs = req.params.numeroOs

  const [osRows] = await conn.execute(
    `SELECT numero_os, status, dados_linha, criado_em, atualizado_em FROM ordens_servico WHERE numero_os = ?`,
    [numeroOs],
  )
  const os = (osRows as LinhaOs[])[0]

  if (!os) {
    res.status(404).send(layout('OS não encontrada', `<h1>OS não encontrada</h1><p><a href="/">Voltar</a></p>`))
    return
  }

  const [historicoRows] = await conn.execute(
    `SELECT status_anterior, status_novo, registrado_em FROM ordens_servico_historico WHERE numero_os = ? ORDER BY registrado_em ASC`,
    [numeroOs],
  )
  const historico = historicoRows as Array<{ status_anterior: string | null; status_novo: string; registrado_em: string }>

  const camposHtml = Object.entries(os.dados_linha ?? {})
    .map(([campo, valor]) => `<tr><td>${escapeHtml(campo)}</td><td>${escapeHtml(valor)}</td></tr>`)
    .join('')

  const historicoHtml = historico
    .map(
      (h) =>
        `<tr><td>${escapeHtml(h.status_anterior ?? '(criação)')}</td><td>&rarr; ${escapeHtml(h.status_novo)}</td><td>${escapeHtml(h.registrado_em)}</td></tr>`,
    )
    .join('')

  res.send(
    layout(
      `OS ${os.numero_os}`,
      `<p><a href="/">&larr; Voltar</a></p>
      <h1>OS ${escapeHtml(os.numero_os)} <span class="status">${escapeHtml(os.status)}</span></h1>
      <p>Criado em ${escapeHtml(os.criado_em)} &middot; Atualizado em ${escapeHtml(os.atualizado_em)}</p>
      <h2>Dados coletados</h2>
      <table><tbody>${camposHtml || '<tr><td>Sem dados.</td></tr>'}</tbody></table>
      <h2>Histórico de status</h2>
      <table><thead><tr><th>De</th><th>Para</th><th>Quando</th></tr></thead><tbody>${historicoHtml || '<tr><td colspan="3">Sem histórico.</td></tr>'}</tbody></table>`,
    ),
  )
})

app.get('/fila', async (_req: Request, res: Response) => {
  const conn = await conectar()
  const [rows] = await conn.query(
    `SELECT id, numero_os, tipo_acao, status, tentativas, mensagem_erro, criado_em, concluido_em
     FROM fila_acoes ORDER BY criado_em DESC LIMIT 200`,
  )
  const linhas = rows as Array<{
    id: number
    numero_os: string
    tipo_acao: string
    status: string
    tentativas: number
    mensagem_erro: string | null
    criado_em: string
    concluido_em: string | null
  }>

  const linhasHtml = linhas
    .map(
      (l) => `<tr>
      <td>${l.id}</td>
      <td><a href="/os/${encodeURIComponent(l.numero_os)}">${escapeHtml(l.numero_os)}</a></td>
      <td>${escapeHtml(l.tipo_acao)}</td>
      <td><span class="status">${escapeHtml(l.status)}</span></td>
      <td>${l.tentativas}</td>
      <td>${escapeHtml(l.mensagem_erro)}</td>
      <td>${escapeHtml(l.criado_em)}</td>
    </tr>`,
    )
    .join('')

  res.send(
    layout(
      'Fila de Ações',
      `<h1>Fila de Ações</h1>
      <table>
        <thead><tr><th>#</th><th>OS</th><th>Ação</th><th>Status</th><th>Tentativas</th><th>Erro</th><th>Criado em</th></tr></thead>
        <tbody>${linhasHtml || '<tr><td colspan="7">Nenhuma ação na fila.</td></tr>'}</tbody>
      </table>`,
    ),
  )
})

app.listen(PORT, () => {
  console.log(`[Viewer] Rodando em http://localhost:${PORT}`)
})
