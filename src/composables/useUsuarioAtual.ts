import { ref } from 'vue'
import { doc, getDoc, updateDoc, onSnapshot, runTransaction, Timestamp } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import type { Usuario, PerfilUsuario } from '@/types/governanca'

function paraISO(valor: unknown): string | undefined {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

function mapear(uid: string, data: Record<string, unknown>): Usuario {
  return {
    uid,
    email: (data.email as string) ?? '',
    nome: (data.nome as string) ?? '',
    perfil: (data.perfil as PerfilUsuario) ?? 'leitura',
    ativo: data.ativo !== false,
    criadoEm: paraISO(data.criadoEm) ?? new Date().toISOString(),
    ultimoAcessoEm: paraISO(data.ultimoAcessoEm),
  }
}

/**
 * Garante que existe um doc em `usuarios/{uid}` — cria no primeiro login de
 * cada pessoa (Card 14.1). O primeiro usuário que a plataforma vê nasce
 * `super_admin`, pra sempre existir alguém capaz de conceder permissão aos
 * demais; os próximos nascem `leitura` até um admin promover.
 *
 * Roda em transação com um doc sentinela (`sistema/bootstrap`) — sem isso,
 * dois logins simultâneos (duas abas, ou dois chamadores concorrentes desta
 * mesma função) podem correr em paralelo e o segundo `setDoc` sobrescreve o
 * primeiro, derrubando o `super_admin` recém-criado pra `leitura`. Só esta
 * função cria o doc — `useUsuarioAtual()` abaixo só lê.
 */
export async function garantirUsuarioDoc(fbUser: User): Promise<Usuario> {
  const ref = doc(db, 'usuarios', fbUser.uid)
  const bootstrapRef = doc(db, 'sistema', 'bootstrap')
  const agora = new Date().toISOString()

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists()) {
      tx.update(ref, { ultimoAcessoEm: agora })
      return mapear(fbUser.uid, { ...snap.data(), ultimoAcessoEm: agora })
    }

    const bootstrapSnap = await tx.get(bootstrapRef)
    const jaTemSuperAdmin = bootstrapSnap.exists() && bootstrapSnap.data()?.superAdminCriado === true
    const perfilInicial: PerfilUsuario = jaTemSuperAdmin ? 'leitura' : 'super_admin'
    const dados = {
      email: fbUser.email ?? '',
      nome: fbUser.email?.split('@')[0] ?? 'Usuário',
      perfil: perfilInicial,
      ativo: true,
      criadoEm: agora,
      ultimoAcessoEm: agora,
    }
    tx.set(ref, dados)
    if (!jaTemSuperAdmin) tx.set(bootstrapRef, { superAdminCriado: true }, { merge: true })
    return mapear(fbUser.uid, dados)
  })
}

/** Leitura pontual (sem assinatura) — usada pelo guard de rota, que roda a cada navegação. */
export async function buscarPerfilUsuario(uid: string): Promise<{ perfil: PerfilUsuario; ativo: boolean } | null> {
  const snap = await getDoc(doc(db, 'usuarios', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return { perfil: (data.perfil as PerfilUsuario) ?? 'leitura', ativo: data.ativo !== false }
}

const usuarioAtual = ref<Usuario | null>(null)
const carregando = ref(true)
let initialized = false
let pararSnapshot: (() => void) | null = null

/**
 * Estado reativo do usuário logado — pra sidebar, telas de conta, exibir
 * nome/perfil na UI. Só lê (onSnapshot) — nunca cria o doc; isso é
 * responsabilidade exclusiva do guard de rota (`router/index.ts`), que já
 * roda `garantirUsuarioDoc` antes de qualquer view autenticada montar (e
 * portanto antes deste composable ser instanciado a primeira vez).
 */
export function useUsuarioAtual() {
  if (!initialized) {
    initialized = true
    onAuthStateChanged(auth, (fbUser) => {
      pararSnapshot?.()
      pararSnapshot = null
      if (!fbUser) {
        usuarioAtual.value = null
        carregando.value = false
        return
      }
      pararSnapshot = onSnapshot(doc(db, 'usuarios', fbUser.uid), (snap) => {
        if (snap.exists()) usuarioAtual.value = mapear(fbUser.uid, snap.data())
        carregando.value = false
      })
    })
  }

  return { usuarioAtual, carregando }
}
