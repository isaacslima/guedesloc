<script setup lang="ts">
// DashboardLayout.vue
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useUsuarioAtual } from '@/composables/useUsuarioAtual'
import { moduloPermitido } from '@/lib/permissoes'
import { PERFIL_LABEL } from '@/types/governanca'

const router = useRouter()
const { usuarioAtual } = useUsuarioAtual()

const navItems = [
  { to: '/', name: 'dashboard', label: 'Dashboard', icon: '🏠', exact: true },
  { to: '/os', name: 'ordens', label: 'Ordens de Serviço', icon: '📋', exact: false },
  { to: '/kanban', name: 'kanban', label: 'Central de OS', icon: '🗂️', exact: false },
  { to: '/entregas', name: 'entregas', label: 'Entregas', icon: '🚚', exact: false },
  { to: '/retiradas', name: 'retiradas', label: 'Retiradas', icon: '↩️', exact: false },
  { to: '/pendencias', name: 'pendencias', label: 'Pendências', icon: '⚠️', exact: false },
  { to: '/precos', name: 'precos', label: 'Tabela de Preços', icon: '💲', exact: false },
  { to: '/recebiveis', name: 'recebiveis', label: 'Recebíveis', icon: '💰', exact: false },
  { to: '/repasses', name: 'repasses', label: 'Repasses', icon: '🏦', exact: false },
  { to: '/equipamentos', name: 'equipamentos', label: 'Equipamentos', icon: '⚙️', exact: false },
  { to: '/clientes', name: 'clientes', label: 'Clientes', icon: '🏢', exact: false },
  { to: '/prestadores', name: 'prestadores', label: 'Prestadores', icon: '👷', exact: false },
  { to: '/distribuicao', name: 'distribuicao', label: 'Distribuição', icon: '📡', exact: false },
  { to: '/whatsapp', name: 'whatsapp', label: 'WhatsApp', icon: '💬', exact: false },
  { to: '/automacoes', name: 'automacoes', label: 'Automações', icon: '⚡', exact: false },
  { to: '/integracoes', name: 'integracoes', label: 'Integrações', icon: '🔌', exact: false },
  { to: '/usuarios', name: 'usuarios', label: 'Usuários e Permissões', icon: '🔑', exact: false },
  { to: '/auditoria', name: 'auditoria', label: 'Auditoria', icon: '🕵️', exact: false },
  { to: '/relatorios', name: 'relatorios', label: 'Relatório Mensal', icon: '📊', exact: false },
  { to: '/conferencia', name: 'conferencia', label: 'Conferência de OS', icon: '🔎', exact: false },
  { to: '/arquivo', name: 'arquivo', label: 'Arquivo', icon: '🗄️', exact: false },
  { to: '/configuracoes', name: 'configuracoes', label: 'Configurações', icon: '🛠️', exact: false },
  { to: '/roadmap', name: 'roadmap', label: 'Andamento do Projeto', icon: '🗺️', exact: false },
]

// RBAC de navegação (backlog Fase 8, Card 14.1) — enquanto o perfil ainda
// não carregou, mostra tudo (evita sidebar vazia piscando no primeiro
// render); assim que carrega, filtra de verdade.
const navItemsVisiveis = computed(() => {
  const perfil = usuarioAtual.value?.perfil
  if (!perfil) return navItems
  return navItems.filter((item) => item.name === 'dashboard' || item.name === 'roadmap' || moduloPermitido(perfil, item.name))
})

async function sair() {
  await signOut(auth)
  router.push('/login')
}
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
          v-for="item in navItemsVisiveis"
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
      <div class="p-4 border-t border-slate-800 space-y-2">
        <div v-if="usuarioAtual" class="flex items-center justify-between gap-2 px-1">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-200 truncate">{{ usuarioAtual.nome }}</p>
            <p class="text-[11px] text-slate-500">{{ PERFIL_LABEL[usuarioAtual.perfil] }}</p>
          </div>
          <button class="text-[11px] text-slate-400 hover:text-red-400 transition-colors shrink-0" @click="sair">Sair</button>
        </div>
        <p class="text-xs text-slate-600 text-center">© {{ new Date().getFullYear() }} Guedesloc</p>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto bg-slate-50 p-8">
      <slot />
    </main>
  </div>
</template>
