import { ref } from 'vue'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ConfiguracoesOperacionais {
  /** Prazo padrão de retirada, em dias corridos após a entrega (Backlog Fase 6, Card 13.2). */
  slaRetiradaDiasPadrao: number
}

export const CONFIG_OPERACIONAL_PADRAO: ConfiguracoesOperacionais = {
  slaRetiradaDiasPadrao: 5,
}

const config = ref<ConfiguracoesOperacionais>(CONFIG_OPERACIONAL_PADRAO)
let initialized = false
const CONFIG_REF = doc(db, 'configuracoes', 'operacional')

export function useConfiguracoesOperacionais() {
  if (!initialized) {
    initialized = true
    onSnapshot(CONFIG_REF, (snap) => {
      if (!snap.exists()) return
      config.value = { ...CONFIG_OPERACIONAL_PADRAO, ...snap.data() }
    })
  }

  const salvarConfig = (novo: Partial<ConfiguracoesOperacionais>) =>
    setDoc(CONFIG_REF, { ...config.value, ...novo }, { merge: true })

  return { config, salvarConfig }
}
