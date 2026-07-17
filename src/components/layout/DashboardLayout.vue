<script setup lang="ts">
// DashboardLayout.vue
import { RouterLink, useLink } from 'vue-router'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠', exact: true },
  { to: '/os', label: 'Ordens de Serviço', icon: '📋', exact: false },
  { to: '/equipamentos', label: 'Equipamentos', icon: '⚙️', exact: false },
  { to: '/clientes', label: 'Clientes', icon: '🏢', exact: false },
  { to: '/prestadores', label: 'Prestadores', icon: '👷', exact: false },
]
</script>

<template>
  <div class="flex h-screen w-full bg-background overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-slate-50 flex flex-col shrink-0">
      <div class="p-6 border-b border-slate-800">
        <h1 class="text-2xl font-black text-primary tracking-widest uppercase">Guedesloc</h1>
        <p class="text-xs text-slate-400 mt-1">Locações e Serviços</p>
      </div>
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :exact="item.exact"
          class="flex items-center gap-3 px-4 py-2.5 rounded-md text-slate-300 hover:bg-slate-800/50 transition-colors text-sm"
          active-class="bg-slate-800 text-primary font-semibold"
          :exact-active-class="item.exact ? 'bg-slate-800 text-primary font-semibold' : ''"
        >
          <span class="text-base leading-none">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="p-4 border-t border-slate-800">
        <p class="text-xs text-slate-600 text-center">© {{ new Date().getFullYear() }} Guedesloc</p>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto bg-slate-50 p-8">
      <slot />
    </main>
  </div>
</template>
