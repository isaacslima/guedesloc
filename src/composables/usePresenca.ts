import { ref } from 'vue'
import { doc, setDoc, serverTimestamp, collection, onSnapshot, Timestamp } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'

const JANELA_ONLINE_MS = 2 * 60_000 // sem ping há mais de 2min = offline
const INTERVALO_PING_MS = 30_000

const ultimoPingPorUid = ref<Record<string, string>>({})
let heartbeatIniciado = false
let observacaoIniciada = false
let intervalId: ReturnType<typeof setInterval> | null = null

/** Envia o heartbeat do usuário logado a cada 30s (Card 14.2) — chamado uma vez em App.vue, sobrevive à troca de rota. */
export function iniciarHeartbeatPresenca() {
  if (heartbeatIniciado) return
  heartbeatIniciado = true

  onAuthStateChanged(auth, (fbUser) => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (!fbUser) return
    const enviar = () => setDoc(doc(db, 'presenca', fbUser.uid), { ultimoPingEm: serverTimestamp() })
    enviar()
    intervalId = setInterval(enviar, INTERVALO_PING_MS)
  })
}

function iniciarObservacaoPresenca() {
  if (observacaoIniciada) return
  observacaoIniciada = true
  onSnapshot(collection(db, 'presenca'), (snap) => {
    const novo: Record<string, string> = {}
    snap.docs.forEach((d) => {
      const data = d.data()
      novo[d.id] = data.ultimoPingEm instanceof Timestamp ? data.ultimoPingEm.toDate().toISOString() : new Date().toISOString()
    })
    ultimoPingPorUid.value = novo
  })
}

export function usePresenca() {
  iniciarObservacaoPresenca()

  const estaOnline = (uid: string): boolean => {
    const ping = ultimoPingPorUid.value[uid]
    if (!ping) return false
    return Date.now() - new Date(ping).getTime() < JANELA_ONLINE_MS
  }

  return { ultimoPingPorUid, estaOnline }
}
