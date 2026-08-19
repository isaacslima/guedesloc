import { ref } from 'vue'
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { chamarGateway } from '@/lib/gateway'

export type TipoMensagemWhatsapp = 'distribuicao' | 'confirmacao_dia' | 'confirmacao_entrega' | 'cobranca_foto' | 'cobranca_retirada' | 'livre'

export interface MensagemWhatsapp {
  id: string
  osId: string | null
  numeroOs?: string
  prestadorId?: string
  prestadorNome?: string
  prestadorTelefone: string
  direcao: 'enviada' | 'recebida'
  tipo: TipoMensagemWhatsapp
  texto: string
  status: string
  criadoEm: string
}

export interface StatusWhatsapp {
  zapiConfigurado: boolean
  webhookProtegido: boolean
  ultimoCallbackRecebidoEm: string | null
}

const mensagens = ref<MensagemWhatsapp[]>([])
let initialized = false

export function useWhatsapp() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'mensagens_whatsapp'), orderBy('criadoEm', 'desc'))
    onSnapshot(q, (snap) => {
      mensagens.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          osId: data.osId ?? null,
          numeroOs: data.numeroOs ?? undefined,
          prestadorId: data.prestadorId ?? undefined,
          prestadorNome: data.prestadorNome ?? undefined,
          prestadorTelefone: data.prestadorTelefone ?? '',
          direcao: data.direcao ?? 'enviada',
          tipo: data.tipo ?? 'livre',
          texto: data.texto ?? '',
          status: data.status ?? '',
          criadoEm: data.criadoEm instanceof Timestamp ? data.criadoEm.toDate().toISOString() : (data.criadoEm ?? new Date().toISOString()),
        } as MensagemWhatsapp
      })
    })
  }

  const enviarMensagem = (osId: string, tipo: TipoMensagemWhatsapp, prestadorId?: string) =>
    chamarGateway<{ sucesso: boolean; simulado?: boolean; mensagemId?: string; erro?: string }>('/api/v1/whatsapp/enviar', {
      method: 'POST',
      body: { osId, tipo, prestadorId },
    })

  const buscarStatus = () => chamarGateway<StatusWhatsapp>('/api/v1/whatsapp/status')

  return { mensagens, enviarMensagem, buscarStatus }
}
