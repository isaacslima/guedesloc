import { ref } from 'vue'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Integradora, IntegradoraInput, StatusIntegradora } from '@/types/integracao'

const integradoras = ref<Integradora[]>([])
let initialized = false

export function useIntegradoras() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'integradoras'), orderBy('nome', 'asc'))
    onSnapshot(q, (snap) => {
      integradoras.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          nome: data.nome ?? '',
          codigo: data.codigo ?? '',
          tipoIntegracao: data.tipoIntegracao ?? 'API',
          status: data.status ?? 'homologacao',
          secretRef: data.secretRef ?? undefined,
          endpointUrl: data.endpointUrl ?? undefined,
          slaMinutos: data.slaMinutos ?? 30,
          criadoEm: data.criadoEm instanceof Timestamp
            ? data.criadoEm.toDate().toISOString()
            : data.criadoEm ?? new Date().toISOString(),
          atualizadoEm: data.atualizadoEm instanceof Timestamp
            ? data.atualizadoEm.toDate().toISOString()
            : data.atualizadoEm ?? new Date().toISOString(),
          ultimaSincronizacaoSucesso: data.ultimaSincronizacaoSucesso instanceof Timestamp
            ? data.ultimaSincronizacaoSucesso.toDate().toISOString()
            : data.ultimaSincronizacaoSucesso ?? undefined,
          ultimaSincronizacaoFalha: data.ultimaSincronizacaoFalha instanceof Timestamp
            ? data.ultimaSincronizacaoFalha.toDate().toISOString()
            : data.ultimaSincronizacaoFalha ?? undefined,
          mensagemUltimoErro: data.mensagemUltimoErro ?? undefined,
        } as Integradora
      })
    })
  }

  const addIntegradora = async (input: IntegradoraInput) => {
    const cleanInput = Object.fromEntries(Object.entries(input).filter(([_, v]) => v !== undefined))
    await addDoc(collection(db, 'integradoras'), {
      ...cleanInput,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  }

  const updateIntegradora = async (id: string, input: Partial<IntegradoraInput>) => {
    const cleanInput = Object.fromEntries(Object.entries(input).filter(([_, v]) => v !== undefined))
    await updateDoc(doc(db, 'integradoras', id), {
      ...cleanInput,
      atualizadoEm: serverTimestamp(),
    })
  }

  const toggleStatusIntegradora = async (id: string, status: StatusIntegradora) => {
    await updateDoc(doc(db, 'integradoras', id), {
      status,
      atualizadoEm: serverTimestamp(),
    })
  }

  const deleteIntegradora = async (id: string) => {
    await deleteDoc(doc(db, 'integradoras', id))
  }

  return {
    integradoras,
    addIntegradora,
    updateIntegradora,
    toggleStatusIntegradora,
    deleteIntegradora,
  }
}
