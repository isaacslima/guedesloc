import { getAuth } from 'firebase/auth'
import { chamarGateway, GATEWAY_URL } from '@/lib/gateway'

export interface StatusGoogle {
  googleConfigurado: boolean
  conectado: boolean
}

export interface ContatoGoogle {
  resourceName: string
  nome: string
  telefones: string[]
  emails: string[]
}

export function useGoogleContatos() {
  const buscarStatus = () => chamarGateway<StatusGoogle>('/api/v1/prestadores/google/status')

  const buscarContatos = () =>
    chamarGateway<{ sucesso: boolean; contatos: ContatoGoogle[] }>('/api/v1/prestadores/google/contatos')

  /**
   * Navegação de página inteira pra tela de consentimento do Google — não
   * dá pra fazer isso via fetch (precisa da página real do Google), então o
   * ID token vai por query string em vez do header Authorization de
   * `chamarGateway`.
   */
  const conectarGoogle = async () => {
    const usuario = getAuth().currentUser
    if (!usuario) throw new Error('Usuário não autenticado.')
    const token = await usuario.getIdToken()
    window.location.href = `${GATEWAY_URL}/api/v1/prestadores/google/conectar?token=${encodeURIComponent(token)}`
  }

  return { buscarStatus, buscarContatos, conectarGoogle }
}
