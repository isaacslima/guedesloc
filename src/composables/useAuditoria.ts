import { ref } from 'vue'
import { collection, addDoc, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { EntradaAuditoria, TipoAcaoAuditoria } from '@/types/governanca'

const entradas = ref<EntradaAuditoria[]>([])
let initialized = false

export function useAuditoria() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'auditoria'), orderBy('em', 'desc'), limit(300))
    onSnapshot(q, (snap) => {
      entradas.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          tipo: data.tipo ?? 'edicao_os',
          descricao: data.descricao ?? '',
          usuarioUid: data.usuarioUid ?? '',
          usuarioNome: data.usuarioNome ?? '',
          entidadeTipo: data.entidadeTipo ?? undefined,
          entidadeId: data.entidadeId ?? undefined,
          entidadeLabel: data.entidadeLabel ?? undefined,
          em: data.em instanceof Timestamp ? data.em.toDate().toISOString() : (data.em ?? new Date().toISOString()),
        } as EntradaAuditoria
      })
    })
  }
  return { entradas }
}

/**
 * Registra uma ação de negócio buscável (Card 14.3) — chamado direto de
 * cada ponto de ação relevante (login, edição de OS, envio manual de
 * WhatsApp, gestão de usuários). Mudança de etapa de OS com motivo já fica
 * em `historico[]` (Card 9.1) — a tela de Auditoria funde as duas fontes
 * em vez de duplicar, ver `AuditoriaView.vue`.
 */
export async function registrarAuditoria(entrada: {
  tipo: TipoAcaoAuditoria
  descricao: string
  usuarioUid: string
  usuarioNome: string
  entidadeTipo?: EntradaAuditoria['entidadeTipo']
  entidadeId?: string
  entidadeLabel?: string
}) {
  await addDoc(collection(db, 'auditoria'), { ...entrada, em: new Date().toISOString() })
}
