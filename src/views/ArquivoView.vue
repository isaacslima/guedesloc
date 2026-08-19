<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ETAPA_LABEL, ETAPA_COR } from '@/lib/etapaLabels'

const { ordens } = useOrdens()

const arquivadas = computed(() =>
  ordens.value
    .filter((o) => o.etapa === 'finalizada' || o.etapa === 'cancelada')
    .sort((a, b) => {
      const da = a.datas.conclusao ?? a.historico[a.historico.length - 1]?.em ?? a.datas.criacao
      const db_ = b.datas.conclusao ?? b.historico[b.historico.length - 1]?.em ?? b.datas.criacao
      return new Date(db_).getTime() - new Date(da).getTime()
    }),
)

const busca = ref('')
const filtroEtapa = ref<'' | 'finalizada' | 'cancelada'>('')

const filtradas = computed(() => {
  return arquivadas.value.filter((o) => {
    if (filtroEtapa.value && o.etapa !== filtroEtapa.value) return false
    if (busca.value.trim()) {
      const alvo = busca.value.trim().toLowerCase()
      const texto = `${o.numero} ${o.numeroOsSeguradora ?? ''} ${o.cliente.nome} ${o.cliente.endereco.cidade ?? ''}`.toLowerCase()
      if (!texto.includes(alvo)) return false
    }
    return true
  })
})

function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

function motivoFinal(historico: typeof ordens.value[number]['historico']): string {
  return [...historico].reverse().find((h) => h.motivo?.trim())?.motivo ?? '—'
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Arquivo</h2>
        <p class="text-slate-500 text-sm mt-0.5">{{ arquivadas.length }} OS finalizada(s)/cancelada(s) — histórico preservado, pesquisável.</p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <Input v-model="busca" placeholder="Buscar por número, cliente, cidade..." class="max-w-sm border-slate-200" />
        <select v-model="filtroEtapa" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
          <option value="">Finalizadas e canceladas</option>
          <option value="finalizada">Só finalizadas</option>
          <option value="cancelada">Só canceladas</option>
        </select>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente / Cidade</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Encerrada em</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo final</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="os in filtradas" :key="os.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ os.numero }}</td>
              <td class="px-4 py-3 text-slate-700">{{ os.cliente.nome }}<span class="text-slate-400"> · {{ os.cliente.endereco.cidade || '—' }}</span></td>
              <td class="px-4 py-3"><Badge :class="ETAPA_COR[os.etapa]">{{ ETAPA_LABEL[os.etapa] }}</Badge></td>
              <td class="px-4 py-3 text-slate-500">{{ formatarData(os.datas.conclusao ?? os.historico[os.historico.length - 1]?.em) }}</td>
              <td class="px-4 py-3 text-slate-600">{{ motivoFinal(os.historico) }}</td>
            </tr>
            <tr v-if="filtradas.length === 0"><td colspan="5" class="px-4 py-12 text-center text-slate-400">Nenhuma OS arquivada encontrada.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-slate-400">Anexos (fotos de entrega, comprovantes) ainda não existem em nenhuma tela do sistema — quando essa captura for implementada, aparece preservada aqui junto do histórico.</p>
    </div>
  </DashboardLayout>
</template>
