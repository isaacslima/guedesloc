<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { useConfiguracoesOperacionais } from '@/composables/useConfiguracoesOperacionais'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { calcularSlaRetirada } from '@/lib/slaRetirada'
import type { OrdemUnificada } from '@/types/ordem'

const { ordens, confirmarRetirada, definirSlaRetiradaOverride } = useOrdens()
const { config, salvarConfig } = useConfiguracoesOperacionais()

type Aba = 'atrasadas' | 'vence_hoje' | 'no_prazo' | 'hoje'
const aba = ref<Aba>('atrasadas')

function mesmoDia(iso: string | undefined, data: Date): boolean {
  if (!iso) return false
  return new Date(iso).toDateString() === data.toDateString()
}
const hoje = new Date()

const aguardandoRetirada = computed(() => ordens.value.filter((o) => o.etapa === 'entregue_aguardando_retirada'))
const comSla = computed(() => aguardandoRetirada.value.map((o) => ({ os: o, sla: calcularSlaRetirada(o, config.value.slaRetiradaDiasPadrao) })))

const atrasadas = computed(() => comSla.value.filter((x) => x.sla.situacao === 'atrasada'))
const venceHoje = computed(() => comSla.value.filter((x) => x.sla.situacao === 'vence_hoje'))
const noPrazo = computed(() => comSla.value.filter((x) => x.sla.situacao === 'no_prazo'))
const retiradasHoje = computed(() =>
  ordens.value
    .filter((o) => o.etapa === 'finalizada' && mesmoDia(o.datas.retiradaReal, hoje))
    .map((o) => ({ os: o, sla: calcularSlaRetirada(o, config.value.slaRetiradaDiasPadrao) })),
)

const lista = computed(() => {
  if (aba.value === 'vence_hoje') return venceHoje.value
  if (aba.value === 'no_prazo') return noPrazo.value
  if (aba.value === 'hoje') return retiradasHoje.value
  return atrasadas.value
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
    await confirmarRetirada(os.id)
  } finally {
    confirmando.value = null
  }
}

const editandoOverrideId = ref<string | null>(null)
const overrideValor = ref<number | ''>('')
function abrirOverride(os: OrdemUnificada) {
  editandoOverrideId.value = os.id
  overrideValor.value = os.slaRetiradaDiasOverride ?? ''
}
async function salvarOverride(osId: string) {
  await definirSlaRetiradaOverride(osId, overrideValor.value === '' ? null : Number(overrideValor.value))
  editandoOverrideId.value = null
}

const editandoPadrao = ref(false)
const padraoValor = ref(config.value.slaRetiradaDiasPadrao)
function abrirEdicaoPadrao() {
  padraoValor.value = config.value.slaRetiradaDiasPadrao
  editandoPadrao.value = true
}
async function salvarPadrao() {
  await salvarConfig({ slaRetiradaDiasPadrao: Number(padraoValor.value) })
  editandoPadrao.value = false
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Retiradas</h2>
          <p class="text-slate-500 text-sm mt-0.5">Recorte do mesmo pipeline de OS — só o que já foi entregue e aguarda retirada.</p>
        </div>
        <div class="text-right text-xs text-slate-500">
          <p>Prazo padrão de retirada: <span class="font-semibold text-slate-700">{{ config.slaRetiradaDiasPadrao }} dias</span> após a entrega</p>
          <button class="text-primary font-semibold hover:underline" @click="abrirEdicaoPadrao">Editar prazo padrão</button>
        </div>
      </div>

      <div v-if="editandoPadrao" class="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3">
        <label class="text-sm text-slate-600">Prazo padrão (dias corridos):</label>
        <input v-model.number="padraoValor" type="number" min="1" class="w-20 h-8 rounded-md border border-slate-200 px-2 text-sm" />
        <Button size="sm" class="h-8 text-xs bg-primary text-slate-900 hover:bg-primary/90 font-bold" @click="salvarPadrao">Salvar</Button>
        <Button size="sm" variant="outline" class="h-8 text-xs" @click="editandoPadrao = false">Cancelar</Button>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="a in ([['atrasadas', 'Atrasadas'], ['vence_hoje', 'Vence hoje'], ['no_prazo', 'No prazo'], ['hoje', 'Retiradas hoje']] as const)"
          :key="a[0]"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          :class="aba === a[0] ? 'bg-primary text-slate-900 border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          @click="aba = a[0]"
        >{{ a[1] }} · {{ a[0] === 'atrasadas' ? atrasadas.length : a[0] === 'vence_hoje' ? venceHoje.length : a[0] === 'no_prazo' ? noPrazo.length : retiradasHoje.length }}</button>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente / Cidade</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entregue em</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prazo</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Situação</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="{ os, sla } in lista" :key="os.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ os.numero }}</td>
              <td class="px-4 py-3 text-slate-700">{{ os.cliente.nome }}<span class="text-slate-400"> · {{ os.cliente.endereco.cidade || '—' }}</span></td>
              <td class="px-4 py-3 text-slate-600">{{ formatarData(os.datas.entregaReal) }}</td>
              <td class="px-4 py-3 text-slate-600">
                <span v-if="editandoOverrideId === os.id" class="inline-flex items-center gap-1">
                  <input v-model.number="overrideValor" type="number" min="1" placeholder="padrão" class="w-16 h-7 rounded-md border border-slate-200 px-1.5 text-xs" />
                  <button class="text-xs text-primary font-semibold" @click="salvarOverride(os.id)">✓</button>
                  <button class="text-xs text-slate-400" @click="editandoOverrideId = null">✕</button>
                </span>
                <button v-else class="hover:underline" @click="abrirOverride(os)">
                  {{ sla.prazoDias }} dias<span v-if="os.slaRetiradaDiasOverride" class="text-amber-600"> (exceção)</span>
                </button>
              </td>
              <td class="px-4 py-3">
                <Badge v-if="sla.situacao === 'atrasada'" class="bg-red-100 text-red-600 border border-red-200">Atrasada há {{ Math.abs(Math.floor(sla.diasRestantes)) }}d</Badge>
                <Badge v-else-if="sla.situacao === 'vence_hoje'" class="bg-amber-100 text-amber-700 border border-amber-200">Vence hoje</Badge>
                <Badge v-else-if="sla.situacao === 'no_prazo'" class="bg-emerald-100 text-emerald-700 border border-emerald-200">No prazo · {{ Math.floor(sla.diasRestantes) }}d restantes</Badge>
                <Badge v-else class="bg-slate-100 text-slate-600 border border-slate-200">Retirada</Badge>
              </td>
              <td class="px-4 py-3">
                <Button v-if="os.etapa === 'entregue_aguardando_retirada'" size="sm" class="h-7 text-xs bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="confirmando === os.id" @click="confirmar(os)">
                  {{ confirmando === os.id ? 'Confirmando...' : 'Confirmar retirada agora' }}
                </Button>
                <span v-else class="text-xs text-slate-400">Retirada em {{ formatarData(os.datas.retiradaReal) }}</span>
              </td>
            </tr>
            <tr v-if="lista.length === 0"><td colspan="6" class="px-4 py-12 text-center text-slate-400">Nenhuma OS nesta aba.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </DashboardLayout>
</template>
