<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useOrdensIntegradas, type OrdemIntegrada } from '@/composables/useOrdensIntegradas'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useVueTable,
  FlexRender,
} from '@tanstack/vue-table'
import type { OSStatusCanonico } from '@/types/integracao'

const { ordensIntegradas } = useOrdensIntegradas()

const globalFilter = ref('')
const integradoraFilter = ref('')
const statusFilterOS = ref<OSStatusCanonico | ''>('')
const columnHelper = createColumnHelper<OrdemIntegrada>()

const ordensFiltradas = computed(() => {
  return ordensIntegradas.value.filter((os) => {
    if (integradoraFilter.value && os.seguradoraId !== integradoraFilter.value) return false
    if (statusFilterOS.value && os.status !== statusFilterOS.value) return false
    return true
  })
})

// ─── Telefone de teste (WhatsApp) ──────────────────────────────
// Enquanto em teste, o telefone de envio fica fixo no navegador (não vem da
// OS) — salvo no localStorage pra sobreviver a reload da página.
const WHATSAPP_TELEFONE_STORAGE_KEY = 'guedesloc:whatsapp-telefone-teste'
const telefoneTeste = ref(localStorage.getItem(WHATSAPP_TELEFONE_STORAGE_KEY) ?? '')
watch(telefoneTeste, (valor) => localStorage.setItem(WHATSAPP_TELEFONE_STORAGE_KEY, valor))

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

function abrirWhatsapp(os: OrdemIntegrada): void {
  const telefone = apenasDigitos(telefoneTeste.value)
  if (!telefone) return

  const endereco = os.cliente?.endereco || '—'
  const agendamento = formatarData(os.datas?.agendamento)
  const mensagem = `olá segue serviço de fornecimento de caçamba endereço: ${endereco} agendamento: ${agendamento}`
  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer')
}

const statusColors: Record<OSStatusCanonico, string> = {
  aberta: 'bg-amber-100 text-amber-700 border border-amber-200',
  em_andamento: 'bg-blue-100 text-blue-700 border border-blue-200',
  concluida: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelada: 'bg-red-100 text-red-600 border border-red-200',
}

const statusLabel: Record<OSStatusCanonico, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatarValor(valor: number | undefined): string {
  if (typeof valor !== 'number') return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const columns = [
  columnHelper.accessor('seguradoraNome', { header: 'Integradora' }),
  columnHelper.accessor('numeroOsSeguradora', {
    header: 'Nº OS',
    cell: (info) => h('span', { class: 'font-mono font-semibold text-slate-800' }, info.getValue()),
  }),
  columnHelper.accessor((row) => row.cliente?.nome, {
    id: 'clienteNome',
    header: 'Cliente',
  }),
  columnHelper.accessor((row) => row.servico?.tipo, {
    id: 'servicoTipo',
    header: 'Serviço',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => h(Badge, { class: statusColors[info.getValue()] }, () => statusLabel[info.getValue()]),
  }),
  columnHelper.accessor((row) => row.datas?.criacao, {
    id: 'dataCriacao',
    header: 'Criada em',
    cell: (info) => formatarData(info.getValue()),
  }),
  columnHelper.display({
    id: 'acoes',
    header: 'Ações',
    cell: (info) => h(Button, {
      size: 'sm',
      variant: 'outline',
      class: 'h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed',
      disabled: !apenasDigitos(telefoneTeste.value),
      title: apenasDigitos(telefoneTeste.value) ? 'Enviar WhatsApp' : 'Informe um telefone de teste no topo da página',
      onClick: (evento: MouseEvent) => {
        evento.stopPropagation()
        abrirWhatsapp(info.row.original)
      },
    }, () => 'WhatsApp'),
  }),
]

const table = useVueTable({
  get data() { return ordensFiltradas.value },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  state: { get globalFilter() { return globalFilter.value } },
  onGlobalFilterChange: (v) => { globalFilter.value = v as string },
  initialState: { pagination: { pageSize: 10 } },
})

// ─── Painel de detalhe (só leitura) ────────────────────────────
const selecionada = ref<OrdemIntegrada | null>(null)

function abrirDetalhe(os: OrdemIntegrada) { selecionada.value = os }
function fecharDetalhe() { selecionada.value = null }

const camposAdicionaisDetalhe = computed(() => {
  const extras = selecionada.value?.camposAdicionais
  if (!extras) return []
  const rotulos: Record<string, string> = {
    seguradoraFinal: 'Seguradora final',
    segmento: 'Segmento',
    tipoAcionamento: 'Tipo de acionamento',
    valorTempo: 'Valor tempo',
    valorUsuario: 'Valor usuário',
    previsaoFim: 'Previsão fim',
    dataAceite: 'Data de aceite',
    condicaoServico: 'Condição do serviço',
    resumoProblema: 'Resumo do problema',
  }
  return Object.entries(rotulos)
    .map(([chave, rotulo]) => ({ rotulo, valor: extras[chave] }))
    .filter(({ valor }) => valor !== null && valor !== undefined && valor !== '')
})

const totalAbertas = computed(() => ordensIntegradas.value.filter((o) => o.status === 'aberta').length)
const totalEmAndamento = computed(() => ordensIntegradas.value.filter((o) => o.status === 'em_andamento').length)
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Ordens de Serviço Integradas</h2>
          <p class="text-slate-500 text-sm mt-0.5">
            {{ ordensIntegradas.length }} total · {{ totalAbertas }} abertas · {{ totalEmAndamento }} em andamento ·
            recebidas automaticamente via integração (RPA/API) — não editáveis aqui
          </p>
        </div>

        <div class="flex flex-col items-end gap-1">
          <Label for="whatsapp-telefone-teste" class="text-xs text-slate-500">Telefone de teste (WhatsApp)</Label>
          <Input
            id="whatsapp-telefone-teste"
            v-model="telefoneTeste"
            placeholder="Ex: 5511999999999"
            class="w-[220px] border-slate-200"
          />
        </div>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <Input v-model="globalFilter" placeholder="Buscar por número, cliente, serviço..." class="max-w-xs border-slate-200" />

        <select
          v-model="integradoraFilter"
          class="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todas as integradoras</option>
          <option value="tempo_assist">Tempo Assist</option>
        </select>

        <select
          v-model="statusFilterOS"
          class="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos os status</option>
          <option v-for="(rotulo, chave) in statusLabel" :key="chave" :value="chave">{{ rotulo }}</option>
        </select>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th v-for="header in (table.getHeaderGroups()[0]?.headers ?? [])" :key="header.id"
                class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in table.getRowModel().rows" :key="row.id"
              class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
              @click="abrirDetalhe(row.original)">
              <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="px-4 py-3 text-slate-700">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </td>
            </tr>
            <tr v-if="table.getRowModel().rows.length === 0">
              <td :colspan="columns.length" class="px-4 py-12 text-center text-slate-400">Nenhuma OS integrada encontrada.</td>
            </tr>
          </tbody>
        </table>
        <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <span class="text-xs text-slate-500">Página {{ table.getState().pagination.pageIndex + 1 }} de {{ table.getPageCount() || 1 }}</span>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" class="h-8 text-xs" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">← Anterior</Button>
            <Button size="sm" variant="outline" class="h-8 text-xs" :disabled="!table.getCanNextPage()" @click="table.nextPage()">Próxima →</Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Painel de detalhe -->
    <div v-if="selecionada" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="fecharDetalhe" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-900">{{ selecionada.numeroOsSeguradora }}</h3>
            <p class="text-xs text-slate-500">{{ selecionada.seguradoraNome }}</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 transition-colors" @click="fecharDetalhe">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <Badge :class="statusColors[selecionada.status]">{{ statusLabel[selecionada.status] }}</Badge>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</p>
            <p class="text-sm text-slate-800 font-medium">{{ selecionada.cliente?.nome }}</p>
            <p v-if="selecionada.cliente?.telefone" class="text-sm text-slate-600">{{ selecionada.cliente.telefone }}</p>
            <p class="text-sm text-slate-600">{{ selecionada.cliente?.endereco }}</p>
          </div>

          <div class="col-span-2 space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Serviço</p>
            <p class="text-sm text-slate-800 font-medium">{{ selecionada.servico?.tipo }}</p>
            <p v-if="selecionada.servico?.descricao" class="text-sm text-slate-600 whitespace-pre-line">{{ selecionada.servico.descricao }}</p>
            <p class="text-sm text-slate-600">Valor: {{ formatarValor(selecionada.servico?.valor) }}</p>
          </div>

          <div class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Criada em</p>
            <p class="text-sm text-slate-600">{{ formatarData(selecionada.datas?.criacao) }}</p>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Agendamento</p>
            <p class="text-sm text-slate-600">{{ formatarData(selecionada.datas?.agendamento) }}</p>
          </div>

          <div v-if="camposAdicionaisDetalhe.length > 0" class="col-span-2 space-y-2 pt-2 border-t border-slate-100">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Detalhes adicionais</p>
            <div v-for="campo in camposAdicionaisDetalhe" :key="campo.rotulo" class="text-sm">
              <span class="text-slate-500">{{ campo.rotulo }}:</span>
              <span class="text-slate-700 ml-1 whitespace-pre-line">{{ campo.valor }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" @click="fecharDetalhe">Fechar</Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
