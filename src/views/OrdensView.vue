<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { useClientes } from '@/composables/useClientes'
import { useEquipamentos } from '@/composables/useEquipamentos'
import { usePrestadores } from '@/composables/usePrestadores'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useVueTable,
  FlexRender,
} from '@tanstack/vue-table'
import type { OrdemUnificada, OrdemUnificadaInput, OSStatus, OSOrigem } from '@/types/ordem'

const { ordens, addOrdem, updateOrdem, deleteOrdem } = useOrdens()
const { clientes } = useClientes()
const { equipamentos } = useEquipamentos()
const { prestadores } = usePrestadores()

const globalFilter = ref('')
const statusFilter = ref<OSStatus | ''>('')
const origemFilter = ref<'' | 'manual' | 'integrada'>('')

function ehIntegrada(origem: OSOrigem): boolean {
  return origem !== 'manual'
}

const filteredOrdens = computed(() => {
  return ordens.value.filter((o) => {
    if (statusFilter.value && o.status !== statusFilter.value) return false
    if (origemFilter.value === 'manual' && o.origem !== 'manual') return false
    if (origemFilter.value === 'integrada' && !ehIntegrada(o.origem)) return false
    return true
  })
})

const columnHelper = createColumnHelper<OrdemUnificada>()

const statusColors: Record<OSStatus, string> = {
  aberta: 'bg-amber-100 text-amber-700 border border-amber-200',
  em_andamento: 'bg-blue-100 text-blue-700 border border-blue-200',
  concluida: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelada: 'bg-red-100 text-red-600 border border-red-200',
}

const statusLabel: Record<OSStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR')
}

function formatarValor(valor: number | undefined): string {
  if (typeof valor !== 'number') return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const columns = [
  columnHelper.accessor('numero', { header: 'Número', cell: (info) => h('span', { class: 'font-mono font-semibold text-slate-800' }, info.getValue()) }),
  columnHelper.accessor((row) => row.origem, {
    id: 'origem',
    header: 'Origem',
    cell: (info) => h(Badge, {
      class: ehIntegrada(info.getValue())
        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
        : 'bg-slate-100 text-slate-600 border border-slate-200',
    }, () => ehIntegrada(info.getValue()) ? (info.row.original.seguradoraNome || 'Integrada') : 'Manual'),
  }),
  columnHelper.accessor((row) => row.cliente.nome, { id: 'clienteNome', header: 'Cliente' }),
  columnHelper.accessor((row) => row.servico.tipo, {
    id: 'servicoTipo',
    header: 'Serviço',
    cell: (info) => h('span', { class: 'capitalize' }, info.getValue() || '—'),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => h(Badge, { class: statusColors[info.getValue()] }, () => statusLabel[info.getValue()]),
  }),
  columnHelper.accessor((row) => row.datas.agendamento ?? row.datas.criacao, {
    id: 'data',
    header: 'Agendamento',
    cell: (info) => formatarData(info.getValue()),
  }),
  columnHelper.display({
    id: 'acoes',
    header: 'Ações',
    cell: (info) => {
      const os = info.row.original
      if (ehIntegrada(os.origem)) {
        return h('div', { class: 'flex gap-2' }, [
          h(Button, { size: 'sm', variant: 'outline', class: 'h-8 text-xs', onClick: () => abrirDetalhe(os) }, () => 'Detalhes'),
          h(Button, {
            size: 'sm',
            variant: 'outline',
            class: 'h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed',
            disabled: !apenasDigitos(telefoneTeste.value),
            title: apenasDigitos(telefoneTeste.value) ? 'Enviar WhatsApp' : 'Informe um telefone de teste no topo da página',
            onClick: (evento: MouseEvent) => { evento.stopPropagation(); abrirWhatsapp(os) },
          }, () => 'WhatsApp'),
        ])
      }
      return h('div', { class: 'flex gap-2' }, [
        h(Button, { size: 'sm', variant: 'outline', class: 'h-8 text-xs', onClick: () => openEdit(os) }, () => 'Editar'),
        h(Button, { size: 'sm', variant: 'destructive', class: 'h-8 text-xs', onClick: () => confirmDelete(os) }, () => 'Excluir'),
      ])
    },
  }),
]

const table = useVueTable({
  get data() { return filteredOrdens.value },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  state: { get globalFilter() { return globalFilter.value } },
  onGlobalFilterChange: (v) => { globalFilter.value = v as string },
  initialState: { pagination: { pageSize: 10 } },
})

// ─── Modal Criar/Editar (só OS manual) ─────────────────────────
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const loading = ref(false)

const tiposServicoManual = ['corretiva', 'preventiva', 'instalacao']

const form = ref({
  tipo: 'corretiva',
  status: 'aberta' as OSStatus,
  clienteId: '',
  clienteNome: '',
  equipamentoId: undefined as string | undefined,
  equipamentoNome: undefined as string | undefined,
  prestadoresIds: [] as string[],
  prestadoresNomes: [] as string[],
  descricao: '',
  observacoes: '',
  dataAgendamento: '',
})

const equipamentosFiltrados = computed(() => {
  if (!form.value.clienteId) return equipamentos.value
  return equipamentos.value.filter(e => !e.clienteId || e.clienteId === form.value.clienteId)
})

function onClienteChange(id: string) {
  form.value.clienteId = id
  const c = clientes.value.find(x => x.id === id)
  form.value.clienteNome = c?.nome ?? ''
  form.value.equipamentoId = undefined
  form.value.equipamentoNome = undefined
}

function onEquipamentoChange(id: string) {
  form.value.equipamentoId = id || undefined
  const e = equipamentos.value.find(x => x.id === id)
  form.value.equipamentoNome = e?.nome
}

function togglePrestador(id: string) {
  const idx = form.value.prestadoresIds.indexOf(id)
  if (idx === -1) {
    form.value.prestadoresIds.push(id)
    const p = prestadores.value.find(x => x.id === id)
    if (p) form.value.prestadoresNomes.push(p.nome)
  } else {
    form.value.prestadoresIds.splice(idx, 1)
    form.value.prestadoresNomes.splice(idx, 1)
  }
}

function resetForm() {
  form.value = { tipo: 'corretiva', status: 'aberta', clienteId: '', clienteNome: '', equipamentoId: undefined, equipamentoNome: undefined, prestadoresIds: [], prestadoresNomes: [], descricao: '', observacoes: '', dataAgendamento: '' }
  isEditing.value = false
  editingId.value = null
}

function openCreate() { resetForm(); showModal.value = true }

function openEdit(os: OrdemUnificada) {
  form.value = {
    tipo: os.servico.tipo, status: os.status, clienteId: os.clienteId ?? '', clienteNome: os.cliente.nome,
    equipamentoId: os.equipamentoId, equipamentoNome: os.equipamentoNome,
    prestadoresIds: [...os.prestadoresIds], prestadoresNomes: [...os.prestadoresNomes],
    descricao: os.servico.descricao, observacoes: os.observacoes ?? '',
    dataAgendamento: os.datas.agendamento ? os.datas.agendamento.substring(0, 10) : '',
  }
  isEditing.value = true
  editingId.value = os.id
  showModal.value = true
}

function closeModal() { showModal.value = false; resetForm() }

async function submitForm() {
  if (!form.value.clienteId || !form.value.descricao.trim()) return
  loading.value = true
  try {
    const clienteCadastrado = clientes.value.find((c) => c.id === form.value.clienteId)
    const input: OrdemUnificadaInput = {
      origem: 'manual',
      status: form.value.status,
      cliente: {
        nome: form.value.clienteNome,
        telefone: clienteCadastrado?.telefone || undefined,
        endereco: { texto: clienteCadastrado?.endereco || '', cidade: clienteCadastrado?.cidade || undefined },
      },
      clienteId: form.value.clienteId,
      equipamentoId: form.value.equipamentoId,
      equipamentoNome: form.value.equipamentoNome,
      prestadoresIds: form.value.prestadoresIds,
      prestadoresNomes: form.value.prestadoresNomes,
      servico: {
        tipo: form.value.tipo,
        descricao: form.value.descricao,
      },
      observacoes: form.value.observacoes || undefined,
      datas: { agendamento: form.value.dataAgendamento || undefined },
    }
    if (isEditing.value && editingId.value) {
      await updateOrdem(editingId.value, input)
    } else {
      await addOrdem(input)
    }
    closeModal()
  } finally {
    loading.value = false
  }
}

// ─── Delete (só OS manual) ──────────────────────────────────────
const deleteTarget = ref<OrdemUnificada | null>(null)
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)

function confirmDelete(os: OrdemUnificada) { deleteTarget.value = os; showDeleteConfirm.value = true }

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteOrdem(deleteTarget.value.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } finally {
    deleteLoading.value = false
  }
}

// ─── Painel de detalhe (OS integrada, só leitura) ──────────────
const selecionada = ref<OrdemUnificada | null>(null)
function abrirDetalhe(os: OrdemUnificada) { selecionada.value = os }
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

// ─── Telefone de teste (WhatsApp) — ver backlog/fase-4-whatsapp.md ─
// Protótipo de teste, marcado pra ser substituído por integração real
// (Z-API) na Fase 4 — não evoluir isso além do necessário.
const WHATSAPP_TELEFONE_STORAGE_KEY = 'guedesloc:whatsapp-telefone-teste'
const telefoneTeste = ref(localStorage.getItem(WHATSAPP_TELEFONE_STORAGE_KEY) ?? '')
watch(telefoneTeste, (valor) => localStorage.setItem(WHATSAPP_TELEFONE_STORAGE_KEY, valor))

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

function abrirWhatsapp(os: OrdemUnificada): void {
  const telefone = apenasDigitos(telefoneTeste.value)
  if (!telefone) return
  const endereco = os.cliente.endereco.texto || '—'
  const agendamento = formatarData(os.datas.agendamento)
  const mensagem = `olá segue serviço de fornecimento de caçamba endereço: ${endereco} agendamento: ${agendamento}`
  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer')
}

const totalAbertas = computed(() => ordens.value.filter(o => o.status === 'aberta').length)
const totalEmAndamento = computed(() => ordens.value.filter(o => o.status === 'em_andamento').length)
const totalIntegradas = computed(() => ordens.value.filter(o => ehIntegrada(o.origem)).length)
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Ordens de Serviço</h2>
          <p class="text-slate-500 text-sm mt-0.5">
            {{ ordens.length }} total · {{ totalAbertas }} abertas · {{ totalEmAndamento }} em andamento · {{ totalIntegradas }} integradas
          </p>
        </div>
        <div class="flex items-end gap-3">
          <div class="flex flex-col items-end gap-1">
            <Label for="whatsapp-telefone-teste" class="text-xs text-slate-500">Telefone de teste (WhatsApp)</Label>
            <Input
              id="whatsapp-telefone-teste"
              v-model="telefoneTeste"
              placeholder="Ex: 5511999999999"
              class="w-[220px] border-slate-200"
            />
          </div>
          <Button id="btn-nova-os" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold shadow-sm" @click="openCreate">
            + Nova OS
          </Button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-3 flex-wrap">
        <Input id="input-busca-os" v-model="globalFilter" placeholder="Buscar por número, cliente..." class="max-w-xs border-slate-200" />
        <select
          id="select-status-filter"
          v-model="statusFilter"
          class="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos os status</option>
          <option v-for="(rotulo, chave) in statusLabel" :key="chave" :value="chave">{{ rotulo }}</option>
        </select>
        <select
          id="select-origem-filter"
          v-model="origemFilter"
          class="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todas as origens</option>
          <option value="manual">Manual</option>
          <option value="integrada">Integrada (seguradora)</option>
        </select>
      </div>

      <!-- Table -->
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
              class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
              <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="px-4 py-3 text-slate-700">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </td>
            </tr>
            <tr v-if="table.getRowModel().rows.length === 0">
              <td :colspan="columns.length" class="px-4 py-12 text-center text-slate-400">Nenhuma OS encontrada.</td>
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

    <!-- Modal Criar/Editar OS manual -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Editar OS' : 'Nova Ordem de Serviço' }}</h3>
          <button id="btn-fechar-modal-os" class="text-slate-400 hover:text-slate-600 transition-colors" @click="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Tipo e Status -->
          <div class="space-y-1.5">
            <Label for="os-tipo">Tipo *</Label>
            <select id="os-tipo" v-model="form.tipo" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option v-for="t in tiposServicoManual" :key="t" :value="t" class="capitalize">{{ t }}</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="os-status">Status *</Label>
            <select id="os-status" v-model="form.status" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option v-for="(rotulo, chave) in statusLabel" :key="chave" :value="chave">{{ rotulo }}</option>
            </select>
          </div>

          <!-- Cliente -->
          <div class="col-span-2 space-y-1.5">
            <Label for="os-cliente">Cliente *</Label>
            <select
              id="os-cliente"
              :value="form.clienteId"
              class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              @change="onClienteChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="">Selecione um cliente...</option>
              <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nome }}</option>
            </select>
          </div>

          <!-- Equipamento -->
          <div class="col-span-2 space-y-1.5">
            <Label for="os-equipamento">Equipamento (opcional)</Label>
            <select
              id="os-equipamento"
              :value="form.equipamentoId ?? ''"
              class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              @change="onEquipamentoChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="">— Nenhum —</option>
              <option v-for="e in equipamentosFiltrados" :key="e.id" :value="e.id">{{ e.nome }} {{ e.modelo ? `(${e.modelo})` : '' }}</option>
            </select>
          </div>

          <!-- Prestadores multi-select -->
          <div class="col-span-2 space-y-1.5">
            <Label>Prestadores alocados</Label>
            <div class="border border-slate-200 rounded-md p-3 max-h-36 overflow-y-auto space-y-1.5">
              <p v-if="prestadores.length === 0" class="text-sm text-slate-400 italic">Nenhum prestador cadastrado.</p>
              <label
                v-for="p in prestadores.filter(x => x.situacao === 'ativo')"
                :key="p.id"
                class="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded"
              >
                <input
                  type="checkbox"
                  :checked="form.prestadoresIds.includes(p.id)"
                  class="accent-yellow-400 w-4 h-4"
                  @change="togglePrestador(p.id)"
                />
                <span class="text-sm text-slate-700">{{ p.nome }}</span>
                <Badge v-if="p.especialidade" class="bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs ml-auto">{{ p.especialidade }}</Badge>
                <span v-else-if="p.cidade" class="text-xs text-slate-400 ml-auto">{{ p.cidade }}</span>
              </label>
            </div>
          </div>

          <!-- Data agendamento -->
          <div class="space-y-1.5">
            <Label for="os-agendamento">Data de Agendamento</Label>
            <Input id="os-agendamento" v-model="form.dataAgendamento" type="date" />
          </div>

          <!-- Descrição -->
          <div class="col-span-2 space-y-1.5">
            <Label for="os-descricao">Descrição do serviço *</Label>
            <textarea
              id="os-descricao"
              v-model="form.descricao"
              rows="3"
              placeholder="Descreva o serviço a ser realizado..."
              class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <!-- Observações -->
          <div class="col-span-2 space-y-1.5">
            <Label for="os-obs">Observações</Label>
            <textarea
              id="os-obs"
              v-model="form.observacoes"
              rows="2"
              placeholder="Observações adicionais (opcional)..."
              class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="closeModal">Cancelar</Button>
          <Button
            id="btn-salvar-os"
            class="bg-primary text-slate-900 hover:bg-primary/90 font-bold"
            :disabled="loading || !form.clienteId || !form.descricao.trim()"
            @click="submitForm"
          >
            {{ loading ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Criar OS') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Excluir OS?</h3>
        <p class="text-slate-600 text-sm">Tem certeza que deseja excluir a <strong>{{ deleteTarget?.numero }}</strong>?</p>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showDeleteConfirm = false">Cancelar</Button>
          <Button variant="destructive" :disabled="deleteLoading" @click="executeDelete">{{ deleteLoading ? 'Excluindo...' : 'Excluir' }}</Button>
        </div>
      </div>
    </div>

    <!-- Painel de detalhe OS integrada (só leitura) -->
    <div v-if="selecionada" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="fecharDetalhe" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-900">{{ selecionada.numeroOsSeguradora ?? selecionada.numero }}</h3>
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
            <p class="text-sm text-slate-800 font-medium">{{ selecionada.cliente.nome }}</p>
            <p v-if="selecionada.cliente.telefone" class="text-sm text-slate-600">{{ selecionada.cliente.telefone }}</p>
            <p class="text-sm text-slate-600">{{ selecionada.cliente.endereco.texto }}</p>
          </div>

          <div class="col-span-2 space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Serviço</p>
            <p class="text-sm text-slate-800 font-medium">{{ selecionada.servico.tipo }}</p>
            <p v-if="selecionada.servico.descricao" class="text-sm text-slate-600 whitespace-pre-line">{{ selecionada.servico.descricao }}</p>
            <p class="text-sm text-slate-600">Valor: {{ formatarValor(selecionada.servico.valor) }}</p>
          </div>

          <div class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Criada em</p>
            <p class="text-sm text-slate-600">{{ formatarData(selecionada.datas.criacao) }}</p>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Agendamento</p>
            <p class="text-sm text-slate-600">{{ formatarData(selecionada.datas.agendamento) }}</p>
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
