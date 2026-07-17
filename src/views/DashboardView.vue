<script setup lang="ts">
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { useClientes } from '@/composables/useClientes'
import { useEquipamentos } from '@/composables/useEquipamentos'
import { usePrestadores } from '@/composables/usePrestadores'
import { useOrdens } from '@/composables/useOrdens'
import { computed } from 'vue'

const router = useRouter()
const auth = getAuth()

const { clientes } = useClientes()
const { equipamentos } = useEquipamentos()
const { prestadores } = usePrestadores()
const { ordens } = useOrdens()

const handleLogout = async () => {
  await signOut(auth)
  router.push('/login')
}

const ordensAbertas = computed(() => ordens.value.filter(o => o.status === 'aberta').length)
const ordensEmAndamento = computed(() => ordens.value.filter(o => o.status === 'em_andamento').length)
const ordensHoje = computed(() => {
  const hoje = new Date().toDateString()
  return ordens.value.filter(o => o.dataCriacao && new Date(o.dataCriacao).toDateString() === hoje).length
})

const stats = computed(() => [
  {
    label: 'Ordens de Serviço',
    value: ordens.value.length,
    sub: `${ordensAbertas.value} abertas · ${ordensEmAndamento.value} em andamento`,
    icon: '📋',
    route: '/os',
    color: 'from-amber-400 to-orange-500',
    badge: ordensHoje.value > 0 ? `+${ordensHoje.value} hoje` : null,
    badgeClass: 'bg-orange-100 text-orange-700',
  },
  {
    label: 'Clientes',
    value: clientes.value.length,
    sub: `${clientes.value.filter(c => c.status === 'ativo').length} ativos`,
    icon: '🏢',
    route: '/clientes',
    color: 'from-sky-400 to-blue-600',
    badge: null,
    badgeClass: '',
  },
  {
    label: 'Equipamentos',
    value: equipamentos.value.length,
    sub: `${equipamentos.value.filter(e => e.status === 'disponivel').length} disponíveis`,
    icon: '⚙️',
    route: '/equipamentos',
    color: 'from-violet-400 to-purple-600',
    badge: null,
    badgeClass: '',
  },
  {
    label: 'Prestadores',
    value: prestadores.value.length,
    sub: `${prestadores.value.filter(p => p.status === 'ativo').length} ativos`,
    icon: '👷',
    route: '/prestadores',
    color: 'from-emerald-400 to-teal-600',
    badge: null,
    badgeClass: '',
  },
])

const recentOS = computed(() => ordens.value.slice(0, 5))

const osStatusColor: Record<string, string> = {
  aberta: 'bg-amber-100 text-amber-700 border border-amber-200',
  em_andamento: 'bg-blue-100 text-blue-700 border border-blue-200',
  concluida: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelada: 'bg-red-100 text-red-600 border border-red-200',
}
const osStatusLabel: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada',
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-slate-900">Painel de Controle</h2>
          <p class="text-slate-500 mt-1">Bem-vindo ao sistema de gestão Guedesloc.</p>
        </div>
        <div class="flex items-center gap-3">
          <Button variant="outline" class="border-slate-300 text-slate-600" @click="handleLogout">Sair</Button>
          <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold shadow-sm" @click="$router.push('/os')">
            + Criar Nova OS
          </Button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          v-for="stat in stats"
          :key="stat.label"
          class="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
          @click="$router.push(stat.route)"
        >
          <CardContent class="p-0">
            <div :class="`h-1.5 w-full bg-gradient-to-r ${stat.color}`" />
            <div class="p-5 space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ stat.label }}</p>
                  <p class="text-4xl font-black text-slate-900 mt-1 tabular-nums">{{ stat.value }}</p>
                </div>
                <span class="text-3xl leading-none">{{ stat.icon }}</span>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-xs text-slate-500">{{ stat.sub }}</p>
                <Badge v-if="stat.badge" :class="stat.badgeClass + ' text-xs px-2 py-0.5'">{{ stat.badge }}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Recent OS -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-800">Ordens Recentes</h3>
          <Button variant="outline" size="sm" class="h-8 text-xs border-slate-200" @click="$router.push('/os')">Ver todas →</Button>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div v-if="recentOS.length === 0" class="py-10 text-center text-slate-400 text-sm">
            Nenhuma OS criada ainda. <button class="text-amber-600 font-medium hover:underline" @click="$router.push('/os')">Criar primeira OS →</button>
          </div>
          <table v-else class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="os in recentOS"
                :key="os.id"
                class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
                @click="$router.push('/os')"
              >
                <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ os.numero }}</td>
                <td class="px-4 py-3 text-slate-700">{{ os.clienteNome }}</td>
                <td class="px-4 py-3 text-slate-600 capitalize">{{ os.tipo }}</td>
                <td class="px-4 py-3">
                  <Badge :class="osStatusColor[os.status]">{{ osStatusLabel[os.status] }}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
