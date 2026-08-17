import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { CONTAINER_ABAS, SELETORES } from './types'

/**
 * Script de exploração isolado (não faz parte do fluxo de produção): loga,
 * abre a aba "novos", clica no primeiro item da lista e salva o HTML
 * completo do modal de detalhe em debug/ pra desenhar a extração real em
 * cima de dado de verdade, em vez de chutar seletor.
 */

const LOGIN_URL = process.env.JUVO_LOGIN_URL || 'https://juvo.com.br/juvoweb/api/login'
const PORTAL_URL = process.env.PORTAL_URL || 'https://novo-portal-prestador.prd.tempoassist.cloud/'
const HEADLESS = process.env.HEADLESS !== 'false'
const DEBUG_DIR = path.join(__dirname, '..', 'debug')

async function main() {
  const usuario = process.env.JUVO_USERNAME
  const senha = process.env.JUVO_PASSWORD
  if (!usuario || !senha) throw new Error('JUVO_USERNAME e JUVO_PASSWORD devem estar definidos no .env')

  const browser = await chromium.launch({ headless: HEADLESS, args: ['--mute-audio'] })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  console.log('[DebugModal] Login...')
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page
    .locator('input[name="username"], input[type="email"], input[name="login"], input[placeholder*="usuário" i], input[placeholder*="user" i]')
    .first()
    .fill(usuario)
  await page.locator('input[type="password"]').first().fill(senha)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => null),
    page.locator('#entrar').click(),
  ])

  console.log('[DebugModal] Portal...')
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 30_000 })

  // Fecha o popup inicial se aparecer, sem addLocatorHandler (script de tiro único).
  await page.locator(SELETORES.botaoFecharPopup).click({ timeout: 5_000 }).catch(() => null)

  console.log('[DebugModal] Abrindo Ordens de Serviço...')
  await page.locator(SELETORES.botaoAbrirMenu).click({ timeout: 15_000 })
  await page.locator(SELETORES.itemMenuOrdens).click({ timeout: 15_000 })

  const painelNovos = page.locator(`${CONTAINER_ABAS} > div:nth-child(1)`)
  await painelNovos.waitFor({ timeout: 15_000 })

  const chip = painelNovos.locator('div.cursor-pointer').first()
  if (await chip.count() > 0) {
    console.log('[DebugModal] Expandindo lista de "novos"...')
    await chip.click()
  }

  await painelNovos.locator(SELETORES.linhaOs).first().waitFor({ timeout: 10_000 })
  const primeiraLinha = painelNovos.locator(SELETORES.linhaOs).first()

  console.log('[DebugModal] Clicando no primeiro item pra abrir o modal de detalhe...')
  const spanClicavel = primeiraLinha.locator(':scope > td').first().locator('div > span').first()
  await spanClicavel.click()

  const modal = page.locator(
    'body > div.fixed.inset-0.z-\\[1000\\].flex.items-center.justify-center.bg-black\\/25.animate-fade-in',
  )
  await modal.waitFor({ timeout: 10_000 })
  await page.waitForTimeout(1_000) // dá tempo do conteúdo assíncrono do modal terminar de renderizar

  const html = await modal.innerHTML()

  await mkdir(DEBUG_DIR, { recursive: true })
  const arquivo = path.join(DEBUG_DIR, `modal-detalhe-os-${Date.now()}.html`)
  await writeFile(arquivo, html, 'utf-8')
  console.log(`[DebugModal] HTML do modal salvo em ${arquivo}`)

  await browser.close()
}

main().catch((err) => {
  console.error('[DebugModal] Falhou:', err)
  process.exit(1)
})
