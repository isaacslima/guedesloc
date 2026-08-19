<script setup lang="ts">
import { computed, ref } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { roadmap, type FaseStatus } from '@/data/roadmap'

const statusColors: Record<FaseStatus, string> = {
  planejada: 'bg-slate-100 text-slate-600 border border-slate-200',
  em_andamento: 'bg-blue-100 text-blue-700 border border-blue-200',
  concluida: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

const statusLabel: Record<FaseStatus, string> = {
  planejada: 'Planejada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
}

const statusDot: Record<FaseStatus, string> = {
  planejada: 'bg-slate-300',
  em_andamento: 'bg-blue-500',
  concluida: 'bg-emerald-500',
}

const totalConcluidas = computed(() => roadmap.filter((f) => f.status === 'concluida').length)
const totalEmAndamento = computed(() => roadmap.filter((f) => f.status === 'em_andamento').length)
const totalPendencias = computed(() => roadmap.reduce((soma, f) => soma + (f.pendencias?.length ?? 0), 0))

const expandidas = ref(new Set<number>())
function alternarExpandida(numero: number) {
  if (expandidas.value.has(numero)) expandidas.value.delete(numero)
  else expandidas.value.add(numero)
  // força reatividade — Set não é rastreado por referência mutada
  expandidas.value = new Set(expandidas.value)
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Andamento do Projeto</h2>
        <p class="text-slate-500 text-sm mt-0.5">
          {{ roadmap.length }} fases no roadmap · {{ totalConcluidas }} concluídas · {{ totalEmAndamento }} em andamento
          <span v-if="totalPendencias > 0" class="text-amber-600">· {{ totalPendencias }} pendência(s)</span>
        </p>
      </div>

      <div class="relative space-y-4 max-w-3xl">
        <div class="absolute left-5 top-5 bottom-5 w-px bg-slate-200" aria-hidden="true" />

        <Card v-for="fase in roadmap" :key="fase.numero" class="relative pl-16 py-5 pr-5 border-slate-200 shadow-sm">
          <div
            class="absolute left-0 top-5 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-white border-2"
            :class="fase.status === 'planejada' ? 'border-slate-200 text-slate-400' : 'border-primary text-slate-900'"
          >
            {{ fase.numero }}
          </div>

          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="statusDot[fase.status]" />
                <h3 class="font-bold text-slate-900">{{ fase.nome }}</h3>
              </div>
              <p class="text-sm text-slate-600">{{ fase.resumo }}</p>
            </div>
            <Badge :class="statusColors[fase.status]">{{ statusLabel[fase.status] }}</Badge>
          </div>

          <div v-if="fase.pendencias && fase.pendencias.length > 0" class="mt-3 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">⚠ Pendências desta fase</p>
            <div v-for="(p, idx) in fase.pendencias" :key="idx" class="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm space-y-1">
              <p class="font-semibold text-amber-900">{{ p.item }}</p>
              <p class="text-amber-800"><span class="font-medium">Por quê:</span> {{ p.motivo }}</p>
              <p class="text-amber-800"><span class="font-medium">Próximo passo:</span> {{ p.proximoPasso }}</p>
            </div>
          </div>

          <div v-if="fase.comoTestar && fase.comoTestar.length > 0" class="mt-3">
            <Button
              size="sm"
              variant="outline"
              class="h-7 text-xs border-slate-200 text-slate-600"
              @click="alternarExpandida(fase.numero)"
            >
              {{ expandidas.has(fase.numero) ? '▲ Ocultar como testar' : '▼ Como testar o que já foi entregue' }}
            </Button>

            <ol v-if="expandidas.has(fase.numero)" class="mt-3 space-y-1.5 text-sm text-slate-600 list-decimal list-inside bg-slate-50 border border-slate-100 rounded-md p-4">
              <li v-for="(passo, idx) in fase.comoTestar" :key="idx">{{ passo }}</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  </DashboardLayout>
</template>
