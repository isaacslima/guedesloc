import { ref } from 'vue'
import { collection, addDoc, updateDoc, onSnapshot, query, orderBy, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PrecoServico, PrecoServicoInput } from '@/types/financeiro'

const precos = ref<PrecoServico[]>([])
let initialized = false

function paraISO(valor: unknown): string | undefined {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

export function usePrecos() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'precos_servico'), orderBy('vigenciaInicio', 'desc'))
    onSnapshot(q, (snap) => {
      precos.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          seguradoraId: data.seguradoraId ?? '',
          seguradoraNome: data.seguradoraNome ?? '',
          servicoTipo: data.servicoTipo ?? '',
          valor: typeof data.valor === 'number' ? data.valor : 0,
          vigenciaInicio: paraISO(data.vigenciaInicio) ?? new Date().toISOString(),
          vigenciaFim: paraISO(data.vigenciaFim),
          criadoEm: paraISO(data.criadoEm) ?? new Date().toISOString(),
        } as PrecoServico
      })
    })
  }

  /**
   * Cadastra um novo valor vigente (Card 5.1) — nunca sobrescreve: fecha a
   * vigência anterior da mesma seguradora+serviço (se houver) e abre uma
   * nova a partir de agora, preservando o histórico de reajustes.
   */
  const addPreco = async (input: PrecoServicoInput) => {
    const agora = new Date().toISOString()
    const anteriorSnap = await getDocs(
      query(collection(db, 'precos_servico'), where('seguradoraId', '==', input.seguradoraId), where('servicoTipo', '==', input.servicoTipo)),
    )
    const vigenteAnterior = anteriorSnap.docs.find((d) => !d.data().vigenciaFim)
    if (vigenteAnterior) {
      await updateDoc(vigenteAnterior.ref, { vigenciaFim: agora })
    }
    await addDoc(collection(db, 'precos_servico'), {
      ...input,
      vigenciaInicio: agora,
      criadoEm: serverTimestamp(),
    })
  }

  return { precos, addPreco }
}

/**
 * Preço vigente pra uma seguradora+serviço numa data de referência (Card
 * 5.2) — busca direta no Firestore, não depende do estado reativo do
 * composable já ter sido inicializado.
 */
export async function buscarPrecoVigente(seguradoraId: string, servicoTipo: string, dataRefIso: string): Promise<number | null> {
  const snap = await getDocs(
    query(collection(db, 'precos_servico'), where('seguradoraId', '==', seguradoraId), where('servicoTipo', '==', servicoTipo)),
  )
  const alvo = new Date(dataRefIso).getTime()
  let melhorValor: number | null = null
  let melhorInicio = -Infinity
  for (const d of snap.docs) {
    const data = d.data()
    const inicio = new Date(paraISO(data.vigenciaInicio) ?? 0).getTime()
    const fimIso = paraISO(data.vigenciaFim)
    const fim = fimIso ? new Date(fimIso).getTime() : Infinity
    if (inicio <= alvo && alvo < fim && inicio > melhorInicio) {
      melhorValor = typeof data.valor === 'number' ? data.valor : null
      melhorInicio = inicio
    }
  }
  return melhorValor
}
