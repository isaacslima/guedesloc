import { ref } from 'vue'
import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { marcarRepassesEmLote, marcarRepassesPagos } from './useRepasses'
import type { LotePagamento } from '@/types/financeiro'
import type { Repasse } from '@/types/financeiro'

const lotes = ref<LotePagamento[]>([])
let initialized = false

function paraISO(valor: unknown): string | undefined {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

export function useLotesPagamento() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'lotes_pagamento'), orderBy('criadoEm', 'desc'))
    onSnapshot(q, (snap) => {
      lotes.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          prestadorId: data.prestadorId ?? '',
          prestadorNome: data.prestadorNome ?? '',
          periodoInicio: data.periodoInicio ?? '',
          periodoFim: data.periodoFim ?? '',
          totalOS: typeof data.totalOS === 'number' ? data.totalOS : 0,
          valorTotal: typeof data.valorTotal === 'number' ? data.valorTotal : 0,
          status: data.status ?? 'gerado',
          dataPagamento: paraISO(data.dataPagamento),
          comprovanteUrl: data.comprovanteUrl ?? undefined,
          criadoEm: paraISO(data.criadoEm) ?? new Date().toISOString(),
        } as LotePagamento
      })
    })
  }

  /** Consolida repasses selecionados (mesmo prestador) num lote de pagamento (Card 6.2). */
  const gerarLote = async (prestadorId: string, prestadorNome: string, periodoInicio: string, periodoFim: string, repassesSelecionados: Repasse[]) => {
    const valorTotal = repassesSelecionados.reduce((soma, r) => soma + r.valorDevido, 0)
    const loteRef = await addDoc(collection(db, 'lotes_pagamento'), {
      prestadorId,
      prestadorNome,
      periodoInicio,
      periodoFim,
      totalOS: repassesSelecionados.length,
      valorTotal,
      status: 'gerado',
      criadoEm: serverTimestamp(),
    })
    await marcarRepassesEmLote(repassesSelecionados.map((r) => r.id), loteRef.id)
    return loteRef.id
  }

  /** Histórico e comprovante (Card 6.4) — marca o lote como pago, com comprovante opcional (link ou upload). */
  const marcarPago = async (loteId: string, repasseIds: string[], comprovanteUrl?: string) => {
    await updateDoc(doc(db, 'lotes_pagamento', loteId), {
      status: 'pago',
      dataPagamento: new Date().toISOString(),
      comprovanteUrl: comprovanteUrl ?? null,
    })
    await marcarRepassesPagos(repasseIds)
  }

  return { lotes, gerarLote, marcarPago }
}
