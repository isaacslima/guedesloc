// Cliente Z-API (backlog Fase 4, Card 11.1). Credenciais só existem aqui no
// servidor — nunca chegam ao front. Sem credencial configurada, o envio é
// simulado (não chama a Z-API de verdade, mas o resto do fluxo — persistir
// mensagem, aparecer na inbox — funciona igual, pra dar pra testar sem
// conta Z-API criada ainda). Ver docs: https://developer.z-api.io

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID
const ZAPI_TOKEN = process.env.ZAPI_TOKEN
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN // token de segurança da conta (opcional, header "Client-Token")

export const zapiConfigurado = Boolean(ZAPI_INSTANCE_ID && ZAPI_TOKEN)

export interface ResultadoEnvioZapi {
  simulado: boolean
  sucesso: boolean
  messageId?: string
  erro?: string
}

export async function enviarTextoZapi(telefone: string, texto: string): Promise<ResultadoEnvioZapi> {
  if (!zapiConfigurado) {
    return { simulado: true, sucesso: true, messageId: `simulado_${Date.now()}` }
  }

  try {
    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN

    const resposta = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: telefone, message: texto }),
    })
    const corpo = (await resposta.json().catch(() => ({}))) as Record<string, unknown>

    if (!resposta.ok) {
      return { simulado: false, sucesso: false, erro: `HTTP ${resposta.status}: ${JSON.stringify(corpo)}` }
    }

    return { simulado: false, sucesso: true, messageId: (corpo.messageId as string) ?? (corpo.zaapId as string) ?? undefined }
  } catch (err) {
    return { simulado: false, sucesso: false, erro: err instanceof Error ? err.message : String(err) }
  }
}
