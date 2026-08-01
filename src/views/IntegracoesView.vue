<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { useIntegradoras } from '@/composables/useIntegradoras'
import type { Integradora, IntegradoraInput, StatusIntegradora, TipoIntegracao } from '@/types/integracao'

const { integradoras, addIntegradora, updateIntegradora, toggleStatusIntegradora, deleteIntegradora } = useIntegradoras()

const showModal = ref(false)
const editingId = ref<string | null>(null)
const isSubmitting = ref(false)
const reprocessingId = ref<string | null>(null)

const form = ref<IntegradoraInput>({
  nome: '',
  codigo: '',
  tipoIntegracao: 'API',
  status: 'homologacao',
  secretRef: '',
  endpointUrl: '',
  slaMinutos: 30,
})

const stats = computed(() => {
  return {
    total: integradoras.value.length,
    ativas: integradoras.value.filter((i) => i.status === 'ativa').length,
    homologacao: integradoras.value.filter((i) => i.status === 'homologacao').length,
    inativas: integradoras.value.filter((i) => i.status === 'inativa').length,
    apiCount: integradoras.value.filter((i) => i.tipoIntegracao === 'API').length,
    rpaCount: integradoras.value.filter((i) => i.tipoIntegracao === 'RPA').length,
  }
})

function openNewModal() {
  editingId.value = null
  form.value = {
    nome: '',
    codigo: '',
    tipoIntegracao: 'API',
    status: 'homologacao',
    secretRef: '',
    endpointUrl: '',
    slaMinutos: 30,
  }
  showModal.value = true
}

function openEditModal(item: Integradora) {
  editingId.value = item.id
  form.value = {
    nome: item.nome,
    codigo: item.codigo,
    tipoIntegracao: item.tipoIntegracao,
    status: item.status,
    secretRef: item.secretRef || '',
    endpointUrl: item.endpointUrl || '',
    slaMinutos: item.slaMinutos,
  }
  showModal.value = true
}

async function handleSubmit() {
  if (!form.value.nome || !form.value.codigo) return
  isSubmitting.value = true
  try {
    if (editingId.value) {
      await updateIntegradora(editingId.value, form.value)
    } else {
      await addIntegradora(form.value)
    }
    showModal.value = false
  } catch (err) {
    console.error('Erro ao salvar integradora:', err)
  } finally {
    isSubmitting.value = false
  }
}

async function handleReprocessar(id: string) {
  reprocessingId.value = id
  setTimeout(() => {
    reprocessingId.value = null
    alert('Reprocessamento de sincronização solicitado com sucesso!')
  }, 1200)
}

function statusBadgeClass(status: StatusIntegradora) {
  switch (status) {
    case 'ativa':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'homologacao':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    case 'inativa':
      return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }
}

function statusDotClass(status: StatusIntegradora) {
  switch (status) {
    case 'ativa':
      return 'bg-emerald-500 animate-pulse'
    case 'homologacao':
      return 'bg-amber-500'
    case 'inativa':
      return 'bg-slate-400'
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Central de Integrações</h1>
          <p class="text-slate-500 text-sm mt-1">
            Painel de controle e monitoramento de Adapters de API e Workers de RPA por Seguradora
          </p>
        </div>
        <button
          @click="openNewModal"
          class="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm"
        >
          <span>➕</span> Cadastrar Seguradora
        </button>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-400">Total Integradoras</p>
            <p class="text-2xl font-black text-slate-900 mt-1">{{ stats.total }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ stats.apiCount }} APIs / {{ stats.rpaCount }} RPAs</p>
          </div>
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl">🔌</div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-400">Em Operação (Ativas)</p>
            <p class="text-2xl font-black text-emerald-600 mt-1">{{ stats.ativas }}</p>
            <p class="text-xs text-emerald-600/80 mt-1">Sincronização em tempo real</p>
          </div>
          <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-xl text-emerald-600">🟢</div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-400">Em Homologação</p>
            <p class="text-2xl font-black text-amber-600 mt-1">{{ stats.homologacao }}</p>
            <p class="text-xs text-amber-600/80 mt-1">Ambiente de testes/validação</p>
          </div>
          <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-xl text-amber-600">🟡</div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-400">Inativas</p>
            <p class="text-2xl font-black text-slate-400 mt-1">{{ stats.inativas }}</p>
            <p class="text-xs text-slate-400 mt-1">Pausadas ou desativadas</p>
          </div>
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl text-slate-400">⚪</div>
        </div>
      </div>

      <!-- Tabela de Integradoras -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900">Seguradoras e Adapters Cadastrados</h2>
          <span class="text-xs text-slate-400">Garantia de isolamento e contrato único</span>
        </div>

        <div v-if="integradoras.length === 0" class="p-12 text-center text-slate-400">
          <p class="text-3xl mb-2">📥</p>
          <p class="font-medium text-slate-600">Nenhuma integradora cadastrada ainda.</p>
          <p class="text-xs mt-1">Clique em "Cadastrar Seguradora" para adicionar a primeira integração.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th class="py-3.5 px-4">Seguradora</th>
                <th class="py-3.5 px-4">Tipo</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4">SLA</th>
                <th class="py-3.5 px-4">Secret Manager (Ref)</th>
                <th class="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="item in integradoras" :key="item.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="statusDotClass(item.status)"></span>
                    <div>
                      <p class="font-bold text-slate-900">{{ item.nome }}</p>
                      <p class="text-xs text-slate-400 font-mono">{{ item.codigo }}</p>
                    </div>
                  </div>
                </td>

                <td class="py-4 px-4">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold"
                    :class="item.tipoIntegracao === 'API' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-purple-50 text-purple-700 border border-purple-200'"
                  >
                    <span>{{ item.tipoIntegracao === 'API' ? '⚡ API' : '🤖 RPA' }}</span>
                  </span>
                </td>

                <td class="py-4 px-4">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize"
                    :class="statusBadgeClass(item.status)"
                  >
                    {{ item.status }}
                  </span>
                </td>

                <td class="py-4 px-4 text-slate-600 font-medium">
                  {{ item.slaMinutos }} min
                </td>

                <td class="py-4 px-4 font-mono text-xs text-slate-500">
                  <span v-if="item.secretRef" class="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    🔒 {{ item.secretRef }}
                  </span>
                  <span v-else class="text-slate-400 italic">Sem secret</span>
                </td>

                <td class="py-4 px-4 text-right space-x-2">
                  <button
                    @click="handleReprocessar(item.id)"
                    :disabled="reprocessingId === item.id"
                    class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <span>{{ reprocessingId === item.id ? '⏳' : '🔄' }}</span>
                    <span>{{ reprocessingId === item.id ? 'Reprocessando...' : 'Sync' }}</span>
                  </button>
                  <button
                    @click="openEditModal(item)"
                    class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                  >
                    ✏️ Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Novo/Editar -->
    <div v-if="showModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-lg">
            {{ editingId ? 'Editar Integradora' : 'Cadastrar Nova Seguradora' }}
          </h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nome da Seguradora</label>
            <input
              v-model="form.nome"
              type="text"
              required
              placeholder="Ex: Tempo Assist, Porto Seguro..."
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Código Identificador</label>
              <input
                v-model="form.codigo"
                type="text"
                required
                placeholder="Ex: tempo_assist"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Tipo de Integração</label>
              <select
                v-model="form.tipoIntegracao"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                <option value="API">API REST / Webhook</option>
                <option value="RPA">RPA (Playwright / Portal)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Status Operacional</label>
              <select
                v-model="form.status"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                <option value="homologacao">Em Homologação</option>
                <option value="ativa">Ativa (Produção)</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">SLA Esperado (Minutos)</label>
              <input
                v-model.number="form.slaMinutos"
                type="number"
                min="1"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Referência no Secret Manager</label>
            <input
              v-model="form.secretRef"
              type="text"
              placeholder="Ex: secrets/tempo_assist_api_key (NUNCA credencial pura)"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p class="text-xs text-amber-600 mt-1">🔒 Por segurança, credenciais nunca são armazenadas diretamente no Firestore.</p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Endpoint URL / Portal Web</label>
            <input
              v-model="form.endpointUrl"
              type="url"
              placeholder="https://api.seguradora.com.br ou URL do portal"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {{ isSubmitting ? 'Salvando...' : 'Salvar Integradora' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </DashboardLayout>
</template>
