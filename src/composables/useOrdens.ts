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
  deleteField,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { derivarEtapaDeStatus, derivarStatusDeEtapa } from '@/lib/etapaOS'
import { useUsuarioAtual } from './useUsuarioAtual'
import { registrarAuditoria } from './useAuditoria'
import type { OrdemUnificada, OrdemUnificadaInput, HistoricoEntradaOS, OSEtapa } from '@/types/ordem'

const ordens = ref<OrdemUnificada[]>([])
let initialized = false

/**
 * Firestore rejeita `undefined` em qualquer nível (não só no topo do objeto)
 * — campos opcionais vazios (ex.: cliente sem cidade, OS sem agendamento)
 * viram `undefined` no formulário e quebravam o addDoc/updateDoc antes desta
 * limpeza ser recursiva. Preserva Timestamp/FieldValue (sentinelas do SDK,
 * não objetos literais) sem tentar recursar neles.
 */
function removerCamposIndefinidos<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.map((item) => removerCamposIndefinidos(item)) as unknown as T
  }
  if (valor !== null && typeof valor === 'object' && valor.constructor === Object) {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, removerCamposIndefinidos(v)]),
    ) as T
  }
  return valor
}

async function gerarNumeroOS(): Promise<string> {
  const ano = new Date().getFullYear()
  const snap = await getDocs(collection(db, 'ordens'))
  let maxNum = 0
  snap.docs.forEach((d) => {
    const num = d.data().numero as string | undefined
    if (num?.startsWith(`OS-${ano}-`)) {
      const n = parseInt(num.split('-').pop() ?? '', 10)
      if (!isNaN(n) && n > maxNum) maxNum = n
    }
  })
  const next = String(maxNum + 1).padStart(3, '0')
  return `OS-${ano}-${next}`
}

function paraISO(valor: unknown): string | undefined {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

export function useOrdens() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'ordens'), orderBy('datas.criacao', 'desc'))
    onSnapshot(q, (snap) => {
      ordens.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          origem: data.origem ?? 'manual',
          status: data.status ?? 'aberta',
          etapa: data.etapa ?? derivarEtapaDeStatus(data.status ?? 'aberta'),
          numero: data.numero ?? '',
          numeroOsSeguradora: data.numeroOsSeguradora ?? undefined,
          idempotencyKey: data.idempotencyKey ?? undefined,
          seguradoraId: data.seguradoraId ?? undefined,
          seguradoraNome: data.seguradoraNome ?? undefined,
          cliente: {
            nome: data.cliente?.nome ?? '',
            telefone: data.cliente?.telefone ?? undefined,
            cpfCnpj: data.cliente?.cpfCnpj ?? undefined,
            email: data.cliente?.email ?? undefined,
            endereco: {
              texto: data.cliente?.endereco?.texto ?? '',
              logradouro: data.cliente?.endereco?.logradouro ?? undefined,
              numero: data.cliente?.endereco?.numero ?? undefined,
              complemento: data.cliente?.endereco?.complemento ?? undefined,
              bairro: data.cliente?.endereco?.bairro ?? undefined,
              cidade: data.cliente?.endereco?.cidade ?? undefined,
              estado: data.cliente?.endereco?.estado ?? undefined,
              cep: data.cliente?.endereco?.cep ?? undefined,
              referencia: data.cliente?.endereco?.referencia ?? undefined,
            },
          },
          clienteId: data.clienteId ?? undefined,
          equipamentoId: data.equipamentoId ?? undefined,
          equipamentoNome: data.equipamentoNome ?? undefined,
          prestadoresIds: data.prestadoresIds ?? [],
          prestadoresNomes: data.prestadoresNomes ?? [],
          servico: {
            tipo: data.servico?.tipo ?? '',
            descricao: data.servico?.descricao ?? '',
            valor: typeof data.servico?.valor === 'number' ? data.servico.valor : undefined,
          },
          observacoes: data.observacoes ?? undefined,
          datas: {
            criacao: paraISO(data.datas?.criacao) ?? new Date().toISOString(),
            agendamento: paraISO(data.datas?.agendamento),
            entregaReal: paraISO(data.datas?.entregaReal),
            retiradaReal: paraISO(data.datas?.retiradaReal),
            conclusao: paraISO(data.datas?.conclusao),
          },
          historico: Array.isArray(data.historico) ? data.historico : [],
          camposAdicionais: data.camposAdicionais ?? undefined,
          slaRetiradaDiasOverride: typeof data.slaRetiradaDiasOverride === 'number' ? data.slaRetiradaDiasOverride : undefined,
        } as OrdemUnificada
      })
    })
  }

  const addOrdem = async (input: OrdemUnificadaInput) => {
    const numero = await gerarNumeroOS()
    const etapa = derivarEtapaDeStatus(input.status)
    const historico: HistoricoEntradaOS[] = [
      { em: new Date().toISOString(), etapaAnterior: null, etapaNova: etapa, motivo: 'Criação manual' },
    ]
    const cleanInput = removerCamposIndefinidos(input)
    await addDoc(collection(db, 'ordens'), {
      ...cleanInput,
      numero,
      etapa,
      historico,
      datas: { ...cleanInput.datas, criacao: serverTimestamp() },
    })
  }

  const updateOrdem = async (id: string, input: Partial<OrdemUnificadaInput>) => {
    const cleanInput = removerCamposIndefinidos(input)
    const atual = ordens.value.find((o) => o.id === id)
    if (input.status) {
      if (atual && atual.status !== input.status) {
        const etapaNova = derivarEtapaDeStatus(input.status)
        const novaEntrada: HistoricoEntradaOS = {
          em: new Date().toISOString(),
          etapaAnterior: atual.etapa,
          etapaNova,
          motivo: 'Alteração manual de status',
        }
        await updateDoc(doc(db, 'ordens', id), {
          ...cleanInput,
          etapa: etapaNova,
          historico: [...atual.historico, novaEntrada],
        })
        registrarAuditoria({
          tipo: 'edicao_os',
          descricao: 'OS editada (status alterado manualmente)',
          usuarioUid: useUsuarioAtual().usuarioAtual.value?.uid ?? '',
          usuarioNome: useUsuarioAtual().usuarioAtual.value?.nome ?? '',
          entidadeTipo: 'os',
          entidadeId: id,
          entidadeLabel: atual.numero,
        }).catch(() => {})
        return
      }
    }
    await updateDoc(doc(db, 'ordens', id), cleanInput)
    registrarAuditoria({
      tipo: 'edicao_os',
      descricao: 'OS editada',
      usuarioUid: useUsuarioAtual().usuarioAtual.value?.uid ?? '',
      usuarioNome: useUsuarioAtual().usuarioAtual.value?.nome ?? '',
      entidadeTipo: 'os',
      entidadeId: id,
      entidadeLabel: atual?.numero,
    }).catch(() => {})
  }

  const deleteOrdem = async (id: string) => {
    await deleteDoc(doc(db, 'ordens', id))
  }

  /** Atribuição manual de prestador (backlog Fase 3, Card 10.3). */
  const atribuirPrestador = async (osId: string, prestadorId: string, prestadorNome: string) => {
    const atual = ordens.value.find((o) => o.id === osId)
    if (!atual) return
    const etapaNova = 'distribuindo_aguardando_resposta' as const
    const novaEntrada: HistoricoEntradaOS = {
      em: new Date().toISOString(),
      etapaAnterior: atual.etapa,
      etapaNova,
      motivo: `Distribuição manual para ${prestadorNome}`,
    }
    await updateDoc(doc(db, 'ordens', osId), {
      prestadoresIds: [prestadorId],
      prestadoresNomes: [prestadorNome],
      etapa: etapaNova,
      historico: [...atual.historico, novaEntrada],
    })
  }

  /**
   * Registro manual de aceite/recusa do prestador (Card 10.3) — enquanto não
   * existe WhatsApp bidirecional (Fase 4) pra capturar a resposta sozinho.
   */
  const registrarRespostaDistribuicao = async (osId: string, aceitou: boolean) => {
    const atual = ordens.value.find((o) => o.id === osId)
    if (!atual) return
    const etapaNova = aceitou ? 'confirmada_aguardando_dia' as const : 'aguardando_distribuicao' as const
    const novaEntrada: HistoricoEntradaOS = {
      em: new Date().toISOString(),
      etapaAnterior: atual.etapa,
      etapaNova,
      motivo: aceitou ? 'Prestador aceitou (registro manual)' : 'Prestador recusou — devolvida pra distribuição (registro manual)',
    }
    const dadosAtualizados: Record<string, unknown> = { etapa: etapaNova, historico: [...atual.historico, novaEntrada] }
    if (!aceitou) {
      dadosAtualizados.prestadoresIds = []
      dadosAtualizados.prestadoresNomes = []
    }
    await updateDoc(doc(db, 'ordens', osId), dadosAtualizados)
  }

  /**
   * Mudança manual de etapa pelo kanban (Card 9.7) — motivo é obrigatório
   * (bloqueado na UI, reforçado aqui) e sempre gera entrada em historico[].
   */
  const moverEtapaManual = async (osId: string, etapaNova: OSEtapa, motivo: string) => {
    if (!motivo.trim()) throw new Error('Motivo é obrigatório pra mudar a etapa manualmente.')
    const atual = ordens.value.find((o) => o.id === osId)
    if (!atual) return
    const novaEntrada: HistoricoEntradaOS = {
      em: new Date().toISOString(),
      etapaAnterior: atual.etapa,
      etapaNova,
      motivo,
    }
    await updateDoc(doc(db, 'ordens', osId), {
      etapa: etapaNova,
      status: derivarStatusDeEtapa(etapaNova),
      historico: [...atual.historico, novaEntrada],
    })
  }

  /**
   * Confirmação real de entrega (Backlog Fase 6, Card 13.1) — só quem grava
   * `datas.entregaReal`. Move a etapa pra "Entregue / Aguardando foto",
   * de onde a cobrança automática de foto (Card 12.5) assume.
   */
  const confirmarEntrega = async (osId: string, quandoIso?: string) => {
    const atual = ordens.value.find((o) => o.id === osId)
    if (!atual) return
    const quando = quandoIso ?? new Date().toISOString()
    const etapaNova = 'entregue_aguardando_foto' as const
    const novaEntrada: HistoricoEntradaOS = {
      em: new Date().toISOString(),
      etapaAnterior: atual.etapa,
      etapaNova,
      motivo: 'Entrega confirmada manualmente',
    }
    await updateDoc(doc(db, 'ordens', osId), {
      etapa: etapaNova,
      status: derivarStatusDeEtapa(etapaNova),
      'datas.entregaReal': quando,
      historico: [...atual.historico, novaEntrada],
    })
  }

  /**
   * Confirmação real de retirada (Backlog Fase 6, Card 13.2) — grava
   * `datas.retiradaReal`/`conclusao` e finaliza a OS.
   */
  const confirmarRetirada = async (osId: string, quandoIso?: string) => {
    const atual = ordens.value.find((o) => o.id === osId)
    if (!atual) return
    const quando = quandoIso ?? new Date().toISOString()
    const etapaNova = 'finalizada' as const
    const novaEntrada: HistoricoEntradaOS = {
      em: new Date().toISOString(),
      etapaAnterior: atual.etapa,
      etapaNova,
      motivo: 'Retirada confirmada manualmente',
    }
    await updateDoc(doc(db, 'ordens', osId), {
      etapa: etapaNova,
      status: derivarStatusDeEtapa(etapaNova),
      'datas.retiradaReal': quando,
      'datas.conclusao': quando,
      historico: [...atual.historico, novaEntrada],
    })
  }

  /** Exceção de prazo de retirada por OS (Card 13.2) — `null` remove a exceção. */
  const definirSlaRetiradaOverride = async (osId: string, dias: number | null) => {
    await updateDoc(doc(db, 'ordens', osId), {
      slaRetiradaDiasOverride: dias === null ? deleteField() : dias,
    })
  }

  return {
    ordens,
    addOrdem,
    updateOrdem,
    deleteOrdem,
    atribuirPrestador,
    registrarRespostaDistribuicao,
    moverEtapaManual,
    confirmarEntrega,
    confirmarRetirada,
    definirSlaRetiradaOverride,
  }
}
