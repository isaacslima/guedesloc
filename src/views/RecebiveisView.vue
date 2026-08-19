<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { useRecebiveis } from '@/composables/useRecebiveis'
import { useIntegradoras } from '@/composables/useIntegradoras'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { STATUS_RECEBIVEL_LABEL } from '@/types/financeiro'
import type { Recebivel, StatusRecebivel } from '@/types/financeiro'

const { ordens } = useOrdens()
const { recebiveis, sincronizarPendentes, registrarValorConfirmado } = useRecebiveis()
const { integradoras } = useIntegradoras()

const sincronizando = ref(false)
const ultimaSincronizacao = ref<number | null>(null)
async function sincronizar() {
  sincronizando.value = true
  try {
    ultimaSincronizacao.value = await sincronizarPendentes(ordens.value)
  } finally {
    sincronizando.value = false
  }
}
onMounted(sincronizar)

// ─── Filtros (Card 5.3) ─────────────────────────────────────────
const filtroSeguradora = ref('')
const filtroStatus = ref<StatusRecebivel | ''>('')
const filtroInicio = ref('')
const filtroFim = ref('')

const filtrados = computed(() => {
  return recebiveis.value.filter((r) => {
    if (filtroSeguradora.value && r.seguradoraId !== filtroSeguradora.value) return false
    if (filtroStatus.value && r.status !== filtroStatus.value) return false
    if (filtroInicio.value && new Date(r.dataFinalizacao) < new Date(filtroInicio.value)) return false
    if (filtroFim.value && new Date(r.dataFinalizacao) > new Date(filtroFim.value + 'T23:59:59')) return false
    return true
  })
})

const totais = computed(() => {
  const esperado = filtrados.value.reduce((s, r) => s + (r.valorEsperado ?? 0), 0)
  const recebido = filtrados.value.filter((r) => r.status === 'conciliado').reduce((s, r) => s + (r.valorConfirmado ?? 0), 0)
  const pendente = filtrados.value.filter((r) => r.status === 'pendente').reduce((s, r) => s + (r.valorEsperado ?? 0), 0)
  const divergente = filtrados.value.filter((r) => r.status === 'divergente').length
  return { esperado, recebido, pendente, divergente }
})

function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

const statusColor: Record<StatusRecebivel, string> = {
  pendente: 'bg-amber-100 text-amber-700 border border-amber-200',
  conciliado: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  divergente: 'bg-red-100 text-red-600 border border-red-200',
}

// ─── Conciliação (Card 5.2) ──────────────────────────────────────
const conciliando = ref<Recebivel | null>(null)
const valorConfirmadoForm = ref<number | undefined>(undefined)
const observacaoForm = ref('')
const salvandoConciliacao = ref(false)

function abrirConciliacao(r: Recebivel) {
  conciliando.value = r
  valorConfirmadoForm.value = r.valorConfirmado ?? r.valorEsperado ?? undefined
  observacaoForm.value = r.observacaoConciliacao ?? ''
}
function fecharConciliacao() { conciliando.value = null }

async function salvarConciliacao() {
  if (!conciliando.value || valorConfirmadoForm.value === undefined) return
  salvandoConciliacao.value = true
  try {
    await registrarValorConfirmado(conciliando.value.id, valorConfirmadoForm.value, observacaoForm.value.trim() || undefined)
    fecharConciliacao()
  } finally {
    salvandoConciliacao.value = false
  }
}

// ─── Exportações (Card 5.3/5.4) ──────────────────────────────────
function exportarCsv() {
  const cabecalho = ['numero_os', 'seguradora', 'servico', 'valor_esperado', 'valor_confirmado', 'status', 'data_finalizacao']
  const linhas = filtrados.value.map((r) => [
    r.osNumero, r.seguradoraNome ?? '', r.servicoTipo, r.valorEsperado ?? '', r.valorConfirmado ?? '', r.status, formatarData(r.dataFinalizacao),
  ])
  baixarCsv(cabecalho, linhas, `recebiveis-${new Date().toISOString().slice(0, 10)}.csv`)
}

function exportarRelatorioPorSeguradora() {
  const grupos = new Map<string, { esperado: number; recebido: number; pendente: number; divergente: number; qtd: number }>()
  for (const r of filtrados.value) {
    const chave = r.seguradoraNome ?? 'Sem seguradora'
    const g = grupos.get(chave) ?? { esperado: 0, recebido: 0, pendente: 0, divergente: 0, qtd: 0 }
    g.esperado += r.valorEsperado ?? 0
    g.qtd += 1
    if (r.status === 'conciliado') g.recebido += r.valorConfirmado ?? 0
    if (r.status === 'pendente') g.pendente += r.valorEsperado ?? 0
    if (r.status === 'divergente') g.divergente += 1
    grupos.set(chave, g)
  }
  const cabecalho = ['seguradora', 'qtd_os', 'total_faturado', 'total_recebido', 'total_pendente', 'qtd_divergente']
  const linhas = [...grupos.entries()].map(([nome, g]) => [nome, g.qtd, g.esperado.toFixed(2), g.recebido.toFixed(2), g.pendente.toFixed(2), g.divergente])
  baixarCsv(cabecalho, linhas, `relatorio-recebiveis-por-seguradora-${new Date().toISOString().slice(0, 10)}.csv`)
}

function baixarCsv(cabecalho: string[], linhas: (string | number)[][], nomeArquivo: string) {
  const csv = [cabecalho, ...linhas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Recebíveis</h2>
          <p class="text-slate-500 text-sm mt-0.5">Valores a receber das seguradoras, gerados a partir de cada OS finalizada.</p>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" class="h-8 text-xs border-slate-200" :disabled="sincronizando" @click="sincronizar">
            {{ sincronizando ? 'Sincronizando...' : 'Gerar lançamentos pendentes' }}
          </Button>
          <Button size="sm" variant="outline" class="h-8 text-xs border-slate-200" @click="exportarCsv">Exportar CSV</Button>
          <Button size="sm" variant="outline" class="h-8 text-xs border-slate-200" @click="exportarRelatorioPorSeguradora">Relatório por seguradora</Button>
        </div>
      </div>
      <p v-if="ultimaSincronizacao !== null" class="text-xs text-slate-400">{{ ultimaSincronizacao }} lançamento(s) novo(s) gerado(s) na última sincronização.</p>

      <!-- Totalizadores -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="rounded-lg border border-slate-200 bg-white p-3">
          <p class="text-xl font-black text-slate-800">{{ formatarMoeda(totais.esperado) }}</p>
          <p class="text-xs text-slate-500">Total faturado</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-3">
          <p class="text-xl font-black text-emerald-600">{{ formatarMoeda(totais.recebido) }}</p>
          <p class="text-xs text-slate-500">Recebido (conciliado)</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-3">
          <p class="text-xl font-black text-amber-600">{{ formatarMoeda(totais.pendente) }}</p>
          <p class="text-xs text-slate-500">Pendente</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-3">
          <p class="text-xl font-black text-red-600">{{ totais.divergente }}</p>
          <p class="text-xs text-slate-500">Divergente(s)</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex items-end gap-3 flex-wrap">
        <div class="space-y-1">
          <Label class="text-xs">Seguradora</Label>
          <select v-model="filtroSeguradora" class="h-9 w-48 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option value="">Todas</option>
            <option v-for="i in integradoras" :key="i.id" :value="i.id">{{ i.nome }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Status</Label>
          <select v-model="filtroStatus" class="h-9 w-40 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option value="">Todos</option>
            <option v-for="(label, s) in STATUS_RECEBIVEL_LABEL" :key="s" :value="s">{{ label }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs">De</Label>
          <input v-model="filtroInicio" type="date" class="h-9 rounded-md border border-slate-200 px-3 text-sm" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Até</Label>
          <input v-model="filtroFim" type="date" class="h-9 rounded-md border border-slate-200 px-3 text-sm" />
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">OS</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Seguradora / Serviço</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Esperado</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmado</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Finalizada em</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtrados" :key="r.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ r.osNumero }}</td>
              <td class="px-4 py-3 text-slate-600">{{ r.seguradoraNome || '—' }}<span class="text-slate-400"> · {{ r.servicoTipo }}</span></td>
              <td class="px-4 py-3 text-slate-700">{{ r.valorEsperado !== null ? formatarMoeda(r.valorEsperado) : 'sem preço' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ r.valorConfirmado !== undefined ? formatarMoeda(r.valorConfirmado) : '—' }}</td>
              <td class="px-4 py-3"><Badge :class="statusColor[r.status]">{{ STATUS_RECEBIVEL_LABEL[r.status] }}</Badge></td>
              <td class="px-4 py-3 text-slate-500">{{ formatarData(r.dataFinalizacao) }}</td>
              <td class="px-4 py-3"><button class="text-xs text-primary font-semibold hover:underline" @click="abrirConciliacao(r)">Registrar valor confirmado</button></td>
            </tr>
            <tr v-if="filtrados.length === 0"><td colspan="7" class="px-4 py-12 text-center text-slate-400">Nenhum recebível encontrado.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal conciliação -->
    <div v-if="conciliando" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="fecharConciliacao" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Conciliar {{ conciliando.osNumero }}</h3>
        <p class="text-xs text-slate-400">Valor esperado (tabela de preços): <strong>{{ conciliando.valorEsperado !== null ? formatarMoeda(conciliando.valorEsperado) : 'sem preço cadastrado' }}</strong></p>
        <div class="space-y-1.5">
          <Label>Valor confirmado pela seguradora (R$) *</Label>
          <Input v-model.number="valorConfirmadoForm" type="number" min="0" step="0.01" />
        </div>
        <div class="space-y-1.5">
          <Label>Observação (opcional)</Label>
          <textarea v-model="observacaoForm" rows="2" class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Ex: glosa parcial, motivo da divergência..." />
        </div>
        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="fecharConciliacao">Cancelar</Button>
          <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="salvandoConciliacao || valorConfirmadoForm === undefined" @click="salvarConciliacao">
            {{ salvandoConciliacao ? 'Salvando...' : 'Salvar' }}
          </Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
