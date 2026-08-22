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

// ─── Card 14.3 (Fase 8) + Card 8.3 (Fase 10) — Auditoria de ações ──
// Card 8.3 (LGPD) é a base técnica: mesmo mecanismo do Card 14.3, mas com
// atenção específica às 3 ações sensíveis do seu critério de aceite
// (alteração de valores, exclusão de OS, aprovação de pagamentos) — os 3
// tipos abaixo marcados "(LGPD)" existem por causa desse card.
export type TipoAcaoAuditoria =
  | 'login'
  | 'edicao_os'
  | 'envio_whatsapp_manual'
  | 'usuario_criado'
  | 'usuario_alterado'
  | 'exclusao_os'
  | 'valor_alterado'
  | 'pagamento_aprovado'

export interface EntradaAuditoria {
  id: string
  tipo: TipoAcaoAuditoria
  descricao: string
  usuarioUid: string
  usuarioNome: string
  entidadeTipo?: 'os' | 'usuario' | 'prestador' | 'preco' | 'recebivel' | 'lote_pagamento'
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
  exclusao_os: 'Exclusão de OS',
  valor_alterado: 'Alteração de valor',
  pagamento_aprovado: 'Pagamento aprovado',
}
