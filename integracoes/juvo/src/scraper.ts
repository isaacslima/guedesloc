import { chromium } from 'playwright'
import type { Browser, BrowserContext, Locator, Page } from 'playwright'
import type { AbaConfig, DetalheAssistencia, OsColetada, ResultadoExecucao } from './types'
import { SELETORES } from './types'
import { marcarSincronizadoFirebase, precisaSincronizar, salvarDetalheAssistencia, salvarOs } from './db'
import { carregarAbas } from './config'
import { processarFilaAcoes } from './acoes'
import { mapearParaCanonico } from './canonico'
import { enviarParaGateway } from './gateway'
import { logger } from './logger'

const LOGIN_URL = process.env.JUVO_LOGIN_URL || 'https://juvo.com.br/juvoweb/api/login'
const PORTAL_URL = process.env.PORTAL_URL || 'https://novo-portal-prestador.prd.tempoassist.cloud/'
const HEADLESS = process.env.HEADLESS !== 'false'

async function fazerLogin(page: Page): Promise<void> {
  const usuario = process.env.JUVO_USERNAME
  const senha = process.env.JUVO_PASSWORD

  if (!usuario || !senha) {
    throw new Error('JUVO_USERNAME e JUVO_PASSWORD devem estar definidos no .env')
  }

  console.log('[Scraper] Navegando para a página de login...')
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })

  // Preenche formulário de login (ajuste os seletores se necessário)
  const campoUsuario = page.locator('input[name="username"], input[type="email"], input[name="login"], input[placeholder*="usuário" i], input[placeholder*="user" i]').first()
  const campoSenha = page.locator('input[type="password"]').first()
  const botaoEntrar = page.locator('#entrar')

  await campoUsuario.fill(usuario)
  await campoSenha.fill(senha)

  console.log('[Scraper] Enviando credenciais...')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => null),
    botaoEntrar.click(),
  ])

  // Verifica se o login foi bem-sucedido procurando por indicadores de erro
  const erroLogin = page.locator('[class*="error"], [class*="alert"], [class*="invalid"]')
  if (await erroLogin.isVisible().catch(() => false)) {
    const textoErro = await erroLogin.textContent().catch(() => 'Erro desconhecido')
    throw new Error(`Falha no login: ${textoErro}`)
  }

  console.log('[Scraper] Login realizado com sucesso')
}

async function navegarParaPortal(page: Page): Promise<void> {
  console.log('[Scraper] Navegando para o portal...')
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 30_000 })
  console.log('[Scraper] Portal carregado')
}

/**
 * O popup aparece em um tempo indeterminado após o carregamento da página (não
 * dá pra confiar num único waitFor pontual). addLocatorHandler fica registrado
 * pra sessão inteira e o Playwright o dispara automaticamente sempre que o
 * popup ficar visível, antes de qualquer ação (click etc.) — não importa em
 * qual ponto do fluxo ele apareça.
 */
async function registrarFechamentoDoPopup(page: Page): Promise<void> {
  const botaoFechar = page.locator(SELETORES.botaoFecharPopup)
  await page.addLocatorHandler(botaoFechar, async () => {
    console.log('[Scraper] Popup detectado — fechando...')
    await botaoFechar.click().catch(() => null)
  })
}

async function abrirTelaOrdens(page: Page, painelReferencia: string): Promise<void> {
  console.log('[Scraper] Abrindo menu de navegação...')
  await page.locator(SELETORES.botaoAbrirMenu).click({ timeout: 15_000 })

  console.log('[Scraper] Abrindo tela de Ordens de Serviço...')
  await page.locator(SELETORES.itemMenuOrdens).click({ timeout: 15_000 })

  await page.waitForSelector(painelReferencia, { timeout: 15_000 })
  console.log('[Scraper] Tela de Ordens de Serviço carregada')
}

/**
 * O campo "Serviço" (td) renderiza numa linha só: o id da OS no sistema do
 * fornecedor/seguradora sem espaços (ex.: "542.71868104/2"), seguido de
 * " - " e a descrição (ex.: "FORNECIMENTO DE CAÇAMBA - 93224477 - BAIRRO
 * PASQUALINI"). O id nunca tem espaço, então o primeiro token antes do
 * " - " é sempre ele, mesmo que a descrição tenha mais hífens depois.
 */
function parseServico(textoServico: string): { idOsFornecedor: string; descricaoServico: string } {
  const texto = textoServico.replace(/\s+/g, ' ').trim()
  const match = texto.match(/^(\S+)\s*-\s*(.*)$/)
  if (!match) return { idOsFornecedor: texto, descricaoServico: '' }
  return { idOsFornecedor: match[1], descricaoServico: match[2].trim() }
}

/**
 * Nas abas "Em Andamento", o campo "Status" pode ter uma segunda informação
 * (ex.: "Em andamento" + "Aguardando chegar ao local"). Ainda não confirmado
 * com dado real como isso separa no innerText do td — hoje só devolve o
 * texto inteiro em status, sem statusDetalhe.
 */
function parseStatus(textoStatus: string): { status: string; statusDetalhe: string } {
  const linhas = textoStatus.split('\n').map((linha) => linha.trim()).filter(Boolean)
  const status = linhas[0] ?? ''
  const statusDetalhe = linhas.slice(1).join(' ').trim()
  return { status, statusDetalhe }
}

/** "R$ 350,00" (BR, NBSP e vírgula decimal) -> 350. */
function parseMoeda(texto: string | null | undefined): number | null {
  if (!texto) return null
  const limpo = texto.replace(/[^\d,.-]/g, '')
  if (!limpo) return null
  const normalizado = limpo.replace(/\./g, '').replace(',', '.')
  const valor = Number(normalizado)
  return Number.isNaN(valor) ? null : valor
}

/**
 * Casa tanto o ISO sem timezone dos spans ocultos ("2026-08-18T08:00:00.000")
 * quanto o formato US 12h do texto visível ("8/16/2026, 10:47:53 AM") e monta
 * 'YYYY-MM-DD HH:MM:SS' direto via regex — sem Date/timezone, pra não
 * arriscar deslocar o horário conforme o fuso do host que roda o scraper.
 */
function parseDataHora(texto: string | null | undefined): string | null {
  if (!texto) return null

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]} ${iso[4]}:${iso[5]}:${iso[6]}`

  const us = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i)
  if (us) {
    const [, mes, dia, ano, horaStr, min, seg, periodo] = us
    let hora = Number(horaStr) % 12
    if (periodo.toUpperCase() === 'PM') hora += 12
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')} ${String(hora).padStart(2, '0')}:${min}:${seg}`
  }

  return null
}

function parseEnderecoJson(texto: string | null | undefined): Record<string, unknown> | null {
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

/**
 * Todo par label/valor do modal "Detalhes da assistência" (Assistência,
 * Cliente, Segmento, Segurado, Contato, Telefone, Data de abertura, Nome da
 * cobertura, Tem limite material, Forma acionamento, Previsão início/fim,
 * endereço) segue o mesmo DOM: div.text-box > span.label + span.text-content.
 * Uma extração genérica cobre tudo de uma vez, sem depender de posição —
 * resiliente a outros tipos de serviço com campos diferentes.
 */
async function extrairCamposTexto(modal: Locator): Promise<Record<string, string>> {
  return modal.evaluate((el) => {
    const resultado: Record<string, string> = {}
    el.querySelectorAll('.text-box').forEach((box) => {
      const label = box.querySelector('.label')?.textContent?.trim().replace(/:$/, '')
      const valor = box.querySelector('.text-content')?.textContent?.trim()
      if (label) resultado[label] = valor ?? ''
    })
    return resultado
  })
}

/**
 * O modal também tem um bloco de <span id="..." class="hidden"> no fim com o
 * modelo de dados "cru" da assistência (assistencia, clientecorporativo,
 * tipoacionamento, dataprevisaoini/fim em ISO, dataAceite, endereco* etc.).
 * Harvest genérico por id — rede de segurança pra tudo que não virou coluna
 * própria.
 */
async function extrairCamposOcultos(modal: Locator): Promise<Record<string, string>> {
  return modal.evaluate((el) => {
    const resultado: Record<string, string> = {}
    el.querySelectorAll('span[id]').forEach((span) => {
      resultado[span.id] = span.textContent?.trim() ?? ''
    })
    return resultado
  })
}

async function lerValorBox(modal: Locator, testId: string): Promise<string | null> {
  const spans = modal.locator(`[data-testid="${testId}"] span`)
  const total = await spans.count()
  if (total === 0) return null
  return (await spans.nth(total - 1).innerText()).trim()
}

async function extrairDetalheModal(modal: Locator): Promise<DetalheAssistencia> {
  const [camposTexto, camposOcultos] = await Promise.all([
    extrairCamposTexto(modal),
    extrairCamposOcultos(modal),
  ])

  const valorTempo = parseMoeda(await lerValorBox(modal, 'valor-tempo-box'))
  const valorUsuario = parseMoeda(await lerValorBox(modal, 'valor-usuario-box'))
  const valorTotal = parseMoeda(await lerValorBox(modal, 'valor-total-footer'))

  const descricao = await modal
    .locator('[data-testid="description-container"] > div')
    .innerText()
    .catch(() => '')
  const condicaoServico = await modal
    .locator('[data-testid="event-chat-wrapper"] [class*="overflow-auto"]')
    .first()
    .innerText()
    .catch(() => '')
  const resumoProblema = await modal
    .locator('[data-testid="chat-wrapper"] [class*="overflow-auto"]')
    .first()
    .innerText()
    .catch(() => '')

  return {
    assistencia: camposTexto['Assistência'] || camposOcultos['assistencia'] || null,
    cliente: camposTexto['Cliente'] || camposOcultos['clientecorporativo'] || null,
    segmento: camposTexto['Segmento'] || null,
    segurado: camposTexto['Segurado'] || camposOcultos['nometitular'] || null,
    contato: camposTexto['Contato'] || camposOcultos['nomesolicitante'] || null,
    telefone: camposTexto['Telefone'] || null,
    valorTempo,
    valorUsuario,
    valorTotal,
    tipoAcionamento: camposOcultos['tipoacionamento'] || null,
    nomeServico: camposOcultos['nomeservico'] || camposTexto['Nome da cobertura'] || null,
    descricao: descricao.trim() || null,
    dataAbertura: parseDataHora(camposTexto['Data de abertura']),
    previsaoInicio: parseDataHora(camposOcultos['dataprevisaoini']) ?? parseDataHora(camposTexto['Previsão início']),
    previsaoFim: parseDataHora(camposOcultos['dataprevisaofim']) ?? parseDataHora(camposTexto['Previsão fim']),
    dataAceite: parseDataHora(camposOcultos['dataAceite']),
    enderecoOrigem: parseEnderecoJson(camposOcultos['enderecoOrigem']),
    enderecoDestino: parseEnderecoJson(camposOcultos['enderecoDestino']),
    condicaoServico: condicaoServico.trim() || null,
    resumoProblema: resumoProblema.trim() || null,
    camposTexto,
    camposOcultos,
  }
}

/**
 * Abre o modal "Detalhes da assistência" clicando no id da OS, extrai os
 * campos e fecha de novo. O botão de fechar do modal tem a MESMA estrutura
 * DOM do popup pós-login (SELETORES.botaoFecharPopup), que fica registrado
 * a sessão inteira via addLocatorHandler — sem desligar esse handler
 * temporariamente, o Playwright fecharia esse modal sozinho antes da
 * extração rodar. Por isso remove o handler antes de abrir e registra de
 * novo (em finally) antes de voltar pro loop de linhas.
 */
async function abrirDetalheOs(page: Page, linha: Locator): Promise<DetalheAssistencia | null> {
  try {
    await page.removeLocatorHandler(page.locator(SELETORES.botaoFecharPopup)).catch(() => null)

    // O handler de clique real fica nos span.cursor-pointer de dentro (ícone
    // + texto do id), não no span "wrapper" que os envolve — clicar no
    // wrapper não dispara o handler do filho (bubbling só sobe, não desce).
    const primeiraCelula = linha.locator(':scope > td').first()
    const spanComCursor = primeiraCelula.locator('span.cursor-pointer')
    const spanClicavel = (await spanComCursor.count()) > 0
      ? spanComCursor.last()
      : primeiraCelula.locator('div > span').first()
    await spanClicavel.click({ timeout: 10_000 })

    const modal = page.locator(SELETORES.overlayModal)
    await modal.waitFor({ timeout: 10_000 })
    await page.waitForTimeout(500)

    const detalhe = await extrairDetalheModal(modal)

    await page.locator(SELETORES.botaoFecharPopup).click({ timeout: 5_000 }).catch(() => null)
    await modal.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => null)

    return detalhe
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[Scraper]   ! Falha ao abrir/ler o detalhe de uma OS: ${msg}`)
    return null
  } finally {
    await registrarFechamentoDoPopup(page)
  }
}

/**
 * A tabela de cada aba fica dentro de um container com altura fixa
 * (max-h-[40vh]) e overflow-auto — suspeita de paginação/virtualização
 * (algumas abas pararam exatamente em 50 linhas, um número redondo demais
 * pra ser coincidência, mesmo tendo mais itens que isso pela contagem do
 * chip). Rola esse container até o fim repetidamente, recontando linhas a
 * cada passo, até a contagem parar de crescer — se não houver paginação de
 * verdade, isso só roda 1-2 vezes sem efeito nenhum.
 */
async function carregarTodasAsLinhas(page: Page, painel: Locator): Promise<void> {
  const areaComScroll = painel.locator('.overflow-auto').first()
  if (await areaComScroll.count() === 0) return

  let anterior = -1
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const atual = await painel.locator(SELETORES.linhaOs).count()
    if (atual === anterior) break
    anterior = atual
    await areaComScroll.evaluate((el) => { el.scrollTop = el.scrollHeight }).catch(() => null)
    await page.waitForTimeout(250)
  }
}

async function processarAba(page: Page, aba: AbaConfig): Promise<OsColetada[]> {
  const painel = page.locator(aba.painel)
  let linhas = await painel.locator(SELETORES.linhaOs).all()

  if (linhas.length === 0) {
    // O chip (ícone + "Nome (N)") funciona como um toggle: quando a lista
    // está recolhida (ícone eye-off) a <table> nem existe no DOM ainda. Se
    // achar o chip dentro do painel, clica pra expandir e tenta de novo antes
    // de assumir que a aba realmente está vazia.
    const chip = painel.locator('div.cursor-pointer').first()
    if (await chip.count() > 0) {
      console.log(`[Scraper] Aba "${aba.nome}": lista recolhida — clicando no chip pra expandir...`)
      await chip.click().catch(() => null)
      await painel.locator(SELETORES.linhaOs).first().waitFor({ state: 'attached', timeout: 10_000 }).catch(() => null)
    }
  }

  await carregarTodasAsLinhas(page, painel)
  linhas = await painel.locator(SELETORES.linhaOs).all()

  if (linhas.length === 0) {
    // Aba sem itens no momento (contagem 0 no chip) — comportamento esperado.
    console.log(`[Scraper] Aba "${aba.nome}": nenhuma linha encontrada`)
    return []
  }

  console.log(`[Scraper] Aba "${aba.nome}": ${linhas.length} linha(s) encontrada(s)`)
  logger.info(`Aba "${aba.nome}" processada`, { aba: aba.nome, linhas: linhas.length })
  const coletadas: OsColetada[] = []
  let avisoColunasJaEmitido = false

  for (const linha of linhas) {
    const textos = await linha.locator(':scope > td').allInnerTexts()

    if (textos.length !== aba.colunas.length && !avisoColunasJaEmitido) {
      avisoColunasJaEmitido = true
      console.warn(
        `[Scraper] Aba "${aba.nome}": esperava ${aba.colunas.length} coluna(s) (${aba.colunas.join(', ')}), encontrou ${textos.length}. Valores da 1ª linha com mismatch: ${JSON.stringify(textos)}`,
      )
    }

    const dadosLinha: Record<string, string> = {}
    aba.colunas.forEach((campo, idx) => {
      dadosLinha[campo] = (textos[idx] ?? '').trim()
    })

    const { idOsFornecedor, descricaoServico } = parseServico(dadosLinha['servico'] ?? '')
    delete dadosLinha['servico']
    dadosLinha['idOsFornecedor'] = idOsFornecedor
    dadosLinha['descricaoServico'] = descricaoServico

    if (dadosLinha['status']) {
      const { status, statusDetalhe } = parseStatus(dadosLinha['status'])
      dadosLinha['status'] = status
      if (statusDetalhe) dadosLinha['statusDetalhe'] = statusDetalhe
    }

    if (!idOsFornecedor) continue

    const os: OsColetada = { numeroOs: idOsFornecedor, dadosLinha, divOrigem: aba.nome }

    // Modal de detalhe é o que alimenta o payload canônico (canonico.ts) — sem
    // ele a OS nunca chega ao Gateway/Firestore. Antes só abria pra aba
    // "novos"; qualquer OS nova ou que mudou de status (em qualquer aba)
    // também precisa, senão fica presa só no MySQL local.
    if (await precisaSincronizar(os.numeroOs, aba.nome)) {
      const detalhe = await abrirDetalheOs(page, linha)
      if (detalhe) os.detalheAssistencia = detalhe
    }

    coletadas.push(os)
  }

  return coletadas
}

export async function executarAutomacao(): Promise<ResultadoExecucao> {
  let browser: Browser | null = null
  let context: BrowserContext | null = null

  try {
    browser = await chromium.launch({ headless: HEADLESS, args: ['--mute-audio'] })
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()
    await registrarFechamentoDoPopup(page)

    const abas = await carregarAbas()
    if (abas.length === 0) {
      throw new Error('Nenhuma aba ativa em aba_config — nada para coletar. Confira a tabela no banco.')
    }

    await fazerLogin(page)
    await navegarParaPortal(page)
    await abrirTelaOrdens(page, abas[0].painel)

    const erros: string[] = []
    const coletadas: OsColetada[] = []

    for (const aba of abas) {
      const dasAba = await processarAba(page, aba).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err)
        erros.push(`Aba "${aba.nome}": ${msg}`)
        console.error(`[Scraper]   ! Erro: ${msg}`)
        logger.error(`Erro ao processar aba "${aba.nome}"`, { aba: aba.nome, erro: msg })
        return []
      })
      coletadas.push(...dasAba)
    }

    let novas = 0
    let atualizadas = 0
    for (const os of coletadas) {
      const resultado = await salvarOs(os)
      if (resultado === 'novo') novas++
      else if (resultado === 'atualizado') atualizadas++

      if (os.detalheAssistencia) {
        await salvarDetalheAssistencia(os.numeroOs, os.detalheAssistencia).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err)
          erros.push(`Detalhe da OS ${os.numeroOs}: ${msg}`)
          console.error(`[Scraper]   ! Erro ao salvar detalhe da OS ${os.numeroOs}: ${msg}`)
        })

        const payloadCanonico = mapearParaCanonico(os.numeroOs, os.divOrigem, os.detalheAssistencia)
        if (payloadCanonico) {
          const resultadoEnvio = await enviarParaGateway(payloadCanonico)
          if (resultadoEnvio === 'erro') {
            erros.push(`Envio ao Gateway da OS ${os.numeroOs}: falhou`)
            logger.error('Falha ao sincronizar OS com o Gateway', { numeroOs: os.numeroOs, aba: os.divOrigem })
          } else {
            logger.info('OS sincronizada com o Gateway', { numeroOs: os.numeroOs, aba: os.divOrigem, resultado: resultadoEnvio })
            await marcarSincronizadoFirebase(os.numeroOs).catch((err) => {
              const msg = err instanceof Error ? err.message : String(err)
              console.error(`[Scraper]   ! Erro ao marcar OS ${os.numeroOs} como sincronizada: ${msg}`)
            })
          }
        }
      }
    }

    console.log(`[Scraper] Concluído: ${coletadas.length} OS(s) encontradas, ${novas} nova(s), ${atualizadas} atualizada(s)`)
    logger.info('Coleta concluída', { totalColetadas: coletadas.length, novas, atualizadas })

    await processarFilaAcoes(page).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      erros.push(`Fila de ações: ${msg}`)
      console.error(`[Scraper]   ! Erro ao processar fila de ações: ${msg}`)
    })

    return {
      osColetadas: novas,
      osAtualizadas: atualizadas,
      erros,
      status: erros.length > 0 && novas === 0 && atualizadas === 0 ? 'erro' : 'sucesso',
    }
  } finally {
    await context?.close()
    await browser?.close()
  }
}
