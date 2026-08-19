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
        // Compatibilidade com cadastros antigos (status: ativo/inativo, sem
        // situacao) — migração leve na leitura, sem precisar de script
        // (backlog Fase 3, Card 10.1).
        const situacao = data.situacao ?? (data.status === 'inativo' ? 'bloqueado' : 'ativo')
        return {
          id: d.id,
          nome: data.nome ?? '',
          especialidade: data.especialidade ?? undefined,
          telefone: data.telefone ?? '',
          email: data.email ?? '',
          cpf: data.cpf ?? '',
          cidade: data.cidade ?? undefined,
          estado: data.estado ?? undefined,
          regiao: data.regiao ?? undefined,
          limiteOsPorDia: typeof data.limiteOsPorDia === 'number' ? data.limiteOsPorDia : undefined,
          observacao: data.observacao ?? undefined,
          situacao,
          cidadesAtendidas: Array.isArray(data.cidadesAtendidas) ? data.cidadesAtendidas : [],
          regraRepasse: data.regraRepasse ?? undefined,
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
