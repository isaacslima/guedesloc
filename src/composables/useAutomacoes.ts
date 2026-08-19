import { ref } from 'vue'
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { chamarGateway } from '@/lib/gateway'
import { AUTOMACOES_CONFIG_PADRAO, type AutomacoesConfig } from '@/types/automacao'

export interface FilaAutomacao {
  id: string
  osId: string
  numeroOs: string
  tipo: string
  situacao: 'executada' | 'simulada' | 'sugerida' | 'falha'
  prestadorNome?: string
  detalhe?: string
  criadoEm: string
}

const config = ref<AutomacoesConfig>(AUTOMACOES_CONFIG_PADRAO)
const fila = ref<FilaAutomacao[]>([])
let initialized = false

const CONFIG_REF = doc(db, 'automacoes_config', 'config')

export function useAutomacoes() {
  if (!initialized) {
    initialized = true
    onSnapshot(CONFIG_REF, (snap) => {
      if (!snap.exists()) return
      const dados = snap.data()
      config.value = {
        ...AUTOMACOES_CONFIG_PADRAO,
        ...dados,
        distribuicao: { ...AUTOMACOES_CONFIG_PADRAO.distribuicao, ...dados.distribuicao },
        confirmacaoDia: { ...AUTOMACOES_CONFIG_PADRAO.confirmacaoDia, ...dados.confirmacaoDia },
        confirmacaoEntrega: { ...AUTOMACOES_CONFIG_PADRAO.confirmacaoEntrega, ...dados.confirmacaoEntrega },
        cobrancaFoto: { ...AUTOMACOES_CONFIG_PADRAO.cobrancaFoto, ...dados.cobrancaFoto },
        cobrancaRetirada: { ...AUTOMACOES_CONFIG_PADRAO.cobrancaRetirada, ...dados.cobrancaRetirada },
      } as AutomacoesConfig
    })

    const qFila = query(collection(db, 'automacoes_fila'), orderBy('criadoEm', 'desc'), limit(100))
    onSnapshot(qFila, (snap) => {
      fila.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          osId: data.osId ?? '',
          numeroOs: data.numeroOs ?? '',
          tipo: data.tipo ?? '',
          situacao: data.situacao ?? 'executada',
          prestadorNome: data.prestadorNome ?? undefined,
          detalhe: data.detalhe ?? undefined,
          criadoEm: data.criadoEm instanceof Timestamp ? data.criadoEm.toDate().toISOString() : (data.criadoEm ?? new Date().toISOString()),
        } as FilaAutomacao
      })
    })
  }

  const salvarConfig = (novaConfig: AutomacoesConfig) => setDoc(CONFIG_REF, novaConfig, { merge: true })

  const dispararTickManual = () => chamarGateway<{ executado: boolean; motivo?: string }>('/api/v1/automacoes/tick', { method: 'POST' })

  return { config, fila, salvarConfig, dispararTickManual }
}
