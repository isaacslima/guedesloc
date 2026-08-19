<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { useConfiguracoesOperacionais } from '@/composables/useConfiguracoesOperacionais'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ETAPAS_KANBAN, ETAPA_LABEL, ETAPA_COR } from '@/lib/etapaLabels'
import { calcularSlaRetirada } from '@/lib/slaRetirada'
import type { OrdemUnificada, OSEtapa } from '@/types/ordem'

const { ordens, moverEtapaManual } = useOrdens()
const { config } = useConfiguracoesOperacionais()

// ─── Modos de visualização (Card 9.8) ──────────────────────────
const modo = ref<'kanban' | 'lista' | 'agenda'>('kanban')

// ─── Filtros rápidos (Card 9.9) ────────────────────────────────
type FiltroRapido = '' | 'minha_atencao' | 'hoje' | 'amanha' | 'proximos_2_dias' | 'sem_prestador' | 'entregas_hoje' | 'pendencias' | 'retirada_vencendo'
const filtroRapido = ref<FiltroRapido>('')

function mesmoDia(iso: string | undefined, data: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.toDateString() === data.toDateString()
}

function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

function ultimaTransicaoEm(os: OrdemUnificada): string {
  return os.historico.length > 0 ? os.historico[os.historico.length - 1]!.em : os.datas.criacao
}

function precisaAtencao(os: OrdemUnificada): boolean {
  if (os.etapa === 'pendencia' || os.etapa === 'aguardando_distribuicao') return true
  if (os.etapa === 'distribuindo_aguardando_resposta' && horasDesde(ultimaTransicaoEm(os)) > 2) return true
  return false
}

/** SLA de retirada de verdade (Backlog Fase 6, Card 13.2) — mesma fonte usada em /retiradas. */
function retiradaVencendo(os: OrdemUnificada): boolean {
  const situacao = calcularSlaRetirada(os, config.value.slaRetiradaDiasPadrao).situacao
  return situacao === 'atrasada' || situacao === 'vence_hoje'
}

const hoje = new Date()
const amanha = new Date(hoje.getTime() + 24 * 3_600_000)

const ordensFiltradas = computed(() => {
  switch (filtroRapido.value) {
    case 'minha_atencao':
      return ordens.value.filter(precisaAtencao)
    case 'hoje':
      return ordens.value.filter((o) => mesmoDia(o.datas.agendamento, hoje))
    case 'amanha':
      return ordens.value.filter((o) => mesmoDia(o.datas.agendamento, amanha))
    case 'proximos_2_dias':
      return ordens.value.filter((o) => {
        if (!o.datas.agendamento) return false
        const dias = (new Date(o.datas.agendamento).getTime() - Date.now()) / 86_400_000
        return dias >= 0 && dias <= 2
      })
    case 'sem_prestador':
      return ordens.value.filter((o) => o.etapa === 'aguardando_distribuicao')
    case 'entregas_hoje':
      return ordens.value.filter((o) => o.etapa === 'aguardando_entrega' && mesmoDia(o.datas.agendamento, hoje))
    case 'pendencias':
      return ordens.value.filter((o) => o.etapa === 'pendencia')
    case 'retirada_vencendo':
      return ordens.value.filter(retiradaVencendo)
    default:
      return ordens.value
  }
})

const indicadores = computed(() => ({
  semPrestador: ordens.value.filter((o) => o.etapa === 'aguardando_distribuicao').length,
  entregasHoje: ordens.value.filter((o) => o.etapa === 'aguardando_entrega' && mesmoDia(o.datas.agendamento, hoje)).length,
  pendencias: ordens.value.filter((o) => o.etapa === 'pendencia').length,
  retiradaVencendo: ordens.value.filter(retiradaVencendo).length,
}))

function ordensDaColuna(etapa: OSEtapa): OrdemUnificada[] {
  return ordensFiltradas.value.filter((o) => o.etapa === etapa)
}

function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR')
}

function ehUrgente(os: OrdemUnificada): boolean {
  if (['finalizada', 'cancelada', 'pendencia'].includes(os.etapa)) return false
  if (!os.datas.agendamento) return false
  return new Date(os.datas.agendamento).getTime() <= Date.now()
}

// ─── Mover etapa (motivo obrigatório) ──────────────────────────
const osSelecionada = ref<OrdemUnificada | null>(null)
const etapaDestino = ref<OSEtapa | ''>('')
const motivo = ref('')
const movendoErro = ref('')
const movendo = ref(false)

function abrirMover(os: OrdemUnificada) {
  osSelecionada.value = os
  etapaDestino.value = ''
  motivo.value = ''
  movendoErro.value = ''
}
function fecharMover() { osSelecionada.value = null }

async function confirmarMover() {
  if (!osSelecionada.value || !etapaDestino.value) return
  if (!motivo.value.trim()) { movendoErro.value = 'Motivo é obrigatório.'; return }
  movendo.value = true
  try {
    await moverEtapaManual(osSelecionada.value.id, etapaDestino.value, motivo.value.trim())
    fecharMover()
  } catch (err) {
    movendoErro.value = err instanceof Error ? err.message : 'Falha ao mover.'
  } finally {
    movendo.value = false
  }
}

// ─── Exportar CSV (Card 9.10) ──────────────────────────────────
function exportarCsv() {
  const cabecalho = ['numero', 'origem', 'etapa', 'cliente', 'cidade', 'servico', 'agendamento']
  const linhas = ordensFiltradas.value.map((o) => [
    o.numero, o.origem, o.etapa, o.cliente.nome,
    o.cliente.endereco.cidade ?? '', o.servico.tipo, o.datas.agendamento ?? '',
  ])
  const csv = [cabecalho, ...linhas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ordens-servico-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Central de OS</h2>
          <p class="text-slate-500 text-sm mt-0.5">{{ ordensFiltradas.length }} de {{ ordens.length }} OS · escolha o prestador e acompanhe cada etapa.</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex rounded-md border border-slate-200 overflow-hidden">
            <button v-for="m in (['kanban', 'lista', 'agenda'] as const)" :key="m"
              class="px-3 py-1.5 text-xs font-semibold capitalize"
              :class="modo === m ? 'bg-primary text-slate-900' : 'bg-white text-slate-500 hover:bg-slate-50'"
              @click="modo = m"
            >{{ m }}</button>
          </div>
          <Button size="sm" variant="outline" class="h-8 text-xs border-slate-200" @click="exportarCsv">Exportar CSV</Button>
        </div>
      </div>

      <!-- Indicadores "Precisa de atenção" -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button class="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-primary transition-colors" @click="filtroRapido = filtroRapido === 'sem_prestador' ? '' : 'sem_prestador'">
          <p class="text-2xl font-black text-amber-600">{{ indicadores.semPrestador }}</p>
          <p class="text-xs text-slate-500">Sem prestador</p>
        </button>
        <button class="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-primary transition-colors" @click="filtroRapido = filtroRapido === 'entregas_hoje' ? '' : 'entregas_hoje'">
          <p class="text-2xl font-black text-blue-600">{{ indicadores.entregasHoje }}</p>
          <p class="text-xs text-slate-500">Entregas de hoje</p>
        </button>
        <button class="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-primary transition-colors" @click="filtroRapido = filtroRapido === 'pendencias' ? '' : 'pendencias'">
          <p class="text-2xl font-black text-orange-600">{{ indicadores.pendencias }}</p>
          <p class="text-xs text-slate-500">Pendências</p>
        </button>
        <button class="rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-primary transition-colors" @click="filtroRapido = filtroRapido === 'retirada_vencendo' ? '' : 'retirada_vencendo'">
          <p class="text-2xl font-black text-red-600">{{ indicadores.retiradaVencendo }}</p>
          <p class="text-xs text-slate-500">Retirada vencendo</p>
        </button>
      </div>

      <!-- Filtros rápidos -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="f in ([['minha_atencao', 'Minha atenção'], ['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['proximos_2_dias', 'Próximos 2 dias']] as const)"
          :key="f[0]"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          :class="filtroRapido === f[0] ? 'bg-primary text-slate-900 border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          @click="filtroRapido = filtroRapido === f[0] ? '' : f[0]"
        >{{ f[1] }}</button>
        <button v-if="filtroRapido" class="text-xs text-slate-400 hover:text-slate-600 underline" @click="filtroRapido = ''">Limpar filtro</button>
      </div>

      <!-- Kanban -->
      <div v-if="modo === 'kanban'" class="flex gap-3 overflow-x-auto pb-4">
        <div v-for="etapa in ETAPAS_KANBAN" :key="etapa" class="w-72 shrink-0 space-y-2">
          <div class="flex items-center justify-between px-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ ETAPA_LABEL[etapa] }}</p>
            <Badge class="bg-slate-100 text-slate-600 border border-slate-200 text-xs">{{ ordensDaColuna(etapa).length }}</Badge>
          </div>
          <div class="space-y-2 min-h-[80px]">
            <div v-if="ordensDaColuna(etapa).length === 0" class="text-xs text-slate-400 italic px-1">Nenhuma OS nesta etapa.</div>
            <div v-for="os in ordensDaColuna(etapa)" :key="os.id" class="rounded-lg border border-slate-200 bg-white shadow-sm p-3 space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono font-semibold text-sm text-slate-800">{{ os.numero }}</span>
                <Badge v-if="ehUrgente(os)" class="bg-red-100 text-red-600 border border-red-200 text-[10px]">URGENTE</Badge>
              </div>
              <p class="text-xs text-slate-600">{{ os.cliente.endereco.cidade || '—' }}<span v-if="os.seguradoraNome"> · {{ os.seguradoraNome }}</span></p>
              <p class="text-xs text-slate-500">{{ os.prestadoresNomes[0] || 'Sem prestador' }}</p>
              <p class="text-xs text-slate-400">{{ formatarData(os.datas.agendamento) }}</p>
              <p v-if="etapa === 'distribuindo_aguardando_resposta'" class="text-[11px] text-amber-600">
                Sem resposta há {{ Math.floor(horasDesde(ultimaTransicaoEm(os))) }}h
              </p>
              <button class="text-xs text-primary font-semibold hover:underline pt-1" @click="abrirMover(os)">Mover para...</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista -->
      <div v-else-if="modo === 'lista'" class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prestador</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Agendamento</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="os in ordensFiltradas" :key="os.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ os.numero }}</td>
              <td class="px-4 py-3 text-slate-700">{{ os.cliente.nome }}</td>
              <td class="px-4 py-3"><Badge :class="ETAPA_COR[os.etapa]">{{ ETAPA_LABEL[os.etapa] }}</Badge></td>
              <td class="px-4 py-3 text-slate-600">{{ os.prestadoresNomes[0] || '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ formatarData(os.datas.agendamento) }}</td>
              <td class="px-4 py-3"><button class="text-xs text-primary font-semibold hover:underline" @click="abrirMover(os)">Mover para...</button></td>
            </tr>
            <tr v-if="ordensFiltradas.length === 0"><td colspan="6" class="px-4 py-12 text-center text-slate-400">Nenhuma OS encontrada.</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Agenda (agrupada por data de agendamento) -->
      <div v-else class="space-y-4">
        <div
          v-for="[data, lista] in Object.entries(
            ordensFiltradas.reduce((acc, o) => {
              const chave = o.datas.agendamento ? formatarData(o.datas.agendamento) : 'Sem data'
              ;(acc[chave] ??= []).push(o)
              return acc
            }, {} as Record<string, OrdemUnificada[]>)
          )"
          :key="data"
          class="rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div class="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">{{ data }} · {{ lista.length }} OS</div>
          <div class="divide-y divide-slate-100">
            <div v-for="os in lista" :key="os.id" class="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
              <span class="font-mono font-semibold text-slate-800">{{ os.numero }}</span>
              <span class="text-slate-600 flex-1 truncate">{{ os.cliente.nome }}</span>
              <Badge :class="ETAPA_COR[os.etapa]">{{ ETAPA_LABEL[os.etapa] }}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal mover etapa -->
    <div v-if="osSelecionada" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="fecharMover" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Mover {{ osSelecionada.numero }}</h3>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Nova etapa *</label>
          <select v-model="etapaDestino" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Selecione...</option>
            <option v-for="etapa in ETAPAS_KANBAN" :key="etapa" :value="etapa">{{ ETAPA_LABEL[etapa] }}</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Motivo *</label>
          <textarea v-model="motivo" rows="2" placeholder="Por que essa OS está mudando de etapa manualmente?" class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
        <p v-if="movendoErro" class="text-xs text-red-500">{{ movendoErro }}</p>
        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="fecharMover">Cancelar</Button>
          <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="movendo || !etapaDestino || !motivo.trim()" @click="confirmarMover">
            {{ movendo ? 'Movendo...' : 'Mover' }}
          </Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
