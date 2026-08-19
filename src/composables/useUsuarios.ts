import { ref } from 'vue'
import { collection, doc, updateDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { chamarGateway } from '@/lib/gateway'
import type { Usuario, PerfilUsuario } from '@/types/governanca'

const usuarios = ref<Usuario[]>([])
let initialized = false

function paraISO(valor: unknown): string | undefined {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

export function useUsuarios() {
  if (!initialized) {
    initialized = true
    const q = query(collection(db, 'usuarios'), orderBy('criadoEm', 'desc'))
    onSnapshot(q, (snap) => {
      usuarios.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          uid: d.id,
          email: data.email ?? '',
          nome: data.nome ?? '',
          perfil: data.perfil ?? 'leitura',
          ativo: data.ativo !== false,
          criadoEm: paraISO(data.criadoEm) ?? new Date().toISOString(),
          ultimoAcessoEm: paraISO(data.ultimoAcessoEm),
        } as Usuario
      })
    })
  }

  const atualizarPerfil = (uid: string, perfil: PerfilUsuario) => updateDoc(doc(db, 'usuarios', uid), { perfil })
  const atualizarAtivo = (uid: string, ativo: boolean) => updateDoc(doc(db, 'usuarios', uid), { ativo })

  /** Cria a conta Firebase Auth + o doc `usuarios/{uid}` via Gateway (Admin SDK) — só Super Admin consegue (Card 14.1). */
  const criarUsuario = (input: { email: string; nome: string; perfil: PerfilUsuario }) =>
    chamarGateway<{ sucesso: boolean; uid: string; senhaTemporaria: string }>('/api/v1/usuarios', { method: 'POST', body: input })

  return { usuarios, atualizarPerfil, atualizarAtivo, criarUsuario }
}
