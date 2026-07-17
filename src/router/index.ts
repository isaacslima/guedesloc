import { createRouter, createWebHistory } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

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
  ],
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe()
    if (requiresAuth && !user) {
      next('/login')
    } else if (to.path === '/login' && user) {
      next('/')
    } else {
      next()
    }
  })
})

export default router
