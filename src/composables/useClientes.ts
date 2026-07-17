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
import type { Cliente, ClienteInput } from '@/types'

const clientes = ref<Cliente[]>([])
let initialized = false

export function useClientes() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'clientes'), orderBy('criadoEm', 'desc'))
    onSnapshot(q, (snap) => {
      clientes.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          nome: data.nome ?? '',
          cnpj: data.cnpj ?? '',
          telefone: data.telefone ?? '',
          email: data.email ?? '',
          endereco: data.endereco ?? '',
          cidade: data.cidade ?? '',
          status: data.status ?? 'ativo',
          criadoEm: data.criadoEm instanceof Timestamp
            ? data.criadoEm.toDate().toISOString()
            : data.criadoEm ?? new Date().toISOString(),
        } as Cliente
      })
    })
  }

  const addCliente = async (input: ClienteInput) => {
    await addDoc(collection(db, 'clientes'), {
      ...input,
      criadoEm: serverTimestamp(),
    })
  }

  const updateCliente = async (id: string, input: Partial<ClienteInput>) => {
    await updateDoc(doc(db, 'clientes', id), { ...input })
  }

  const deleteCliente = async (id: string) => {
    await deleteDoc(doc(db, 'clientes', id))
  }

  return { clientes, addCliente, updateCliente, deleteCliente }
}
