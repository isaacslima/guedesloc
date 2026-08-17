import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'juvo_user',
    password: process.env.MYSQL_PASSWORD || 'juvo_pass',
    database: process.env.MYSQL_DATABASE || 'juvo_automation',
    multipleStatements: true,
  })

  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome        VARCHAR(255) NOT NULL PRIMARY KEY,
      aplicado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  const [aplicadasRows] = await conn.query('SELECT nome FROM schema_migrations')
  const aplicadas = new Set((aplicadasRows as Array<{ nome: string }>).map((r) => r.nome))

  const arquivos = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

  let executadas = 0
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue

    console.log(`[Migrate] Aplicando ${arquivo}...`)
    const sql = await readFile(path.join(MIGRATIONS_DIR, arquivo), 'utf-8')
    await conn.query(sql)
    await conn.execute('INSERT INTO schema_migrations (nome) VALUES (?)', [arquivo])
    console.log('[Migrate]   OK')
    executadas++
  }

  console.log(executadas > 0 ? `[Migrate] ${executadas} migração(ões) aplicada(s).` : '[Migrate] Nada pendente.')
  await conn.end()
}

main().catch((err) => {
  console.error('[Migrate] Falhou:', err)
  process.exit(1)
})
