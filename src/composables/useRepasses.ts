import { ref } from 'vue'
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Repasse } from '@/types/financeiro'
import type { OrdemUnificada } from '@/types/ordem'
import type { Prestador } from '@/types'
import type { Recebivel } from '@/types/financeiro'

const repasses = ref<Repasse[]>([])
let initialized = false

function paraISO(valor: unknown): string | undefined {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

export function useRepasses() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'repasses'), orderBy('dataFinalizacao', 'desc'))
    onSnapshot(q, (snap) => {
      repasses.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          osId: data.osId ?? d.id,
          osNumero: data.osNumero ?? '',
          prestadorId: data.prestadorId ?? '',
          prestadorNome: data.prestadorNome ?? '',
          regraTipo: data.regraTipo ?? undefined,
          regraValor: typeof data.regraValor === 'number' ? data.regraValor : undefined,
          valorDevido: typeof data.valorDevido === 'number' ? data.valorDevido : 0,
          status: data.status ?? 'pendente',
          loteId: data.loteId ?? undefined,
          dataFinalizacao: paraISO(data.dataFinalizacao) ?? new Date().toISOString(),
          criadoEm: paraISO(data.criadoEm) ?? new Date().toISOString(),
        } as Repasse
      })
    })
  }

  /**
   * Gera os repasses que ainda faltam (Card 6.1/6.2) — uma OS finalizada
   * com prestador atribuído gera um repasse calculado pela regra cadastrada
   * do prestador (valor fixo ou percentual sobre o valor esperado do
   * recebível da mesma OS). Sem regra cadastrada, gera mesmo assim com
   * `status: 'sem_regra'` e valor zero, pra aparecer sinalizado na tela em
   * vez de sumir silenciosamente.
   */
  const sincronizarPendentes = async (ordens: OrdemUnificada[], prestadores: Prestador[], recebiveisAtuais: Recebivel[]): Promise<number> => {
    const finalizadas = ordens.filter((o) => o.etapa === 'finalizada' && o.prestadoresIds[0])
    const existentesSnap = await getDocs(collection(db, 'repasses'))
    const existentesIds = new Set(existentesSnap.docs.map((d) => d.id))
    const faltando = finalizadas.filter((o) => !existentesIds.has(o.id))

    for (const os of faltando) {
      const prestadorId = os.prestadoresIds[0]!
      const prestador = prestadores.find((p) => p.id === prestadorId)
      const regra = prestador?.regraRepasse
      const dataFinalizacao = os.datas.conclusao ?? os.datas.retiradaReal ?? new Date().toISOString()
      const recebivel = recebiveisAtuais.find((r) => r.osId === os.id)

      let valorDevido = 0
      let status: Repasse['status'] = 'sem_regra'
      if (regra) {
        if (regra.tipo === 'valor_fixo') {
          valorDevido = regra.valor
        } else {
          const base = recebivel?.valorEsperado ?? 0
          valorDevido = (base * regra.valor) / 100
        }
        status = 'pendente'
      }

      await setDoc(doc(db, 'repasses', os.id), {
        osId: os.id,
        osNumero: os.numero,
        prestadorId,
        prestadorNome: os.prestadoresNomes[0] ?? prestador?.nome ?? '',
        regraTipo: regra?.tipo ?? null,
        regraValor: regra?.valor ?? null,
        valorDevido,
        status,
        dataFinalizacao,
        criadoEm: serverTimestamp(),
      })
    }
    return faltando.length
  }

  return { repasses, sincronizarPendentes }
}

export async function marcarRepassesEmLote(repasseIds: string[], loteId: string) {
  for (const id of repasseIds) {
    await updateDoc(doc(db, 'repasses', id), { status: 'em_lote', loteId })
  }
}

export async function marcarRepassesPagos(repasseIds: string[]) {
  for (const id of repasseIds) {
    await updateDoc(doc(db, 'repasses', id), { status: 'pago' })
  }
}
