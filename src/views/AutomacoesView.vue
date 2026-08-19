<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAutomacoes } from '@/composables/useAutomacoes'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MODO_LABEL, AUTONOMIA_LABEL, type AutomacoesConfig } from '@/types/automacao'

const { config, fila, salvarConfig, dispararTickManual } = useAutomacoes()

// Rascunho local editável — sincroniza quando o Firestore emite (1ª carga
// ou alteração de outra aba/pessoa), sem sobrescrever o que o usuário está
// digitando no meio de uma edição.
const rascunho = ref<AutomacoesConfig>(JSON.parse(JSON.stringify(config.value)))
let primeiraCarga = true
watch(config, (novo) => {
  if (primeiraCarga) {
    rascunho.value = JSON.parse(JSON.stringify(novo))
    primeiraCarga = false
  }
}, { immediate: true })

const salvando = ref(false)
const salvo = ref(false)
async function handleSalvar() {
  salvando.value = true
  salvo.value = false
  try {
    await salvarConfig(rascunho.value)
    salvo.value = true
    setTimeout(() => (salvo.value = false), 3000)
  } finally {
    salvando.value = false
  }
}

const disparando = ref(false)
const resultadoTick = ref('')
async function handleDispararTick() {
  disparando.value = true
  resultadoTick.value = ''
  try {
    const resultado = await dispararTickManual()
    resultadoTick.value = resultado.executado ? 'Executado.' : `Não executado: ${resultado.motivo}`
  } catch (err) {
    resultadoTick.value = err instanceof Error ? err.message : 'Falha ao disparar.'
  } finally {
    disparando.value = false
  }
}

const tipoFilaLabel: Record<string, string> = {
  distribuicao: 'Distribuição',
  confirmacao_dia: 'Confirmação do dia',
  confirmacao_entrega: 'Confirmação de entrega',
  cobranca_foto: 'Cobrança de foto',
  cobranca_retirada: 'Cobrança de retirada',
}

const situacaoCor: Record<string, string> = {
  executada: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  simulada: 'bg-blue-100 text-blue-700 border border-blue-200',
  sugerida: 'bg-amber-100 text-amber-700 border border-amber-200',
  falha: 'bg-red-100 text-red-600 border border-red-200',
}

function formatarData(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Central de Automações</h2>
          <p class="text-slate-500 text-sm mt-0.5">Regras, tempos e fila de automações.</p>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" class="h-8 text-xs border-slate-200" :disabled="disparando" @click="handleDispararTick">
            {{ disparando ? 'Rodando...' : '▶ Rodar 1 tick agora (teste)' }}
          </Button>
          <span v-if="resultadoTick" class="text-xs text-slate-500">{{ resultadoTick }}</span>
        </div>
      </div>

      <!-- Situação geral -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
        <label class="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" v-model="rascunho.pausarTodas" class="w-4 h-4 mt-0.5 accent-yellow-400" />
          <span>
            <span class="text-sm font-semibold text-slate-800">⏸ Pausar todas as automações</span>
            <p class="text-xs text-slate-500 mt-0.5">Enquanto marcado, nada é enviado automaticamente até ser desmarcado. As OS e conversas continuam funcionando normalmente.</p>
          </span>
        </label>
      </div>

      <!-- Distribuição automática -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900">📡 Distribuição automática</h3>
          <select v-model="rascunho.distribuicao.modo" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option v-for="(l, m) in MODO_LABEL" :key="m" :value="m">{{ l }}</option>
          </select>
        </div>
        <p class="text-xs text-slate-500">Cada OS tem sua própria automação — um prestador pode atender várias no mesmo dia sem interferência.</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-xs">Tempo pro prestador responder (min)</Label><Input v-model.number="rascunho.distribuicao.tempoRespostaMin" type="number" min="1" /></div>
          <div class="space-y-1"><Label class="text-xs">Tempo extra pra "preciso confirmar" (min)</Label><Input v-model.number="rascunho.distribuicao.tempoExtraConfirmarMin" type="number" min="0" /></div>
          <div class="space-y-1">
            <Label class="text-xs">Máximo de tentativas (vazio = sem limite)</Label>
            <input v-model.number="rascunho.distribuicao.maxTentativas" type="number" min="1" placeholder="Sem limite" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div class="space-y-1">
            <Label class="text-xs">Nível de autonomia</Label>
            <select v-model="rascunho.distribuicao.autonomia" class="w-full h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option v-for="(l, a) in AUTONOMIA_LABEL" :key="a" :value="a">{{ l }}</option>
            </select>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" v-model="rascunho.distribuicao.enviarParaPendenciaSeRecusarTodos" class="accent-yellow-400" /> Se todos recusarem/esgotar tentativas, enviar para Pendências</label>
      </div>

      <!-- Confirmação do dia -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900">📅 Confirmação do dia</h3>
          <select v-model="rascunho.confirmacaoDia.modo" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option v-for="(l, m) in MODO_LABEL" :key="m" :value="m">{{ l }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-xs">Horário padrão de envio</Label><Input v-model="rascunho.confirmacaoDia.horarioPadrao" type="time" /></div>
          <div class="space-y-1">
            <Label class="text-xs">Nível de autonomia</Label>
            <select v-model="rascunho.confirmacaoDia.autonomia" class="w-full h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option v-for="(l, a) in AUTONOMIA_LABEL" :key="a" :value="a">{{ l }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Confirmação de entrega -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900">🚚 Confirmação de entrega</h3>
          <select v-model="rascunho.confirmacaoEntrega.modo" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option v-for="(l, m) in MODO_LABEL" :key="m" :value="m">{{ l }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-xs">Tempo antes de cobrar de novo (min)</Label><Input v-model.number="rascunho.confirmacaoEntrega.tempoAposGatilhoMin" type="number" min="0" /></div>
          <div class="space-y-1"><Label class="text-xs">Máximo de cobranças automáticas</Label><Input v-model.number="rascunho.confirmacaoEntrega.maxCobrancas" type="number" min="0" /></div>
          <div class="space-y-1 col-span-2">
            <Label class="text-xs">Nível de autonomia</Label>
            <select v-model="rascunho.confirmacaoEntrega.autonomia" class="w-full h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option v-for="(l, a) in AUTONOMIA_LABEL" :key="a" :value="a">{{ l }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Foto da entrega -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900">📷 Foto da entrega</h3>
          <select v-model="rascunho.cobrancaFoto.modo" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option v-for="(l, m) in MODO_LABEL" :key="m" :value="m">{{ l }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-xs">Tempo após confirmação pra cobrar (min)</Label><Input v-model.number="rascunho.cobrancaFoto.tempoAposGatilhoMin" type="number" min="0" /></div>
          <div class="space-y-1"><Label class="text-xs">Máximo de cobranças</Label><Input v-model.number="rascunho.cobrancaFoto.maxCobrancas" type="number" min="0" /></div>
          <div class="space-y-1 col-span-2">
            <Label class="text-xs">Nível de autonomia</Label>
            <select v-model="rascunho.cobrancaFoto.autonomia" class="w-full h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option v-for="(l, a) in AUTONOMIA_LABEL" :key="a" :value="a">{{ l }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Retirada -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900">📦 Retirada</h3>
          <select v-model="rascunho.cobrancaRetirada.modo" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option v-for="(l, m) in MODO_LABEL" :key="m" :value="m">{{ l }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-xs">Dias após entrega pra 1ª cobrança</Label><Input v-model.number="rascunho.cobrancaRetirada.diasAposEntregaPrimeiraCobranca" type="number" min="0" /></div>
          <div class="space-y-1"><Label class="text-xs">Tempo entre cobranças (horas)</Label><Input v-model.number="rascunho.cobrancaRetirada.tempoEntreCobrancasHoras" type="number" min="1" /></div>
          <div class="space-y-1"><Label class="text-xs">Máximo de cobranças</Label><Input v-model.number="rascunho.cobrancaRetirada.maxCobrancas" type="number" min="0" /></div>
          <div class="space-y-1">
            <Label class="text-xs">Nível de autonomia</Label>
            <select v-model="rascunho.cobrancaRetirada.autonomia" class="w-full h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option v-for="(l, a) in AUTONOMIA_LABEL" :key="a" :value="a">{{ l }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Horário permitido -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <h3 class="font-bold text-slate-900">🕐 Horário permitido para mensagens automáticas</h3>
        <p class="text-xs text-slate-500">Fora deste período nenhuma automação dispara — fica pro próximo tick dentro da janela.</p>
        <div class="grid grid-cols-2 gap-3 max-w-sm">
          <div class="space-y-1"><Label class="text-xs">Início</Label><Input v-model="rascunho.janelaInicio" type="time" /></div>
          <div class="space-y-1"><Label class="text-xs">Fim</Label><Input v-model="rascunho.janelaFim" type="time" /></div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="salvando" @click="handleSalvar">
          {{ salvando ? 'Salvando...' : 'Salvar configurações' }}
        </Button>
        <span v-if="salvo" class="text-xs text-emerald-600">Salvo.</span>
      </div>

      <!-- Fila de automações (Card 12.8) -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 class="font-bold text-slate-900 text-sm">Automações — últimas execuções</h3>
          <p class="text-xs text-slate-500 mt-0.5">Log das últimas 100 avaliações do motor (executadas, simuladas, sugeridas ou com falha).</p>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">OS</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Prestador</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Situação</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Quando</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in fila" :key="f.id" class="border-b border-slate-100">
              <td class="px-4 py-2 font-mono text-xs text-slate-800">{{ f.numeroOs }}</td>
              <td class="px-4 py-2 text-slate-600 text-xs">{{ tipoFilaLabel[f.tipo] ?? f.tipo }}</td>
              <td class="px-4 py-2 text-slate-600 text-xs">{{ f.prestadorNome || '—' }}</td>
              <td class="px-4 py-2"><Badge :class="situacaoCor[f.situacao]" class="text-[10px]">{{ f.situacao }}</Badge></td>
              <td class="px-4 py-2 text-slate-400 text-xs">{{ formatarData(f.criadoEm) }}</td>
              <td class="px-4 py-2 text-slate-400 text-xs">{{ f.detalhe || '—' }}</td>
            </tr>
            <tr v-if="fila.length === 0"><td colspan="6" class="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma automação rodou ainda.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </DashboardLayout>
</template>
