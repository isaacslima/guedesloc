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
    }
  ],
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth
  // We wrap the check in a Promise to wait for the auth state to be resolved 
  // on initial page load if the auth object isn't fully initialized.
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe() // We only want to check the current state once per route navigation
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
