import { ref } from 'vue'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { OrdemDeServicoCanonica } from '@/types/integracao'

export interface OrdemIntegrada extends OrdemDeServicoCanonica {
  id: string
}

const ordensIntegradas = ref<OrdemIntegrada[]>([])
let initialized = false

/**
 * Só leitura — quem escreve em `ordens_integradas` é exclusivamente o
 * Gateway (backend/, via firebase-admin), nunca o front. Ver backlog
 * fase-0-fundacao.md Card 3.1.
 */
export function useOrdensIntegradas() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'ordens_integradas'), orderBy('datas.criacao', 'desc'))
    onSnapshot(q, (snap) => {
      ordensIntegradas.value = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as OrdemDeServicoCanonica),
      }))
    })
  }

  return { ordensIntegradas }
}
