<script setup lang="ts">
import { ref, computed, h } from 'vue'
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
import type { Prestador, SituacaoPrestador, CidadeAtendida } from '@/types'
import type { TipoRegraRepasse } from '@/types/financeiro'

const { prestadores, addPrestador, updatePrestador, deletePrestador } = usePrestadores()

const globalFilter = ref('')
const columnHelper = createColumnHelper<Prestador>()

const situacaoColors: Record<SituacaoPrestador, string> = {
  ativo: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  pausado: 'bg-amber-100 text-amber-700 border border-amber-200',
  bloqueado: 'bg-red-100 text-red-600 border border-red-200',
}
const situacaoLabel: Record<SituacaoPrestador, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  bloqueado: 'Bloqueado',
}

const columns = [
  columnHelper.accessor('nome', { header: 'Nome' }),
  columnHelper.accessor('cidade', {
    header: 'Cidade base',
    cell: (info) => info.getValue() || h('span', { class: 'text-slate-400 text-xs italic' }, '—'),
  }),
  columnHelper.accessor((row) => row.cidadesAtendidas.length, {
    id: 'cobertura',
    header: 'Cobertura',
    cell: (info) => info.getValue() > 0
      ? h(Badge, { class: 'bg-indigo-100 text-indigo-700 border border-indigo-200' }, () => `${info.getValue()} cidade(s)`)
      : h('span', { class: 'text-slate-400 text-xs italic' }, 'sem cobertura'),
  }),
  columnHelper.accessor('telefone', { header: 'Telefone' }),
  columnHelper.accessor('limiteOsPorDia', {
    header: 'Limite/dia',
    cell: (info) => info.getValue() ?? h('span', { class: 'text-slate-400 text-xs italic' }, 'sem limite'),
  }),
  columnHelper.accessor('situacao', {
    header: 'Situação',
    cell: (info) => h(Badge, { class: situacaoColors[info.getValue()] }, () => situacaoLabel[info.getValue()]),
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
  get data() { return prestadores.value },
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

function formVazio() {
  return {
    nome: '', especialidade: '', cpf: '', telefone: '', email: '',
    cidade: '', estado: '', regiao: '',
    limiteOsPorDia: undefined as number | undefined,
    observacao: '',
    situacao: 'ativo' as SituacaoPrestador,
    cidadesAtendidas: [] as CidadeAtendida[],
    regraRepasseTipo: '' as TipoRegraRepasse | '',
    regraRepasseValor: undefined as number | undefined,
  }
}

const form = ref(formVazio())

function resetForm() {
  form.value = formVazio()
  isEditing.value = false
  editingId.value = null
}

function openCreate() { resetForm(); showModal.value = true }

function openEdit(p: Prestador) {
  form.value = {
    nome: p.nome, especialidade: p.especialidade ?? '', cpf: p.cpf, telefone: p.telefone, email: p.email,
    cidade: p.cidade ?? '', estado: p.estado ?? '', regiao: p.regiao ?? '',
    limiteOsPorDia: p.limiteOsPorDia,
    observacao: p.observacao ?? '',
    situacao: p.situacao,
    cidadesAtendidas: p.cidadesAtendidas.map((c) => ({ ...c })),
    regraRepasseTipo: p.regraRepasse?.tipo ?? '',
    regraRepasseValor: p.regraRepasse?.valor,
  }
  isEditing.value = true
  editingId.value = p.id
  showModal.value = true
}

function closeModal() { showModal.value = false; resetForm() }

// ─── Cidades atendidas (cascata) ───────────────────────────────
const novaCidade = ref('')
const novoEstado = ref('')

function adicionarCidade() {
  if (!novaCidade.value.trim()) return
  const proximaPrioridade = form.value.cidadesAtendidas.length > 0
    ? Math.max(...form.value.cidadesAtendidas.map((c) => c.prioridade)) + 1
    : 1
  form.value.cidadesAtendidas.push({ cidade: novaCidade.value.trim(), estado: novoEstado.value.trim() || undefined, prioridade: proximaPrioridade })
  novaCidade.value = ''
  novoEstado.value = ''
}

function removerCidade(idx: number) {
  form.value.cidadesAtendidas.splice(idx, 1)
}

function moverCidade(idx: number, direcao: -1 | 1) {
  const alvo = idx + direcao
  if (alvo < 0 || alvo >= form.value.cidadesAtendidas.length) return
  const lista = form.value.cidadesAtendidas
  const tmpPrioridade = lista[idx]!.prioridade
  lista[idx]!.prioridade = lista[alvo]!.prioridade
  lista[alvo]!.prioridade = tmpPrioridade
  const tmp = lista[idx]!
  lista[idx] = lista[alvo]!
  lista[alvo] = tmp
}

async function submitForm() {
  if (!form.value.nome.trim()) return
  loading.value = true
  try {
    const { regraRepasseTipo, regraRepasseValor, ...resto } = form.value
    const input = {
      ...resto,
      especialidade: form.value.especialidade || undefined,
      limiteOsPorDia: form.value.limiteOsPorDia || undefined,
      observacao: form.value.observacao || undefined,
      regraRepasse: regraRepasseTipo && regraRepasseValor
        ? { tipo: regraRepasseTipo, valor: regraRepasseValor }
        : undefined,
    }
    if (isEditing.value && editingId.value) {
      await updatePrestador(editingId.value, input)
    } else {
      await addPrestador(input)
    }
    closeModal()
  } finally {
    loading.value = false
  }
}

// ─── Delete ──────────────────────────────────────────────────
const deleteTarget = ref<Prestador | null>(null)
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)

function confirmDelete(p: Prestador) { deleteTarget.value = p; showDeleteConfirm.value = true }

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deletePrestador(deleteTarget.value.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } finally {
    deleteLoading.value = false
  }
}

const totalAtivos = computed(() => prestadores.value.filter(p => p.situacao === 'ativo').length)
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Prestadores de Serviço</h2>
          <p class="text-slate-500 text-sm mt-0.5">{{ prestadores.length }} cadastrado(s) · {{ totalAtivos }} ativo(s)</p>
        </div>
        <Button id="btn-novo-prestador" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold shadow-sm" @click="openCreate">
          + Novo Prestador
        </Button>
      </div>

      <div class="flex items-center gap-3">
        <Input id="input-busca-prestador" v-model="globalFilter" placeholder="Buscar por nome, cidade..." class="max-w-sm border-slate-200" />
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
              class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
              <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="px-4 py-3 text-slate-700">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </td>
            </tr>
            <tr v-if="table.getRowModel().rows.length === 0">
              <td :colspan="columns.length" class="px-4 py-12 text-center text-slate-400">Nenhum prestador encontrado.</td>
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

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Editar Prestador' : 'Novo Prestador' }}</h3>
          <button id="btn-fechar-modal-prestador" class="text-slate-400 hover:text-slate-600 transition-colors" @click="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-1.5">
            <Label for="prest-nome">Nome *</Label>
            <Input id="prest-nome" v-model="form.nome" placeholder="Nome completo" />
          </div>
          <div class="space-y-1.5">
            <Label for="prest-cpf">CPF</Label>
            <Input id="prest-cpf" v-model="form.cpf" placeholder="000.000.000-00" />
          </div>
          <div class="space-y-1.5">
            <Label for="prest-telefone">Telefone</Label>
            <Input id="prest-telefone" v-model="form.telefone" placeholder="(00) 00000-0000" />
          </div>
          <div class="col-span-2 space-y-1.5">
            <Label for="prest-email">E-mail</Label>
            <Input id="prest-email" v-model="form.email" type="email" placeholder="prestador@email.com" />
          </div>
          <div class="col-span-2 space-y-1.5">
            <Label for="prest-especialidade">Observação de especialidade (opcional)</Label>
            <Input id="prest-especialidade" v-model="form.especialidade" placeholder="Ex: caçamba pequena, guincho..." />
          </div>

          <div class="space-y-1.5">
            <Label for="prest-cidade">Cidade base</Label>
            <Input id="prest-cidade" v-model="form.cidade" placeholder="Ex: Goiânia" />
          </div>
          <div class="space-y-1.5">
            <Label for="prest-estado">Estado</Label>
            <Input id="prest-estado" v-model="form.estado" placeholder="Ex: GO" maxlength="2" class="uppercase" />
          </div>
          <div class="space-y-1.5">
            <Label for="prest-regiao">Região</Label>
            <Input id="prest-regiao" v-model="form.regiao" placeholder="Ex: Zona Sul" />
          </div>
          <div class="space-y-1.5">
            <Label for="prest-limite">Limite de OS por dia (opcional)</Label>
            <Input id="prest-limite" v-model.number="form.limiteOsPorDia" type="number" min="0" placeholder="Sem limite" />
          </div>

          <div class="space-y-1.5">
            <Label for="prest-situacao">Situação</Label>
            <select id="prest-situacao" v-model="form.situacao" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
            <p class="text-xs text-slate-400">Pausado e Bloqueado ficam fora da distribuição automática (Fase 5).</p>
          </div>

          <div class="col-span-2 space-y-1.5">
            <Label for="prest-observacao">Observação</Label>
            <textarea
              id="prest-observacao"
              v-model="form.observacao"
              rows="2"
              placeholder="Observações adicionais (opcional)..."
              class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <!-- Cidades atendidas (cascata) -->
          <div class="col-span-2 space-y-1.5 pt-2 border-t border-slate-100">
            <Label>Cidades atendidas (ordem de acionamento)</Label>
            <p class="text-xs text-slate-400">Prioridade menor é chamado primeiro na cascata de distribuição. Sem cidade cadastrada, o prestador não entra na distribuição automática.</p>

            <div class="border border-slate-200 rounded-md divide-y divide-slate-100">
              <div v-if="form.cidadesAtendidas.length === 0" class="p-3 text-sm text-slate-400 italic">Nenhuma cidade cadastrada.</div>
              <div
                v-for="(c, idx) in form.cidadesAtendidas"
                :key="idx"
                class="flex items-center gap-2 px-3 py-2"
              >
                <Badge class="bg-slate-100 text-slate-600 border border-slate-200 text-xs shrink-0">#{{ c.prioridade }}</Badge>
                <span class="text-sm text-slate-700 flex-1">{{ c.cidade }}<span v-if="c.estado" class="text-slate-400">/{{ c.estado }}</span></span>
                <button type="button" class="text-slate-400 hover:text-slate-700 text-xs px-1" @click="moverCidade(idx, -1)">▲</button>
                <button type="button" class="text-slate-400 hover:text-slate-700 text-xs px-1" @click="moverCidade(idx, 1)">▼</button>
                <button type="button" class="text-red-400 hover:text-red-600 text-xs px-1" @click="removerCidade(idx)">Remover</button>
              </div>
            </div>

            <div class="flex gap-2 pt-1">
              <Input v-model="novaCidade" placeholder="Cidade" class="flex-1" @keyup.enter="adicionarCidade" />
              <Input v-model="novoEstado" placeholder="UF" maxlength="2" class="w-16 uppercase" @keyup.enter="adicionarCidade" />
              <Button type="button" variant="outline" size="sm" @click="adicionarCidade">+ Adicionar</Button>
            </div>
          </div>

          <!-- Regra de repasse (Backlog Fase 7, Card 6.1) -->
          <div class="col-span-2 space-y-1.5 pt-2 border-t border-slate-100">
            <Label>Regra de repasse</Label>
            <p class="text-xs text-slate-400">Como esse prestador é remunerado quando uma OS dele é finalizada. Sem regra, a OS finalizada gera um repasse sinalizado "sem regra" pra alguém revisar manualmente.</p>
            <div class="flex gap-2">
              <select v-model="form.regraRepasseTipo" class="flex-1 h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Sem regra cadastrada</option>
                <option value="valor_fixo">Valor fixo por OS (R$)</option>
                <option value="percentual">Percentual do valor da OS (%)</option>
              </select>
              <Input
                v-if="form.regraRepasseTipo"
                v-model.number="form.regraRepasseValor"
                type="number"
                min="0"
                step="0.01"
                :placeholder="form.regraRepasseTipo === 'percentual' ? 'Ex: 70' : 'Ex: 150.00'"
                class="w-32"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="closeModal">Cancelar</Button>
          <Button id="btn-salvar-prestador" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="loading || !form.nome.trim()" @click="submitForm">
            {{ loading ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Criar prestador') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Excluir prestador?</h3>
        <p class="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{{ deleteTarget?.nome }}</strong>?</p>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showDeleteConfirm = false">Cancelar</Button>
          <Button variant="destructive" :disabled="deleteLoading" @click="executeDelete">{{ deleteLoading ? 'Excluindo...' : 'Excluir' }}</Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
