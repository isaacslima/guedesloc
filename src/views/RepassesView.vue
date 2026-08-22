<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { usePrestadores } from '@/composables/usePrestadores'
import { useRecebiveis } from '@/composables/useRecebiveis'
import { useRepasses } from '@/composables/useRepasses'
import { useLotesPagamento } from '@/composables/useLotesPagamento'
import { useUsuarioAtual } from '@/composables/useUsuarioAtual'
import { registrarAuditoria } from '@/composables/useAuditoria'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { STATUS_REPASSE_LABEL } from '@/types/financeiro'
import type { LotePagamento } from '@/types/financeiro'

const { ordens } = useOrdens()
const { prestadores } = usePrestadores()
const { recebiveis } = useRecebiveis()
const { repasses, sincronizarPendentes } = useRepasses()
const { lotes, gerarLote, marcarPago } = useLotesPagamento()
const { usuarioAtual } = useUsuarioAtual()

const aba = ref<'repasses' | 'lotes'>('repasses')

const sincronizando = ref(false)
const ultimaSincronizacao = ref<number | null>(null)
async function sincronizar() {
  sincronizando.value = true
  try {
    ultimaSincronizacao.value = await sincronizarPendentes(ordens.value, prestadores.value, recebiveis.value)
  } finally {
    sincronizando.value = false
  }
}
onMounted(sincronizar)

function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

const statusColor: Record<string, string> = {
  sem_regra: 'bg-slate-100 text-slate-600 border border-slate-200',
  pendente: 'bg-amber-100 text-amber-700 border border-amber-200',
  em_lote: 'bg-blue-100 text-blue-700 border border-blue-200',
  pago: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

// ─── Geração de lote por prestador (Card 6.2) ────────────────────
const prestadorSelecionado = ref('')
const pendentesDoSelecionado = computed(() =>
  repasses.value.filter((r) => r.prestadorId === prestadorSelecionado.value && r.status === 'pendente'),
)
const selecionados = ref<Set<string>>(new Set())

function alternarSelecao(id: string) {
  if (selecionados.value.has(id)) selecionados.value.delete(id)
  else selecionados.value.add(id)
}
function selecionarTodos() {
  selecionados.value = new Set(pendentesDoSelecionado.value.map((r) => r.id))
}

const repassesParaLote = computed(() => pendentesDoSelecionado.value.filter((r) => selecionados.value.has(r.id)))
const valorLote = computed(() => repassesParaLote.value.reduce((s, r) => s + r.valorDevido, 0))

const gerandoLote = ref(false)
async function confirmarGerarLote() {
  if (!prestadorSelecionado.value || repassesParaLote.value.length === 0) return
  gerandoLote.value = true
  try {
    const datas = repassesParaLote.value.map((r) => new Date(r.dataFinalizacao).getTime())
    const periodoInicio = new Date(Math.min(...datas)).toISOString()
    const periodoFim = new Date(Math.max(...datas)).toISOString()
    const prestadorNome = prestadores.value.find((p) => p.id === prestadorSelecionado.value)?.nome ?? ''
    await gerarLote(prestadorSelecionado.value, prestadorNome, periodoInicio, periodoFim, repassesParaLote.value)
    selecionados.value = new Set()
  } finally {
    gerandoLote.value = false
  }
}

// ─── Histórico de lotes / marcar pago + comprovante (Card 6.4) ──
const marcandoLote = ref<LotePagamento | null>(null)
const comprovanteForm = ref('')
const salvandoPagamento = ref(false)

function abrirMarcarPago(lote: LotePagamento) {
  marcandoLote.value = lote
  comprovanteForm.value = ''
}
function fecharMarcarPago() { marcandoLote.value = null }

async function confirmarPagamento() {
  if (!marcandoLote.value) return
  salvandoPagamento.value = true
  try {
    const repasseIds = repasses.value.filter((r) => r.loteId === marcandoLote.value!.id).map((r) => r.id)
    await marcarPago(marcandoLote.value.id, repasseIds, comprovanteForm.value.trim() || undefined)
    // Ação sensível (Backlog Fase 10, Card 8.3 — LGPD): aprovação de pagamento.
    registrarAuditoria({
      tipo: 'pagamento_aprovado',
      descricao: `Lote de pagamento aprovado — ${marcandoLote.value.prestadorNome}, ${formatarMoeda(marcandoLote.value.valorTotal)}, ${marcandoLote.value.totalOS} OS`,
      usuarioUid: usuarioAtual.value?.uid ?? '',
      usuarioNome: usuarioAtual.value?.nome ?? '',
      entidadeTipo: 'lote_pagamento',
      entidadeId: marcandoLote.value.id,
      entidadeLabel: marcandoLote.value.prestadorNome,
    }).catch(() => {})
    fecharMarcarPago()
  } finally {
    salvandoPagamento.value = false
  }
}

function exportarLoteCsv(lote: LotePagamento) {
  const itens = repasses.value.filter((r) => r.loteId === lote.id)
  const cabecalho = ['numero_os', 'valor', 'data_finalizacao']
  const linhas = itens.map((r) => [r.osNumero, r.valorDevido.toFixed(2), formatarData(r.dataFinalizacao)])
  const csv = [cabecalho, ...linhas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lote-pagamento-${lote.prestadorNome.replace(/\s+/g, '-')}-${lote.id}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Repasses a Prestadores</h2>
          <p class="text-slate-500 text-sm mt-0.5">Cálculo automático por OS finalizada, agrupamento em lotes de pagamento e histórico com comprovante.</p>
        </div>
        <Button size="sm" variant="outline" class="h-8 text-xs border-slate-200" :disabled="sincronizando" @click="sincronizar">
          {{ sincronizando ? 'Sincronizando...' : 'Gerar repasses pendentes' }}
        </Button>
      </div>
      <p v-if="ultimaSincronizacao !== null" class="text-xs text-slate-400">{{ ultimaSincronizacao }} repasse(s) novo(s) gerado(s) na última sincronização.</p>

      <div class="flex items-center gap-2">
        <button class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors" :class="aba === 'repasses' ? 'bg-primary text-slate-900 border-primary' : 'bg-white text-slate-600 border-slate-200'" @click="aba = 'repasses'">Gerar lote · {{ repasses.filter(r => r.status === 'pendente').length }} pendente(s)</button>
        <button class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors" :class="aba === 'lotes' ? 'bg-primary text-slate-900 border-primary' : 'bg-white text-slate-600 border-slate-200'" @click="aba = 'lotes'">Lotes e histórico · {{ lotes.length }}</button>
      </div>

      <!-- Aba: gerar lote -->
      <div v-if="aba === 'repasses'" class="space-y-4">
        <div class="space-y-1 max-w-xs">
          <Label class="text-xs">Prestador</Label>
          <select v-model="prestadorSelecionado" class="h-9 w-full rounded-md border border-slate-200 px-3 text-sm bg-white" @change="selecionados = new Set()">
            <option value="">Selecione um prestador...</option>
            <option v-for="p in prestadores" :key="p.id" :value="p.id">{{ p.nome }}</option>
          </select>
        </div>

        <div v-if="prestadorSelecionado" class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
            <button class="text-xs text-primary font-semibold hover:underline" @click="selecionarTodos">Selecionar todos pendentes</button>
            <span class="text-xs text-slate-500">{{ repassesParaLote.length }} selecionado(s) · {{ formatarMoeda(valorLote) }}</span>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-2 w-8"></th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">OS</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Regra</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Finalizada em</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in pendentesDoSelecionado" :key="r.id" class="border-b border-slate-100">
                <td class="px-4 py-2"><input type="checkbox" :checked="selecionados.has(r.id)" @change="alternarSelecao(r.id)" /></td>
                <td class="px-4 py-2 font-mono font-semibold text-slate-800">{{ r.osNumero }}</td>
                <td class="px-4 py-2 text-slate-500">{{ r.regraTipo === 'percentual' ? `${r.regraValor}%` : r.regraTipo === 'valor_fixo' ? 'Fixo' : '—' }}</td>
                <td class="px-4 py-2 text-slate-700">{{ formatarMoeda(r.valorDevido) }}</td>
                <td class="px-4 py-2 text-slate-500">{{ formatarData(r.dataFinalizacao) }}</td>
              </tr>
              <tr v-if="pendentesDoSelecionado.length === 0"><td colspan="5" class="px-4 py-8 text-center text-slate-400">Nenhum repasse pendente pra esse prestador.</td></tr>
            </tbody>
          </table>
          <div class="px-4 py-3 border-t border-slate-100 flex justify-end">
            <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="gerandoLote || repassesParaLote.length === 0" @click="confirmarGerarLote">
              {{ gerandoLote ? 'Gerando...' : `Gerar lote (${repassesParaLote.length} OS)` }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Aba: lotes / histórico -->
      <div v-else class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prestador</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Período</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd. OS</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Comprovante</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in lotes" :key="l.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 text-slate-700">{{ l.prestadorNome }}</td>
              <td class="px-4 py-3 text-slate-500">{{ formatarData(l.periodoInicio) }} – {{ formatarData(l.periodoFim) }}</td>
              <td class="px-4 py-3 text-slate-600">{{ l.totalOS }}</td>
              <td class="px-4 py-3 font-semibold text-slate-800">{{ formatarMoeda(l.valorTotal) }}</td>
              <td class="px-4 py-3"><Badge :class="l.status === 'pago' ? statusColor.pago : statusColor.em_lote">{{ l.status === 'pago' ? 'Pago' : 'Gerado' }}</Badge></td>
              <td class="px-4 py-3">
                <a v-if="l.comprovanteUrl" :href="l.comprovanteUrl" target="_blank" rel="noopener" class="text-xs text-primary hover:underline">Ver comprovante</a>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
              <td class="px-4 py-3 flex items-center gap-3">
                <button class="text-xs text-primary font-semibold hover:underline" @click="exportarLoteCsv(l)">Exportar CSV</button>
                <button v-if="l.status !== 'pago'" class="text-xs text-primary font-semibold hover:underline" @click="abrirMarcarPago(l)">Marcar como pago</button>
              </td>
            </tr>
            <tr v-if="lotes.length === 0"><td colspan="7" class="px-4 py-12 text-center text-slate-400">Nenhum lote gerado ainda.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal marcar pago -->
    <div v-if="marcandoLote" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="fecharMarcarPago" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Marcar lote como pago</h3>
        <p class="text-sm text-slate-600">{{ marcandoLote.prestadorNome }} · {{ formatarMoeda(marcandoLote.valorTotal) }} · {{ marcandoLote.totalOS }} OS</p>
        <div class="space-y-1.5">
          <Label>Link do comprovante (opcional)</Label>
          <Input v-model="comprovanteForm" placeholder="https://..." />
          <p class="text-xs text-slate-400">Cole o link de onde o comprovante está guardado (Drive, banco etc.).</p>
        </div>
        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="fecharMarcarPago">Cancelar</Button>
          <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="salvandoPagamento" @click="confirmarPagamento">
            {{ salvandoPagamento ? 'Salvando...' : 'Confirmar pagamento' }}
          </Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
