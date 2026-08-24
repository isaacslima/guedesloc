import { getAuth } from 'firebase/auth'

/**
 * Primeira vez que o front chama o Gateway direto (backlog Fase 4, Card
 * 11.1) — até aqui tudo era leitura via SDK do Firestore. Autentica com o
 * ID token do Firebase (validado no Gateway por `firebaseAuthMiddleware`).
 */
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8080'

export async function chamarGateway<T>(caminho: string, opcoes: { method?: string; body?: unknown } = {}): Promise<T> {
  const usuario = getAuth().currentUser
  if (!usuario) throw new Error('Usuário não autenticado.')
  const token = await usuario.getIdToken()

  const resposta = await fetch(`${GATEWAY_URL}${caminho}`, {
    method: opcoes.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  })

  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Gateway retornou ${resposta.status}`)
  }
  return dados as T
}
