<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePrecos } from '@/composables/usePrecos'
import { useIntegradoras } from '@/composables/useIntegradoras'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PrecoServico } from '@/types/financeiro'

const { precos, addPreco } = usePrecos()
const { integradoras } = useIntegradoras()

const vigentes = computed(() => precos.value.filter((p) => !p.vigenciaFim))
const historico = computed(() => precos.value.filter((p) => p.vigenciaFim))

const mostrarHistorico = ref(false)

function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

// ─── Novo preço / reajuste ──────────────────────────────────────
const showModal = ref(false)
const loading = ref(false)
const form = ref({ seguradoraId: '', servicoTipo: '', valor: undefined as number | undefined })

function seguradoraNomeDe(id: string): string {
  return integradoras.value.find((i) => i.id === id)?.nome ?? ''
}

function openModal(preco?: PrecoServico) {
  form.value = preco
    ? { seguradoraId: preco.seguradoraId, servicoTipo: preco.servicoTipo, valor: preco.valor }
    : { seguradoraId: '', servicoTipo: '', valor: undefined }
  showModal.value = true
}
function closeModal() { showModal.value = false }

async function submit() {
  if (!form.value.seguradoraId || !form.value.servicoTipo.trim() || !form.value.valor) return
  loading.value = true
  try {
    await addPreco({
      seguradoraId: form.value.seguradoraId,
      seguradoraNome: seguradoraNomeDe(form.value.seguradoraId),
      servicoTipo: form.value.servicoTipo.trim(),
      valor: form.value.valor,
    })
    closeModal()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Tabela de Preços</h2>
          <p class="text-slate-500 text-sm mt-0.5">Valores acordados por seguradora e tipo de serviço — base do cálculo de recebíveis.</p>
        </div>
        <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" @click="openModal()">+ Novo preço / reajuste</Button>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Seguradora</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Serviço</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor vigente</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vigente desde</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in vigentes" :key="p.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 text-slate-700">{{ p.seguradoraNome }}</td>
              <td class="px-4 py-3 text-slate-700">{{ p.servicoTipo }}</td>
              <td class="px-4 py-3 font-semibold text-slate-800">{{ formatarMoeda(p.valor) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ formatarData(p.vigenciaInicio) }}</td>
              <td class="px-4 py-3">
                <button class="text-xs text-primary font-semibold hover:underline" @click="openModal(p)">Reajustar</button>
              </td>
            </tr>
            <tr v-if="vigentes.length === 0"><td colspan="5" class="px-4 py-12 text-center text-slate-400">Nenhum preço cadastrado ainda.</td></tr>
          </tbody>
        </table>
      </div>

      <button class="text-xs text-slate-500 hover:text-slate-700 underline" @click="mostrarHistorico = !mostrarHistorico">
        {{ mostrarHistorico ? 'Ocultar' : 'Ver' }} histórico de reajustes ({{ historico.length }})
      </button>

      <div v-if="mostrarHistorico" class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Seguradora</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Serviço</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vigência</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in historico" :key="p.id" class="border-b border-slate-100 text-slate-500">
              <td class="px-4 py-3">{{ p.seguradoraNome }}</td>
              <td class="px-4 py-3">{{ p.servicoTipo }}</td>
              <td class="px-4 py-3">{{ formatarMoeda(p.valor) }}</td>
              <td class="px-4 py-3">{{ formatarData(p.vigenciaInicio) }} até {{ formatarData(p.vigenciaFim) }}</td>
            </tr>
            <tr v-if="historico.length === 0"><td colspan="4" class="px-4 py-8 text-center text-slate-400">Nenhum reajuste ainda.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h3 class="text-lg font-bold text-slate-900">Novo preço / reajuste</h3>
        <p class="text-xs text-slate-400">Cadastrar um novo valor fecha automaticamente a vigência anterior da mesma seguradora + serviço, sem apagar o histórico.</p>
        <div class="space-y-1.5">
          <Label>Seguradora *</Label>
          <select v-model="form.seguradoraId" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Selecione...</option>
            <option v-for="i in integradoras" :key="i.id" :value="i.id">{{ i.nome }}</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <Label>Tipo de serviço *</Label>
          <Input v-model="form.servicoTipo" placeholder="Ex: FORNECIMENTO DE CAÇAMBA" />
        </div>
        <div class="space-y-1.5">
          <Label>Valor (R$) *</Label>
          <Input v-model.number="form.valor" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" @click="closeModal">Cancelar</Button>
          <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="loading || !form.seguradoraId || !form.servicoTipo.trim() || !form.valor" @click="submit">
            {{ loading ? 'Salvando...' : 'Salvar' }}
          </Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
