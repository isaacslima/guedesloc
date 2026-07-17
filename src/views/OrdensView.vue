<script setup lang="ts">
import { ref, computed, h } from 'vue'
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
import type { OrdemDeServico, OrdemDeServicoInput, OSStatus, OSTipo } from '@/types'
import { OS_STATUS_LABEL, OS_TIPO_LABEL } from '@/types'

const { ordens, addOrdem, updateOrdem, deleteOrdem } = useOrdens()
const { clientes } = useClientes()
const { equipamentos } = useEquipamentos()
const { prestadores } = usePrestadores()

const globalFilter = ref('')
const statusFilter = ref<OSStatus | ''>('')

const filteredOrdens = computed(() => {
  if (!statusFilter.value) return ordens.value
  return ordens.value.filter(o => o.status === statusFilter.value)
})

const columnHelper = createColumnHelper<OrdemDeServico>()

const statusColors: Record<OSStatus, string> = {
  aberta: 'bg-amber-100 text-amber-700 border border-amber-200',
  em_andamento: 'bg-blue-100 text-blue-700 border border-blue-200',
  concluida: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelada: 'bg-red-100 text-red-600 border border-red-200',
}

const tipoColors: Record<OSTipo, string> = {
  corretiva: 'bg-orange-100 text-orange-700 border border-orange-200',
  preventiva: 'bg-violet-100 text-violet-700 border border-violet-200',
  instalacao: 'bg-teal-100 text-teal-700 border border-teal-200',
}

const columns = [
  columnHelper.accessor('numero', { header: 'Número', cell: (info) => h('span', { class: 'font-mono font-semibold text-slate-800' }, info.getValue()) }),
  columnHelper.accessor('tipo', {
    header: 'Tipo',
    cell: (info) => h(Badge, { class: tipoColors[info.getValue()] }, () => OS_TIPO_LABEL[info.getValue()]),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => h(Badge, { class: statusColors[info.getValue()] }, () => OS_STATUS_LABEL[info.getValue()]),
  }),
  columnHelper.accessor('clienteNome', { header: 'Cliente' }),
  columnHelper.accessor('equipamentoNome', {
    header: 'Equipamento',
    cell: (info) => info.getValue() ?? h('span', { class: 'text-slate-400 text-xs italic' }, '—'),
  }),
  columnHelper.accessor('dataAgendamento', {
    header: 'Agendamento',
    cell: (info) => {
      const v = info.getValue()
      if (!v) return h('span', { class: 'text-slate-400 text-xs italic' }, '—')
      return new Date(v).toLocaleDateString('pt-BR')
    },
  }),
  columnHelper.display({
    id: 'acoes',
    header: 'Ações',
    cell: (info) =>
      h('div', { class: 'flex gap-2' }, [
        h(Button, { size: 'sm', variant: 'outline', class: 'h-8 text-xs', onClick: () => openEdit(info.row.original) }, () => 'Editar'),
        h(Button, { size: 'sm', variant: 'destructive', class: 'h-8 text-xs', onClick: () => confirmDelete(info.row.original) }, () => 'Excluir'),
      ]),
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

// ─── Modal ───────────────────────────────────────────────────
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const loading = ref(false)

const form = ref({
  tipo: 'corretiva' as OSTipo,
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

function openEdit(os: OrdemDeServico) {
  form.value = {
    tipo: os.tipo, status: os.status, clienteId: os.clienteId, clienteNome: os.clienteNome,
    equipamentoId: os.equipamentoId, equipamentoNome: os.equipamentoNome,
    prestadoresIds: [...os.prestadoresIds], prestadoresNomes: [...os.prestadoresNomes],
    descricao: os.descricao, observacoes: os.observacoes ?? '',
    dataAgendamento: os.dataAgendamento ? os.dataAgendamento.substring(0, 10) : '',
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
    const input: OrdemDeServicoInput = {
      tipo: form.value.tipo,
      status: form.value.status,
      clienteId: form.value.clienteId,
      clienteNome: form.value.clienteNome,
      equipamentoId: form.value.equipamentoId,
      equipamentoNome: form.value.equipamentoNome,
      prestadoresIds: form.value.prestadoresIds,
      prestadoresNomes: form.value.prestadoresNomes,
      descricao: form.value.descricao,
      observacoes: form.value.observacoes || undefined,
      dataAgendamento: form.value.dataAgendamento || undefined,
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

// ─── Delete ──────────────────────────────────────────────────
const deleteTarget = ref<OrdemDeServico | null>(null)
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)

function confirmDelete(os: OrdemDeServico) { deleteTarget.value = os; showDeleteConfirm.value = true }

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

const totalAbertas = computed(() => ordens.value.filter(o => o.status === 'aberta').length)
const totalEmAndamento = computed(() => ordens.value.filter(o => o.status === 'em_andamento').length)
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Ordens de Serviço</h2>
          <p class="text-slate-500 text-sm mt-0.5">
            {{ ordens.length }} total · {{ totalAbertas }} abertas · {{ totalEmAndamento }} em andamento
          </p>
        </div>
        <Button id="btn-nova-os" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold shadow-sm" @click="openCreate">
          + Nova OS
        </Button>
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
          <option value="aberta">Abertas</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluida">Concluídas</option>
          <option value="cancelada">Canceladas</option>
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

    <!-- Modal Criar/Editar OS -->
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
              <option value="corretiva">Corretiva</option>
              <option value="preventiva">Preventiva</option>
              <option value="instalacao">Instalação</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="os-status">Status *</Label>
            <select id="os-status" v-model="form.status" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="aberta">Aberta</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
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
                v-for="p in prestadores.filter(x => x.status === 'ativo')"
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
                <Badge class="bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs ml-auto">{{ p.especialidade }}</Badge>
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
  </DashboardLayout>
</template>
