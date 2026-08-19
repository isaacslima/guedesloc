<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ETAPA_LABEL, ETAPA_COR } from '@/lib/etapaLabels'
import type { OrdemUnificada } from '@/types/ordem'

const { ordens, confirmarEntrega } = useOrdens()

type Aba = 'agendadas' | 'hoje' | 'entregues'
const aba = ref<Aba>('agendadas')

function mesmoDia(iso: string | undefined, data: Date): boolean {
  if (!iso) return false
  return new Date(iso).toDateString() === data.toDateString()
}

const hoje = new Date()

const jaEntregue = (os: OrdemUnificada) =>
  ['entregue_aguardando_foto', 'entregue_aguardando_retirada', 'finalizada'].includes(os.etapa)

const agendadas = computed(() => ordens.value.filter((o) => o.etapa === 'aguardando_entrega'))
const entregasHoje = computed(() => agendadas.value.filter((o) => mesmoDia(o.datas.agendamento, hoje)))
const entregues = computed(() =>
  ordens.value
    .filter((o) => jaEntregue(o) && o.datas.entregaReal)
    .sort((a, b) => new Date(b.datas.entregaReal!).getTime() - new Date(a.datas.entregaReal!).getTime()),
)

const lista = computed(() => {
  if (aba.value === 'hoje') return entregasHoje.value
  if (aba.value === 'entregues') return entregues.value
  return agendadas.value
})

function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR')
}

const confirmando = ref<string | null>(null)
async function confirmar(os: OrdemUnificada) {
  confirmando.value = os.id
  try {
    await confirmarEntrega(os.id)
  } finally {
    confirmando.value = null
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Entregas</h2>
        <p class="text-slate-500 text-sm mt-0.5">Recorte do mesmo pipeline de OS (Central de OS) — só o que está agendado ou já foi entregue.</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="a in ([['agendadas', 'Agendadas'], ['hoje', 'Entregas de hoje'], ['entregues', 'Entregues']] as const)"
          :key="a[0]"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          :class="aba === a[0] ? 'bg-primary text-slate-900 border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          @click="aba = a[0]"
        >{{ a[1] }} · {{ a[0] === 'agendadas' ? agendadas.length : a[0] === 'hoje' ? entregasHoje.length : entregues.length }}</button>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente / Cidade</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prestador</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ aba === 'entregues' ? 'Entregue em' : 'Agendamento' }}</th>
              <th v-if="aba !== 'entregues'" class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="os in lista" :key="os.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ os.numero }}</td>
              <td class="px-4 py-3 text-slate-700">{{ os.cliente.nome }}<span class="text-slate-400"> · {{ os.cliente.endereco.cidade || '—' }}</span></td>
              <td class="px-4 py-3 text-slate-600">{{ os.prestadoresNomes[0] || 'Sem prestador' }}</td>
              <td class="px-4 py-3"><Badge :class="ETAPA_COR[os.etapa]">{{ ETAPA_LABEL[os.etapa] }}</Badge></td>
              <td class="px-4 py-3 text-slate-600">{{ formatarData(aba === 'entregues' ? os.datas.entregaReal : os.datas.agendamento) }}</td>
              <td v-if="aba !== 'entregues'" class="px-4 py-3">
                <Button size="sm" class="h-7 text-xs bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="confirmando === os.id" @click="confirmar(os)">
                  {{ confirmando === os.id ? 'Confirmando...' : 'Confirmar entrega agora' }}
                </Button>
              </td>
            </tr>
            <tr v-if="lista.length === 0"><td colspan="6" class="px-4 py-12 text-center text-slate-400">Nenhuma OS nesta aba.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </DashboardLayout>
</template>
