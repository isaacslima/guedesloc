import { createRouter, createWebHistory } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { garantirUsuarioDoc, buscarPerfilUsuario } from '@/composables/useUsuarioAtual'
import { moduloPermitido } from '@/lib/permissoes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/os',
      name: 'ordens',
      component: () => import('@/views/OrdensView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/kanban',
      name: 'kanban',
      component: () => import('@/views/KanbanView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/entregas',
      name: 'entregas',
      component: () => import('@/views/EntregasView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/retiradas',
      name: 'retiradas',
      component: () => import('@/views/RetiradasView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/pendencias',
      name: 'pendencias',
      component: () => import('@/views/PendenciasView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/precos',
      name: 'precos',
      component: () => import('@/views/PrecosView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/recebiveis',
      name: 'recebiveis',
      component: () => import('@/views/RecebiveisView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/repasses',
      name: 'repasses',
      component: () => import('@/views/RepassesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/equipamentos',
      name: 'equipamentos',
      component: () => import('@/views/EquipamentosView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/clientes',
      name: 'clientes',
      component: () => import('@/views/ClientesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/prestadores',
      name: 'prestadores',
      component: () => import('@/views/PrestadoresView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/distribuicao',
      name: 'distribuicao',
      component: () => import('@/views/DistribuicaoView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/whatsapp',
      name: 'whatsapp',
      component: () => import('@/views/WhatsAppView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/automacoes',
      name: 'automacoes',
      component: () => import('@/views/AutomacoesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/integracoes',
      name: 'integracoes',
      component: () => import('@/views/IntegracoesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/roadmap',
      name: 'roadmap',
      component: () => import('@/views/RoadmapView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('@/views/UsuariosView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/auditoria',
      name: 'auditoria',
      component: () => import('@/views/AuditoriaView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/relatorios',
      name: 'relatorios',
      component: () => import('@/views/RelatorioMensalView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/conferencia',
      name: 'conferencia',
      component: () => import('@/views/ConferenciaOSView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/arquivo',
      name: 'arquivo',
      component: () => import('@/views/ArquivoView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracoes',
      name: 'configuracoes',
      component: () => import('@/views/ConfiguracoesView.vue'),
      meta: { requiresAuth: true }
    },
  ],
})

// Navigation Guard — autenticação (todas as fases) + RBAC de navegação
// direta por URL (backlog Fase 8, Card 14.1). A sidebar já esconde os
// módulos sem permissão (DashboardLayout.vue); este guard é a segunda
// camada, pra bloquear quem digita a URL direto sem ter o link visível.
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth
  const user = await new Promise<import('firebase/auth').User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      unsubscribe()
      resolve(u)
    })
  })

  if (requiresAuth && !user) {
    next('/login')
    return
  }
  if (to.path === '/login' && user) {
    next('/')
    return
  }
  if (requiresAuth && user && to.name && to.name !== 'dashboard' && to.name !== 'roadmap') {
    await garantirUsuarioDoc(user)
    const perfil = await buscarPerfilUsuario(user.uid)
    if (!perfil?.ativo || !moduloPermitido(perfil.perfil, String(to.name))) {
      next('/')
      return
    }
  }
  next()
})

export default router
