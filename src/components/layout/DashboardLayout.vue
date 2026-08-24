<script setup lang="ts">
// DashboardLayout.vue
import { ref, computed } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useUsuarioAtual } from '@/composables/useUsuarioAtual'
import { moduloPermitido } from '@/lib/permissoes'
import { PERFIL_LABEL } from '@/types/governanca'

const router = useRouter()
const route = useRoute()
const { usuarioAtual } = useUsuarioAtual()

interface NavItem { to: string; name: string; label: string; icon: string; exact: boolean }
interface GrupoNav { key: string; label: string; items: NavItem[] }

const itemDashboard: NavItem = { to: '/', name: 'dashboard', label: 'Dashboard', icon: '🏠', exact: true }
const itemRoadmap: NavItem = { to: '/roadmap', name: 'roadmap', label: 'Andamento do Projeto', icon: '🗺️', exact: false }

// Agrupado por domínio (antes era uma lista só com 22 itens) — Dashboard e
// Andamento do Projeto ficam soltos (topo/rodapé), o resto entra em grupos
// recolhíveis.
const gruposDef: GrupoNav[] = [
  {
    key: 'operacao', label: 'Operação',
    items: [
      { to: '/os', name: 'ordens', label: 'Ordens de Serviço', icon: '📋', exact: false },
      { to: '/kanban', name: 'kanban', label: 'Central de OS', icon: '🗂️', exact: false },
      { to: '/distribuicao', name: 'distribuicao', label: 'Distribuição', icon: '📡', exact: false },
      { to: '/entregas', name: 'entregas', label: 'Entregas', icon: '🚚', exact: false },
      { to: '/retiradas', name: 'retiradas', label: 'Retiradas', icon: '↩️', exact: false },
      { to: '/pendencias', name: 'pendencias', label: 'Pendências', icon: '⚠️', exact: false },
    ],
  },
  {
    key: 'cadastros', label: 'Cadastros',
    items: [
      { to: '/clientes', name: 'clientes', label: 'Clientes', icon: '🏢', exact: false },
      { to: '/prestadores', name: 'prestadores', label: 'Prestadores', icon: '👷', exact: false },
      { to: '/equipamentos', name: 'equipamentos', label: 'Equipamentos', icon: '⚙️', exact: false },
    ],
  },
  {
    key: 'financeiro', label: 'Financeiro',
    items: [
      { to: '/precos', name: 'precos', label: 'Tabela de Preços', icon: '💲', exact: false },
      { to: '/recebiveis', name: 'recebiveis', label: 'Recebíveis', icon: '💰', exact: false },
      { to: '/repasses', name: 'repasses', label: 'Repasses', icon: '🏦', exact: false },
    ],
  },
  {
    key: 'comunicacao', label: 'Comunicação',
    items: [
      { to: '/whatsapp', name: 'whatsapp', label: 'WhatsApp', icon: '💬', exact: false },
      { to: '/automacoes', name: 'automacoes', label: 'Automações', icon: '⚡', exact: false },
    ],
  },
  {
    key: 'relatorios', label: 'Relatórios',
    items: [
      { to: '/relatorios', name: 'relatorios', label: 'Relatório Mensal', icon: '📊', exact: false },
      { to: '/conferencia', name: 'conferencia', label: 'Conferência de OS', icon: '🔎', exact: false },
      { to: '/arquivo', name: 'arquivo', label: 'Arquivo', icon: '🗄️', exact: false },
      { to: '/auditoria', name: 'auditoria', label: 'Auditoria', icon: '🕵️', exact: false },
    ],
  },
  {
    key: 'sistema', label: 'Sistema',
    items: [
      { to: '/integracoes', name: 'integracoes', label: 'Integrações', icon: '🔌', exact: false },
      { to: '/usuarios', name: 'usuarios', label: 'Usuários e Permissões', icon: '🔑', exact: false },
      { to: '/configuracoes', name: 'configuracoes', label: 'Configurações', icon: '🛠️', exact: false },
    ],
  },
]

// RBAC de navegação (backlog Fase 8, Card 14.1) — enquanto o perfil ainda
// não carregou, mostra tudo (evita sidebar vazia piscando no primeiro
// render); assim que carrega, filtra de verdade. Grupo sem nenhum item
// visível some inteiro (sem título órfão).
const gruposVisiveis = computed(() => {
  const perfil = usuarioAtual.value?.perfil
  return gruposDef
    .map((g) => ({ ...g, items: perfil ? g.items.filter((item) => moduloPermitido(perfil, item.name)) : g.items }))
    .filter((g) => g.items.length > 0)
})

// Grupos recolhíveis (pedido do usuário — 22 itens numa lista só). Estado
// persiste no navegador; o grupo com a rota ativa sempre nasce aberto,
// mesmo que tivesse sido fechado numa visita anterior.
const STORAGE_KEY = 'guedesloc:sidebar-grupos-abertos'
function carregarEstadoSalvo(): Record<string, boolean> {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY)
    return bruto ? JSON.parse(bruto) : {}
  } catch {
    return {}
  }
}
const estadoSalvo = carregarEstadoSalvo()
const grupoAtivoKey = gruposDef.find((g) => g.items.some((item) => item.name === route.name))?.key
const gruposAbertos = ref<Record<string, boolean>>(
  Object.fromEntries(gruposDef.map((g) => [g.key, g.key === grupoAtivoKey ? true : (estadoSalvo[g.key] ?? true)])),
)

function toggleGrupo(key: string) {
  gruposAbertos.value[key] = !gruposAbertos.value[key]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gruposAbertos.value))
}

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
      <nav class="flex-1 px-4 py-6 overflow-y-auto">
        <RouterLink
          :to="itemDashboard.to"
          :exact="itemDashboard.exact"
          class="flex items-center gap-3 px-4 py-2.5 rounded-md text-slate-300 hover:bg-slate-800/50 transition-colors text-sm"
          active-class="bg-slate-800 text-primary font-semibold"
          exact-active-class="bg-slate-800 text-primary font-semibold"
        >
          <span class="text-base leading-none">{{ itemDashboard.icon }}</span>
          {{ itemDashboard.label }}
        </RouterLink>

        <div v-for="grupo in gruposVisiveis" :key="grupo.key" class="pt-3">
          <button
            type="button"
            class="w-full flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            @click="toggleGrupo(grupo.key)"
          >
            <span>{{ grupo.label }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              class="transition-transform shrink-0"
              :class="gruposAbertos[grupo.key] ? 'rotate-90' : ''"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div v-show="gruposAbertos[grupo.key]" class="space-y-1 mt-0.5">
            <RouterLink
              v-for="item in grupo.items"
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
          </div>
        </div>

        <RouterLink
          :to="itemRoadmap.to"
          :exact="itemRoadmap.exact"
          class="flex items-center gap-3 px-4 py-2.5 mt-3 rounded-md text-slate-300 hover:bg-slate-800/50 transition-colors text-sm"
          active-class="bg-slate-800 text-primary font-semibold"
        >
          <span class="text-base leading-none">{{ itemRoadmap.icon }}</span>
          {{ itemRoadmap.label }}
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
