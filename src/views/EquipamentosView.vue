<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useEquipamentos } from '@/composables/useEquipamentos'
import { useClientes } from '@/composables/useClientes'
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
import type { Equipamento } from '@/types'
import { EQUIPAMENTO_STATUS_LABEL } from '@/types'

const { equipamentos, addEquipamento, updateEquipamento, deleteEquipamento } = useEquipamentos()
const { clientes } = useClientes()

const globalFilter = ref('')
const columnHelper = createColumnHelper<Equipamento>()

const statusColors: Record<string, string> = {
  disponivel: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  em_uso: 'bg-blue-100 text-blue-700 border border-blue-200',
  manutencao: 'bg-amber-100 text-amber-700 border border-amber-200',
  inativo: 'bg-slate-100 text-slate-500 border border-slate-200',
}

const columns = [
  columnHelper.accessor('nome', { header: 'Equipamento' }),
  columnHelper.accessor('tipo', { header: 'Tipo' }),
  columnHelper.accessor('marca', { header: 'Marca' }),
  columnHelper.accessor('modelo', { header: 'Modelo' }),
  columnHelper.accessor('numeroDeSerie', { header: 'N° Série' }),
  columnHelper.accessor('clienteNome', {
    header: 'Cliente',
    cell: (info) => info.getValue() ?? h('span', { class: 'text-slate-400 text-xs italic' }, 'Em estoque'),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) =>
      h(Badge, { class: statusColors[info.getValue()] ?? '' }, () => EQUIPAMENTO_STATUS_LABEL[info.getValue()]),
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
  get data() { return equipamentos.value },
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
  nome: '', tipo: '', marca: '', modelo: '', numeroDeSerie: '',
  clienteId: '' as string | undefined, clienteNome: '' as string | undefined,
  status: 'disponivel' as Equipamento['status'],
})

const TIPOS = ['Gerador', 'Compressor', 'Bomba', 'Motor', 'Painel Elétrico', 'Transformador', 'Outro']

function resetForm() {
  form.value = { nome: '', tipo: '', marca: '', modelo: '', numeroDeSerie: '', clienteId: undefined, clienteNome: undefined, status: 'disponivel' }
  isEditing.value = false
  editingId.value = null
}

function onClienteChange(id: string) {
  form.value.clienteId = id || undefined
  if (id) {
    const c = clientes.value.find(x => x.id === id)
    form.value.clienteNome = c?.nome
  } else {
    form.value.clienteNome = undefined
  }
}

function openCreate() { resetForm(); showModal.value = true }

function openEdit(eq: Equipamento) {
  form.value = { nome: eq.nome, tipo: eq.tipo, marca: eq.marca, modelo: eq.modelo, numeroDeSerie: eq.numeroDeSerie, clienteId: eq.clienteId, clienteNome: eq.clienteNome, status: eq.status }
  isEditing.value = true
  editingId.value = eq.id
  showModal.value = true
}

function closeModal() { showModal.value = false; resetForm() }

async function submitForm() {
  if (!form.value.nome.trim()) return
  loading.value = true
  try {
    if (isEditing.value && editingId.value) {
      await updateEquipamento(editingId.value, form.value)
    } else {
      await addEquipamento(form.value)
    }
    closeModal()
  } finally {
    loading.value = false
  }
}

// ─── Delete ──────────────────────────────────────────────────
const deleteTarget = ref<Equipamento | null>(null)
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)

function confirmDelete(e: Equipamento) { deleteTarget.value = e; showDeleteConfirm.value = true }

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteEquipamento(deleteTarget.value.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } finally {
    deleteLoading.value = false
  }
}

const totalDisponiveis = computed(() => equipamentos.value.filter(e => e.status === 'disponivel').length)
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Equipamentos</h2>
          <p class="text-slate-500 text-sm mt-0.5">{{ equipamentos.length }} cadastrado(s) · {{ totalDisponiveis }} disponível(is)</p>
        </div>
        <Button id="btn-novo-equipamento" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold shadow-sm" @click="openCreate">
          + Novo Equipamento
        </Button>
      </div>

      <div class="flex items-center gap-3">
        <Input id="input-busca-equipamento" v-model="globalFilter" placeholder="Buscar por nome, tipo, série..." class="max-w-sm border-slate-200" />
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th v-for="header in table.getHeaderGroups()[0].headers" :key="header.id"
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
              <td :colspan="columns.length" class="px-4 py-12 text-center text-slate-400">Nenhum equipamento encontrado.</td>
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

    <!-- Modal Criar/Editar -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Editar Equipamento' : 'Novo Equipamento' }}</h3>
          <button id="btn-fechar-modal-equip" class="text-slate-400 hover:text-slate-600 transition-colors" @click="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-1.5">
            <Label for="equip-nome">Nome *</Label>
            <Input id="equip-nome" v-model="form.nome" placeholder="Nome do equipamento" />
          </div>
          <div class="space-y-1.5">
            <Label for="equip-tipo">Tipo</Label>
            <select id="equip-tipo" v-model="form.tipo" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Selecione...</option>
              <option v-for="t in TIPOS" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="equip-status">Status</Label>
            <select id="equip-status" v-model="form.status" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="disponivel">Disponível</option>
              <option value="em_uso">Em Uso</option>
              <option value="manutencao">Manutenção</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="equip-marca">Marca</Label>
            <Input id="equip-marca" v-model="form.marca" placeholder="Ex: Cummins, Atlas Copco" />
          </div>
          <div class="space-y-1.5">
            <Label for="equip-modelo">Modelo</Label>
            <Input id="equip-modelo" v-model="form.modelo" placeholder="Modelo" />
          </div>
          <div class="col-span-2 space-y-1.5">
            <Label for="equip-serie">Número de Série</Label>
            <Input id="equip-serie" v-model="form.numeroDeSerie" placeholder="N° de série ou patrimônio" />
          </div>
          <div class="col-span-2 space-y-1.5">
            <Label for="equip-cliente">Cliente (opcional)</Label>
            <select
              id="equip-cliente"
              :value="form.clienteId ?? ''"
              class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              @change="onClienteChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="">— Em estoque (sem cliente) —</option>
              <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nome }}</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="closeModal">Cancelar</Button>
          <Button id="btn-salvar-equip" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="loading || !form.nome.trim()" @click="submitForm">
            {{ loading ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Criar equipamento') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Excluir equipamento?</h3>
        <p class="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{{ deleteTarget?.nome }}</strong>?</p>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showDeleteConfirm = false">Cancelar</Button>
          <Button variant="destructive" :disabled="deleteLoading" @click="executeDelete">{{ deleteLoading ? 'Excluindo...' : 'Excluir' }}</Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
