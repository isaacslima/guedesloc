import { ref } from 'vue'
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buscarPrecoVigente } from './usePrecos'
import type { Recebivel } from '@/types/financeiro'
import type { OrdemUnificada } from '@/types/ordem'

const recebiveis = ref<Recebivel[]>([])
let initialized = false

function paraISO(valor: unknown): string | undefined {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

export function useRecebiveis() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'recebiveis'), orderBy('dataFinalizacao', 'desc'))
    onSnapshot(q, (snap) => {
      recebiveis.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          osId: data.osId ?? d.id,
          osNumero: data.osNumero ?? '',
          seguradoraId: data.seguradoraId ?? undefined,
          seguradoraNome: data.seguradoraNome ?? undefined,
          servicoTipo: data.servicoTipo ?? '',
          cidade: data.cidade ?? undefined,
          valorEsperado: typeof data.valorEsperado === 'number' ? data.valorEsperado : null,
          valorConfirmado: typeof data.valorConfirmado === 'number' ? data.valorConfirmado : undefined,
          status: data.status ?? 'pendente',
          dataFinalizacao: paraISO(data.dataFinalizacao) ?? new Date().toISOString(),
          dataConciliacao: paraISO(data.dataConciliacao),
          observacaoConciliacao: data.observacaoConciliacao ?? undefined,
          criadoEm: paraISO(data.criadoEm) ?? new Date().toISOString(),
        } as Recebivel
      })
    })
  }

  /**
   * Gera os lançamentos "a receber" que ainda faltam (Card 5.2) — toda OS
   * finalizada precisa de um, gerado de forma idempotente (id = osId) pra
   * poder rodar quantas vezes quiser sem duplicar. Cobre OS finalizadas por
   * qualquer caminho (Kanban manual, confirmação de retirada da Fase 6).
   */
  const sincronizarPendentes = async (ordens: OrdemUnificada[]): Promise<number> => {
    const finalizadas = ordens.filter((o) => o.etapa === 'finalizada')
    const existentesSnap = await getDocs(collection(db, 'recebiveis'))
    const existentesIds = new Set(existentesSnap.docs.map((d) => d.id))
    const faltando = finalizadas.filter((o) => !existentesIds.has(o.id))

    for (const os of faltando) {
      const dataFinalizacao = os.datas.conclusao ?? os.datas.retiradaReal ?? new Date().toISOString()
      const valorEsperado = os.seguradoraId
        ? await buscarPrecoVigente(os.seguradoraId, os.servico.tipo, dataFinalizacao)
        : null
      await setDoc(doc(db, 'recebiveis', os.id), {
        osId: os.id,
        osNumero: os.numero,
        seguradoraId: os.seguradoraId ?? null,
        seguradoraNome: os.seguradoraNome ?? null,
        servicoTipo: os.servico.tipo,
        cidade: os.cliente.endereco.cidade ?? null,
        valorEsperado,
        status: 'pendente',
        dataFinalizacao,
        criadoEm: serverTimestamp(),
      })
    }
    return faltando.length
  }

  /**
   * Conciliação (Card 5.2) — registra o valor que a seguradora de fato
   * reportou/pagou e compara com o esperado (tabela de preços na data da
   * finalização). Igual = conciliado; diferente = divergente, sinalizado
   * pro time analisar manualmente.
   */
  const registrarValorConfirmado = async (recebivelId: string, valorConfirmado: number, observacao?: string) => {
    const atual = recebiveis.value.find((r) => r.id === recebivelId)
    if (!atual) return
    const diferenca = atual.valorEsperado === null ? null : Math.abs(atual.valorEsperado - valorConfirmado)
    const status = diferenca === null ? 'divergente' : diferenca < 0.01 ? 'conciliado' : 'divergente'
    await updateDoc(doc(db, 'recebiveis', recebivelId), {
      valorConfirmado,
      status,
      observacaoConciliacao: observacao ?? null,
      dataConciliacao: new Date().toISOString(),
    })
  }

  return { recebiveis, sincronizarPendentes, registrarValorConfirmado }
}
