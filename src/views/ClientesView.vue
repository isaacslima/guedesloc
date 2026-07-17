<script setup lang="ts">
import { ref, computed, h } from 'vue'
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
import type { Cliente } from '@/types'

const { clientes, addCliente, updateCliente, deleteCliente } = useClientes()

// ─── Search & Table ─────────────────────────────────────────
const globalFilter = ref('')
const columnHelper = createColumnHelper<Cliente>()

const columns = [
  columnHelper.accessor('nome', { header: 'Nome' }),
  columnHelper.accessor('cnpj', { header: 'CNPJ' }),
  columnHelper.accessor('telefone', { header: 'Telefone' }),
  columnHelper.accessor('email', { header: 'E-mail' }),
  columnHelper.accessor('cidade', { header: 'Cidade' }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) =>
      h(Badge, {
        class: info.getValue() === 'ativo'
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          : 'bg-slate-100 text-slate-500 border border-slate-200',
      }, () => info.getValue() === 'ativo' ? 'Ativo' : 'Inativo'),
  }),
  columnHelper.display({
    id: 'acoes',
    header: 'Ações',
    cell: (info) =>
      h('div', { class: 'flex gap-2' }, [
        h(Button, {
          size: 'sm',
          variant: 'outline',
          class: 'h-8 text-xs',
          onClick: () => openEdit(info.row.original),
        }, () => 'Editar'),
        h(Button, {
          size: 'sm',
          variant: 'destructive',
          class: 'h-8 text-xs',
          onClick: () => confirmDelete(info.row.original),
        }, () => 'Excluir'),
      ]),
  }),
]

const table = useVueTable({
  get data() { return clientes.value },
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
  nome: '', cnpj: '', telefone: '', email: '',
  endereco: '', cidade: '', status: 'ativo' as 'ativo' | 'inativo',
})

function resetForm() {
  form.value = { nome: '', cnpj: '', telefone: '', email: '', endereco: '', cidade: '', status: 'ativo' }
  isEditing.value = false
  editingId.value = null
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(cliente: Cliente) {
  form.value = { nome: cliente.nome, cnpj: cliente.cnpj, telefone: cliente.telefone, email: cliente.email, endereco: cliente.endereco, cidade: cliente.cidade, status: cliente.status }
  isEditing.value = true
  editingId.value = cliente.id
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

async function submitForm() {
  if (!form.value.nome.trim()) return
  loading.value = true
  try {
    if (isEditing.value && editingId.value) {
      await updateCliente(editingId.value, form.value)
    } else {
      await addCliente(form.value)
    }
    closeModal()
  } finally {
    loading.value = false
  }
}

// ─── Delete Confirm ──────────────────────────────────────────
const deleteTarget = ref<Cliente | null>(null)
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)

function confirmDelete(c: Cliente) {
  deleteTarget.value = c
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteCliente(deleteTarget.value.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } finally {
    deleteLoading.value = false
  }
}

const totalAtivos = computed(() => clientes.value.filter(c => c.status === 'ativo').length)
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Clientes</h2>
          <p class="text-slate-500 text-sm mt-0.5">{{ clientes.length }} cadastrado(s) · {{ totalAtivos }} ativo(s)</p>
        </div>
        <Button id="btn-novo-cliente" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold shadow-sm" @click="openCreate">
          + Novo Cliente
        </Button>
      </div>

      <!-- Search -->
      <div class="flex items-center gap-3">
        <Input
          id="input-busca-cliente"
          v-model="globalFilter"
          placeholder="Buscar por nome, CNPJ, cidade..."
          class="max-w-sm border-slate-200"
        />
      </div>

      <!-- Table -->
      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th
                v-for="header in (table.getHeaderGroups()[0]?.headers ?? [])"
                :key="header.id"
                class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="px-4 py-3 text-slate-700"
              >
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </td>
            </tr>
            <tr v-if="table.getRowModel().rows.length === 0">
              <td :colspan="columns.length" class="px-4 py-12 text-center text-slate-400">
                Nenhum cliente encontrado.
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <span class="text-xs text-slate-500">
            Página {{ table.getState().pagination.pageIndex + 1 }} de {{ table.getPageCount() || 1 }}
          </span>
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
          <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Editar Cliente' : 'Novo Cliente' }}</h3>
          <button id="btn-fechar-modal-cliente" class="text-slate-400 hover:text-slate-600 transition-colors" @click="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-1.5">
            <Label for="cliente-nome">Nome *</Label>
            <Input id="cliente-nome" v-model="form.nome" placeholder="Razão Social ou Nome" />
          </div>
          <div class="space-y-1.5">
            <Label for="cliente-cnpj">CNPJ</Label>
            <Input id="cliente-cnpj" v-model="form.cnpj" placeholder="00.000.000/0001-00" />
          </div>
          <div class="space-y-1.5">
            <Label for="cliente-telefone">Telefone</Label>
            <Input id="cliente-telefone" v-model="form.telefone" placeholder="(00) 00000-0000" />
          </div>
          <div class="col-span-2 space-y-1.5">
            <Label for="cliente-email">E-mail</Label>
            <Input id="cliente-email" v-model="form.email" type="email" placeholder="contato@empresa.com.br" />
          </div>
          <div class="col-span-2 space-y-1.5">
            <Label for="cliente-endereco">Endereço</Label>
            <Input id="cliente-endereco" v-model="form.endereco" placeholder="Rua, número, bairro" />
          </div>
          <div class="space-y-1.5">
            <Label for="cliente-cidade">Cidade</Label>
            <Input id="cliente-cidade" v-model="form.cidade" placeholder="Cidade" />
          </div>
          <div class="space-y-1.5">
            <Label for="cliente-status">Status</Label>
            <select
              id="cliente-status"
              v-model="form.status"
              class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="closeModal">Cancelar</Button>
          <Button
            id="btn-salvar-cliente"
            class="bg-primary text-slate-900 hover:bg-primary/90 font-bold"
            :disabled="loading || !form.nome.trim()"
            @click="submitForm"
          >
            {{ loading ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Criar cliente') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal Confirmar Exclusão -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Excluir cliente?</h3>
        <p class="text-slate-600 text-sm">
          Tem certeza que deseja excluir <strong>{{ deleteTarget?.nome }}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showDeleteConfirm = false">Cancelar</Button>
          <Button variant="destructive" :disabled="deleteLoading" @click="executeDelete">
            {{ deleteLoading ? 'Excluindo...' : 'Excluir' }}
          </Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
