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
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { OrdemDeServico, OrdemDeServicoInput } from '@/types'

const ordens = ref<OrdemDeServico[]>([])
let initialized = false

async function gerarNumeroOS(): Promise<string> {
  const ano = new Date().getFullYear()
  const snap = await getDocs(collection(db, 'ordens'))
  let maxNum = 0
  snap.docs.forEach((d) => {
    const num = d.data().numero as string | undefined
    if (num) {
      const parts = num.split('-')
      const n = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(n) && n > maxNum) maxNum = n
    }
  })
  const next = String(maxNum + 1).padStart(3, '0')
  return `OS-${ano}-${next}`
}

export function useOrdens() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'ordens'), orderBy('dataCriacao', 'desc'))
    onSnapshot(q, (snap) => {
      ordens.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          numero: data.numero ?? '',
          tipo: data.tipo ?? 'corretiva',
          status: data.status ?? 'aberta',
          clienteId: data.clienteId ?? '',
          clienteNome: data.clienteNome ?? '',
          equipamentoId: data.equipamentoId ?? undefined,
          equipamentoNome: data.equipamentoNome ?? undefined,
          prestadoresIds: data.prestadoresIds ?? [],
          prestadoresNomes: data.prestadoresNomes ?? [],
          descricao: data.descricao ?? '',
          observacoes: data.observacoes ?? undefined,
          dataCriacao: data.dataCriacao instanceof Timestamp
            ? data.dataCriacao.toDate().toISOString()
            : data.dataCriacao ?? new Date().toISOString(),
          dataAgendamento: data.dataAgendamento instanceof Timestamp
            ? data.dataAgendamento.toDate().toISOString()
            : data.dataAgendamento ?? undefined,
        } as OrdemDeServico
      })
    })
  }

  const addOrdem = async (input: OrdemDeServicoInput) => {
    const numero = await gerarNumeroOS()
    await addDoc(collection(db, 'ordens'), {
      ...input,
      numero,
      dataCriacao: serverTimestamp(),
    })
  }

  const updateOrdem = async (id: string, input: Partial<OrdemDeServicoInput>) => {
    await updateDoc(doc(db, 'ordens', id), { ...input })
  }

  const deleteOrdem = async (id: string) => {
    await deleteDoc(doc(db, 'ordens', id))
  }

  return { ordens, addOrdem, updateOrdem, deleteOrdem }
}
