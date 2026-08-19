// ============================================================
// Governança — RBAC, presença e auditoria (Backlog Fase 8, Epic 14)
// ============================================================

export type PerfilUsuario = 'super_admin' | 'operacao' | 'financeiro' | 'leitura'

export interface Usuario {
  uid: string
  email: string
  nome: string
  perfil: PerfilUsuario
  ativo: boolean
  criadoEm: string
  ultimoAcessoEm?: string
}

export const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  super_admin: 'Super Admin',
  operacao: 'Operação',
  financeiro: 'Financeiro',
  leitura: 'Leitura',
}

// ─── Card 14.3 — Auditoria de ações da equipe ───────────────────
export type TipoAcaoAuditoria =
  | 'login'
  | 'edicao_os'
  | 'envio_whatsapp_manual'
  | 'usuario_criado'
  | 'usuario_alterado'

export interface EntradaAuditoria {
  id: string
  tipo: TipoAcaoAuditoria
  descricao: string
  usuarioUid: string
  usuarioNome: string
  entidadeTipo?: 'os' | 'usuario' | 'prestador'
  entidadeId?: string
  entidadeLabel?: string
  em: string
}

export const TIPO_ACAO_LABEL: Record<TipoAcaoAuditoria, string> = {
  login: 'Login no sistema',
  edicao_os: 'Edição de OS',
  envio_whatsapp_manual: 'Envio manual de WhatsApp',
  usuario_criado: 'Usuário criado',
  usuario_alterado: 'Usuário alterado',
}
