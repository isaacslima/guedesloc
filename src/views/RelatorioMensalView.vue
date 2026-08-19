<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { useRecebiveis } from '@/composables/useRecebiveis'
import { useRepasses } from '@/composables/useRepasses'
import { useConfiguracoesOperacionais } from '@/composables/useConfiguracoesOperacionais'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { calcularSlaRetirada } from '@/lib/slaRetirada'

const { ordens } = useOrdens()
const { recebiveis } = useRecebiveis()
const { repasses } = useRepasses()
const { config } = useConfiguracoesOperacionais()

const hoje = new Date()
const inicioMesPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
const fimMesPadrao = hoje.toISOString().slice(0, 10)

const filtroInicio = ref(inicioMesPadrao)
const filtroFim = ref(fimMesPadrao)

function dentroDoPeriodo(iso: string | undefined): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= new Date(filtroInicio.value).getTime() && t <= new Date(filtroFim.value + 'T23:59:59').getTime()
}

const ordensNoPeriodo = computed(() => ordens.value.filter((o) => dentroDoPeriodo(o.datas.criacao)))
const finalizadasNoPeriodo = computed(() =>
  ordens.value.filter((o) => o.etapa === 'finalizada' && dentroDoPeriodo(o.datas.conclusao ?? o.datas.retiradaReal)),
)

function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Por seguradora ──────────────────────────────────────────────
const porSeguradora = computed(() => {
  const grupos = new Map<string, { qtd: number; faturado: number; recebido: number }>()
  for (const os of finalizadasNoPeriodo.value) {
    const chave = os.seguradoraNome || 'Sem seguradora'
    const g = grupos.get(chave) ?? { qtd: 0, faturado: 0, recebido: 0 }
    g.qtd += 1
    const recebivel = recebiveis.value.find((r) => r.osId === os.id)
    g.faturado += recebivel?.valorEsperado ?? 0
    if (recebivel?.status === 'conciliado') g.recebido += recebivel.valorConfirmado ?? 0
    grupos.set(chave, g)
  }
  return [...grupos.entries()].map(([nome, g]) => ({ nome, ...g }))
})

// ─── Por cidade (volume, todas as OS criadas no período) ─────────
const porCidade = computed(() => {
  const grupos = new Map<string, number>()
  for (const os of ordensNoPeriodo.value) {
    const chave = os.cliente.endereco.cidade || 'Sem cidade'
    grupos.set(chave, (grupos.get(chave) ?? 0) + 1)
  }
  return [...grupos.entries()].map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd)
})

// ─── Por prestador ────────────────────────────────────────────────
const porPrestador = computed(() => {
  const grupos = new Map<string, { qtd: number; valorDevido: number }>()
  for (const os of finalizadasNoPeriodo.value) {
    const nome = os.prestadoresNomes[0]
    if (!nome) continue
    const g = grupos.get(nome) ?? { qtd: 0, valorDevido: 0 }
    g.qtd += 1
    const repasse = repasses.value.find((r) => r.osId === os.id)
    g.valorDevido += repasse?.valorDevido ?? 0
    grupos.set(nome, g)
  }
  return [...grupos.entries()].map(([nome, g]) => ({ nome, ...g }))
})

// ─── Excedente de tempo (retirada além do SLA — Backlog Fase 6, Card 13.2) ──
const excedentes = computed(() =>
  ordens.value
    .map((os) => ({ os, sla: calcularSlaRetirada(os, config.value.slaRetiradaDiasPadrao) }))
    .filter((x) => x.sla.situacao === 'atrasada'),
)
const excedenteMedioDias = computed(() => {
  if (excedentes.value.length === 0) return 0
  const total = excedentes.value.reduce((s, x) => s + (x.sla.diasDesdeEntrega - x.sla.prazoDias), 0)
  return total / excedentes.value.length
})

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

function exportarTudo() {
  const cabecalho = ['agrupamento', 'chave', 'qtd_os', 'valor']
  const linhas: (string | number)[][] = [
    ...porSeguradora.value.map((g) => ['seguradora', g.nome, g.qtd, g.faturado.toFixed(2)]),
    ...porCidade.value.map((g) => ['cidade', g.nome, g.qtd, '']),
    ...porPrestador.value.map((g) => ['prestador', g.nome, g.qtd, g.valorDevido.toFixed(2)]),
  ]
  baixarCsv(cabecalho, linhas, `relatorio-mensal-${filtroInicio.value}-a-${filtroFim.value}.csv`)
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Relatório Mensal</h2>
          <p class="text-slate-500 text-sm mt-0.5">Totais por seguradora, cidade e prestador, com excedente de tempo de retirada.</p>
        </div>
        <Button size="sm" variant="outline" class="h-8 text-xs border-slate-200" @click="exportarTudo">Exportar CSV</Button>
      </div>

      <div class="flex items-end gap-3">
        <div class="space-y-1">
          <Label class="text-xs">De</Label>
          <input v-model="filtroInicio" type="date" class="h-9 rounded-md border border-slate-200 px-3 text-sm" />
        </div>
        <div class="space-y-1">
          <Label class="text-xs">Até</Label>
          <input v-model="filtroFim" type="date" class="h-9 rounded-md border border-slate-200 px-3 text-sm" />
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div class="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">Por seguradora</div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500">Seguradora</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500">Qtd. OS</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500">Faturado</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500">Recebido</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in porSeguradora" :key="g.nome" class="border-b border-slate-100">
                <td class="px-4 py-2 text-slate-700">{{ g.nome }}</td>
                <td class="px-4 py-2 text-slate-600">{{ g.qtd }}</td>
                <td class="px-4 py-2 text-slate-700">{{ formatarMoeda(g.faturado) }}</td>
                <td class="px-4 py-2 text-emerald-600">{{ formatarMoeda(g.recebido) }}</td>
              </tr>
              <tr v-if="porSeguradora.length === 0"><td colspan="4" class="px-4 py-8 text-center text-slate-400">Nenhuma OS finalizada no período.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div class="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">Por cidade (volume de OS criadas no período)</div>
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="g in porCidade" :key="g.nome" class="border-b border-slate-100">
                <td class="px-4 py-2 text-slate-700">{{ g.nome }}</td>
                <td class="px-4 py-2 text-slate-600 text-right">{{ g.qtd }}</td>
              </tr>
              <tr v-if="porCidade.length === 0"><td colspan="2" class="px-4 py-8 text-center text-slate-400">Nenhuma OS no período.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div class="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">Por prestador</div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500">Prestador</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500">Qtd. OS</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500">Repasse devido</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in porPrestador" :key="g.nome" class="border-b border-slate-100">
                <td class="px-4 py-2 text-slate-700">{{ g.nome }}</td>
                <td class="px-4 py-2 text-slate-600">{{ g.qtd }}</td>
                <td class="px-4 py-2 text-slate-700">{{ formatarMoeda(g.valorDevido) }}</td>
              </tr>
              <tr v-if="porPrestador.length === 0"><td colspan="3" class="px-4 py-8 text-center text-slate-400">Nenhuma OS finalizada no período.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-2">
          <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Excedente de tempo (retirada além do prazo — situação atual)</p>
          <p class="text-3xl font-black text-red-600">{{ excedentes.length }}</p>
          <p class="text-xs text-slate-500">OS aguardando retirada, além do prazo de {{ config.slaRetiradaDiasPadrao }} dias.</p>
          <p v-if="excedentes.length > 0" class="text-xs text-slate-500">Média de {{ excedenteMedioDias.toFixed(1) }} dias além do prazo, entre elas.</p>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
