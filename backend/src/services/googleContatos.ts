// Importação de contatos do Google (backlog Fase 3, Card 10.5). Credenciais
// só existem aqui no servidor — nunca chegam ao front. O refresh_token fica
// guardado no Firestore (coleção `integracao_google`, regra `allow read,
// write: if false` — só o Admin SDK, que ignora as regras, consegue ler),
// porque só existe depois que a pessoa autoriza em tempo real via callback;
// não dá pra fornecer isso como variável de ambiente de antemão.

import { google } from 'googleapis'
import { db, FieldValue } from './firestore.js'

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI

export const googleConfigurado = Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI)

const ESCOPO_CONTATOS = 'https://www.googleapis.com/auth/contacts.readonly'
const TOKEN_DOC = db.collection('integracao_google').doc('google')

function criarOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export function gerarUrlConsentimento(): string {
  const client = criarOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // força devolver refresh_token mesmo se a pessoa já tiver autorizado antes
    scope: [ESCOPO_CONTATOS],
  })
}

export async function trocarCodePorTokens(code: string): Promise<void> {
  const client = criarOAuthClient()
  const { tokens } = await client.getToken(code)
  if (!tokens.refresh_token) {
    throw new Error('Google não devolveu refresh_token — revogar o acesso em myaccount.google.com/permissions e tentar de novo (prompt=consent só garante isso na primeira autorização).')
  }
  await TOKEN_DOC.set({ refreshToken: tokens.refresh_token, conectadoEm: FieldValue.serverTimestamp() })
}

async function buscarRefreshToken(): Promise<string | null> {
  const snap = await TOKEN_DOC.get()
  return snap.exists ? ((snap.data()?.refreshToken as string) ?? null) : null
}

export async function googleConectado(): Promise<boolean> {
  return Boolean(await buscarRefreshToken())
}

export interface ContatoGoogle {
  resourceName: string
  nome: string
  telefones: string[]
  emails: string[]
}

export async function listarContatos(): Promise<ContatoGoogle[]> {
  const refreshToken = await buscarRefreshToken()
  if (!refreshToken) throw new Error('Google não conectado — conecte antes de buscar contatos.')

  const client = criarOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })

  const people = google.people({ version: 'v1', auth: client })
  const resposta = await people.people.connections.list({
    resourceName: 'people/me',
    pageSize: 1000,
    personFields: 'names,phoneNumbers,emailAddresses',
  })

  return (resposta.data.connections ?? []).map((pessoa) => ({
    resourceName: pessoa.resourceName ?? '',
    nome: pessoa.names?.[0]?.displayName ?? '(sem nome)',
    telefones: (pessoa.phoneNumbers ?? []).map((t) => t.value ?? '').filter(Boolean),
    emails: (pessoa.emailAddresses ?? []).map((e) => e.value ?? '').filter(Boolean),
  }))
}
