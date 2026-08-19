import type { PerfilUsuario } from '@/types/governanca'

// Rótulos de rota (router/index.ts) agrupados por área — usado tanto pra
// filtrar a sidebar quanto pra bloquear navegação direta por URL (Card 14.1).
const AREA_DASHBOARD = ['dashboard', 'roadmap']
const AREA_OPERACIONAL = [
  'ordens', 'kanban', 'entregas', 'retiradas', 'pendencias',
  'equipamentos', 'clientes', 'prestadores', 'distribuicao',
  'whatsapp', 'automacoes', 'integracoes',
]
const AREA_FINANCEIRA = ['precos', 'recebiveis', 'repasses']
const AREA_GOVERNANCA = ['usuarios', 'auditoria', 'relatorios', 'conferencia', 'arquivo', 'configuracoes']

/** Só as telas operacionais de visualização — sem cadastro de prestador/equipamento nem ações de distribuição. */
const AREA_OPERACIONAL_LEITURA = ['ordens', 'kanban', 'entregas', 'retiradas', 'pendencias']

export const ROTAS_POR_PERFIL: Record<PerfilUsuario, string[]> = {
  super_admin: [...AREA_DASHBOARD, ...AREA_OPERACIONAL, ...AREA_FINANCEIRA, ...AREA_GOVERNANCA],
  operacao: [...AREA_DASHBOARD, ...AREA_OPERACIONAL],
  financeiro: [...AREA_DASHBOARD, ...AREA_FINANCEIRA, 'relatorios'],
  leitura: [...AREA_DASHBOARD, ...AREA_OPERACIONAL_LEITURA],
}

export function moduloPermitido(perfil: PerfilUsuario | null | undefined, rota: string | null | undefined): boolean {
  if (!perfil || !rota) return false
  return ROTAS_POR_PERFIL[perfil].includes(rota)
}
