// Criação de contas Firebase Auth (backlog Fase 8, Card 14.1). O front nunca
// cria usuário direto — o SDK client não tem permissão pra criar contas de
// terceiros; só o Admin SDK (aqui, no Gateway) consegue.
import { getAuth } from 'firebase-admin/auth'
import { db } from './firestore.js'

export type PerfilUsuario = 'super_admin' | 'operacao' | 'financeiro' | 'leitura'

function gerarSenhaTemporaria(): string {
  return `${Math.random().toString(36).slice(-8)}Aa1!`
}

/** Só Super Admin pode criar novos usuários — checagem contra o próprio doc `usuarios/{uid}` do chamador. */
export async function criarUsuario(criadorUid: string, email: string, nome: string, perfil: PerfilUsuario) {
  const criadorSnap = await db.collection('usuarios').doc(criadorUid).get()
  if (!criadorSnap.exists || criadorSnap.data()?.perfil !== 'super_admin') {
    throw new Error('Só Super Admin pode criar novos usuários.')
  }

  const senhaTemporaria = gerarSenhaTemporaria()
  const userRecord = await getAuth().createUser({ email, password: senhaTemporaria, displayName: nome })

  await db.collection('usuarios').doc(userRecord.uid).set({
    email,
    nome,
    perfil,
    ativo: true,
    criadoEm: new Date().toISOString(),
  })

  return { uid: userRecord.uid, senhaTemporaria }
}
