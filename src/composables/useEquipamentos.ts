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
import type { Equipamento, EquipamentoInput } from '@/types'

const equipamentos = ref<Equipamento[]>([])
let initialized = false

export function useEquipamentos() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'equipamentos'), orderBy('criadoEm', 'desc'))
    onSnapshot(q, (snap) => {
      equipamentos.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          nome: data.nome ?? '',
          tipo: data.tipo ?? '',
          marca: data.marca ?? '',
          modelo: data.modelo ?? '',
          numeroDeSerie: data.numeroDeSerie ?? '',
          clienteId: data.clienteId ?? undefined,
          clienteNome: data.clienteNome ?? undefined,
          status: data.status ?? 'disponivel',
          criadoEm: data.criadoEm instanceof Timestamp
            ? data.criadoEm.toDate().toISOString()
            : data.criadoEm ?? new Date().toISOString(),
        } as Equipamento
      })
    })
  }

  const addEquipamento = async (input: EquipamentoInput) => {
    await addDoc(collection(db, 'equipamentos'), {
      ...input,
      criadoEm: serverTimestamp(),
    })
  }

  const updateEquipamento = async (id: string, input: Partial<EquipamentoInput>) => {
    await updateDoc(doc(db, 'equipamentos', id), { ...input })
  }

  const deleteEquipamento = async (id: string) => {
    await deleteDoc(doc(db, 'equipamentos', id))
  }

  return { equipamentos, addEquipamento, updateEquipamento, deleteEquipamento }
}
