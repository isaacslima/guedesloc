<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { useConfiguracoesOperacionais } from '@/composables/useConfiguracoesOperacionais'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Badge } from '@/components/ui/badge'
import { ETAPA_LABEL, ETAPA_COR } from '@/lib/etapaLabels'
import { calcularSlaRetirada } from '@/lib/slaRetirada'
import type { HistoricoEntradaOS } from '@/types/ordem'

const { ordens } = useOrdens()
const { config } = useConfiguracoesOperacionais()

type Aba = 'pendencias' | 'excedentes' | 'canceladas' | 'historico'
const aba = ref<Aba>('pendencias')

const pendencias = computed(() => ordens.value.filter((o) => o.etapa === 'pendencia'))
const canceladas = computed(() => ordens.value.filter((o) => o.etapa === 'cancelada'))
const excedentes = computed(() =>
  ordens.value.filter((o) => calcularSlaRetirada(o, config.value.slaRetiradaDiasPadrao).situacao === 'atrasada'),
)

interface EntradaHistoricoComOS extends HistoricoEntradaOS {
  osId: string
  osNumero: string
}

const historicoComMotivo = computed<EntradaHistoricoComOS[]>(() => {
  const entradas: EntradaHistoricoComOS[] = []
  for (const os of ordens.value) {
    for (const h of os.historico) {
      if (h.motivo?.trim()) entradas.push({ ...h, osId: os.id, osNumero: os.numero })
    }
  }
  return entradas.sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
})

function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR')
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Pendências</h2>
        <p class="text-slate-500 text-sm mt-0.5">Nenhuma OS é perdida — todo desvio operacional fica rastreável pelo histórico com motivo.</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="a in ([['pendencias', 'Pendências'], ['excedentes', 'Excedentes'], ['canceladas', 'Canceladas'], ['historico', 'Com motivo registrado']] as const)"
          :key="a[0]"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          :class="aba === a[0] ? 'bg-primary text-slate-900 border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          @click="aba = a[0]"
        >{{ a[1] }} · {{ a[0] === 'pendencias' ? pendencias.length : a[0] === 'excedentes' ? excedentes.length : a[0] === 'canceladas' ? canceladas.length : historicoComMotivo.length }}</button>
      </div>

      <!-- Pendências / Excedentes / Canceladas — mesma listagem de OS -->
      <div v-if="aba !== 'historico'" class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente / Cidade</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Último motivo registrado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="os in (aba === 'pendencias' ? pendencias : aba === 'excedentes' ? excedentes : canceladas)"
              :key="os.id"
              class="border-b border-slate-100 hover:bg-slate-50/60"
            >
              <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ os.numero }}</td>
              <td class="px-4 py-3 text-slate-700">{{ os.cliente.nome }}<span class="text-slate-400"> · {{ os.cliente.endereco.cidade || '—' }}</span></td>
              <td class="px-4 py-3"><Badge :class="ETAPA_COR[os.etapa]">{{ ETAPA_LABEL[os.etapa] }}</Badge></td>
              <td class="px-4 py-3 text-slate-600">{{ os.historico[os.historico.length - 1]?.motivo || '—' }}</td>
            </tr>
            <tr v-if="(aba === 'pendencias' ? pendencias : aba === 'excedentes' ? excedentes : canceladas).length === 0">
              <td colspan="4" class="px-4 py-12 text-center text-slate-400">Nenhuma OS nesta aba.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Com motivo registrado — audit log de todo historico[] com motivo -->
      <div v-else class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">OS</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Transição</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(h, i) in historicoComMotivo" :key="`${h.osId}-${i}`" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 text-slate-500 whitespace-nowrap">{{ formatarData(h.em) }}</td>
              <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ h.osNumero }}</td>
              <td class="px-4 py-3 text-slate-600 whitespace-nowrap">
                {{ h.etapaAnterior ? ETAPA_LABEL[h.etapaAnterior] : 'Criação' }} → {{ ETAPA_LABEL[h.etapaNova] }}
              </td>
              <td class="px-4 py-3 text-slate-700">{{ h.motivo }}</td>
            </tr>
            <tr v-if="historicoComMotivo.length === 0"><td colspan="4" class="px-4 py-12 text-center text-slate-400">Nenhum registro ainda.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </DashboardLayout>
</template>
