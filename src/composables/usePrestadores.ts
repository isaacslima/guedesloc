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
import type { Prestador, PrestadorInput } from '@/types'

const prestadores = ref<Prestador[]>([])
let initialized = false

export function usePrestadores() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'prestadores'), orderBy('criadoEm', 'desc'))
    onSnapshot(q, (snap) => {
      prestadores.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          nome: data.nome ?? '',
          especialidade: data.especialidade ?? '',
          telefone: data.telefone ?? '',
          email: data.email ?? '',
          cpf: data.cpf ?? '',
          status: data.status ?? 'ativo',
          criadoEm: data.criadoEm instanceof Timestamp
            ? data.criadoEm.toDate().toISOString()
            : data.criadoEm ?? new Date().toISOString(),
        } as Prestador
      })
    })
  }

  const addPrestador = async (input: PrestadorInput) => {
    const cleanInput = Object.fromEntries(Object.entries(input).filter(([_, v]) => v !== undefined))
    await addDoc(collection(db, 'prestadores'), {
      ...cleanInput,
      criadoEm: serverTimestamp(),
    })
  }

  const updatePrestador = async (id: string, input: Partial<PrestadorInput>) => {
    const cleanInput = Object.fromEntries(Object.entries(input).filter(([_, v]) => v !== undefined))
    await updateDoc(doc(db, 'prestadores', id), cleanInput)
  }

  const deletePrestador = async (id: string) => {
    await deleteDoc(doc(db, 'prestadores', id))
  }

  return { prestadores, addPrestador, updatePrestador, deletePrestador }
}
