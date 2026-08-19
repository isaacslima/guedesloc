<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import { usePrestadores } from '@/composables/usePrestadores'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { OrdemUnificada } from '@/types/ordem'
import type { Prestador } from '@/types'

const { ordens, atribuirPrestador, registrarRespostaDistribuicao } = useOrdens()
const { prestadores } = usePrestadores()

const aba = ref<'aguardando_distribuicao' | 'aguardando_confirmacao'>('aguardando_distribuicao')

const aguardandoDistribuicao = computed(() => ordens.value.filter((o) => o.etapa === 'aguardando_distribuicao'))
const aguardandoConfirmacao = computed(() => ordens.value.filter((o) => o.etapa === 'distribuindo_aguardando_resposta'))

function formatarData(iso: string | undefined): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Prestadores ordenados pela cascata de cobertura da cidade da OS (Card 10.2) — sem cidade/cobertura conhecida, cai pra lista geral de ativos. */
function prestadoresSugeridos(os: OrdemUnificada): { lista: Prestador[]; porCobertura: boolean } {
  const cidade = os.cliente.endereco.cidade?.trim().toLowerCase()
  const ativos = prestadores.value.filter((p) => p.situacao === 'ativo')

  if (!cidade) return { lista: ativos, porCobertura: false }

  const comCobertura = ativos
    .map((p) => ({ prestador: p, cobertura: p.cidadesAtendidas.find((c) => c.cidade.trim().toLowerCase() === cidade) }))
    .filter((x) => x.cobertura)
    .sort((a, b) => a.cobertura!.prioridade - b.cobertura!.prioridade)
    .map((x) => x.prestador)

  return comCobertura.length > 0 ? { lista: comCobertura, porCobertura: true } : { lista: ativos, porCobertura: false }
}

/** Quantas OS o prestador já tem nesse mesmo dia (agendamento), ainda ativas — pra o aviso de limite diário (Card 10.4). */
function osNoMesmoDia(prestadorId: string, dataReferencia: string | undefined): number {
  if (!dataReferencia) return 0
  const dia = new Date(dataReferencia).toDateString()
  return ordens.value.filter((o) => {
    if (!o.prestadoresIds.includes(prestadorId)) return false
    if (o.etapa === 'cancelada' || o.etapa === 'finalizada') return false
    if (!o.datas.agendamento) return false
    return new Date(o.datas.agendamento).toDateString() === dia
  }).length
}

const selecionado = ref<Record<string, string>>({})

function rotuloPrestador(p: Prestador, os: OrdemUnificada): string {
  const cidade = os.cliente.endereco.cidade?.trim().toLowerCase()
  const cobertura = cidade ? p.cidadesAtendidas.find((c) => c.cidade.trim().toLowerCase() === cidade) : undefined
  return cobertura ? `${p.nome} (prioridade ${cobertura.prioridade})` : p.nome
}

async function confirmarAtribuicao(os: OrdemUnificada) {
  const prestadorId = selecionado.value[os.id]
  if (!prestadorId) return
  const prestador = prestadores.value.find((p) => p.id === prestadorId)
  if (!prestador) return
  await atribuirPrestador(os.id, prestador.id, prestador.nome)
  delete selecionado.value[os.id]
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Distribuição</h2>
        <p class="text-slate-500 text-sm mt-0.5">Escolha o prestador e acompanhe a confirmação.</p>
      </div>

      <div class="flex gap-2">
        <Button
          size="sm"
          :variant="aba === 'aguardando_distribuicao' ? 'default' : 'outline'"
          :class="aba === 'aguardando_distribuicao' ? 'bg-primary text-slate-900 font-bold' : 'border-slate-200'"
          @click="aba = 'aguardando_distribuicao'"
        >
          Aguardando distribuição
          <Badge class="ml-2 bg-white/60 text-inherit border-0">{{ aguardandoDistribuicao.length }}</Badge>
        </Button>
        <Button
          size="sm"
          :variant="aba === 'aguardando_confirmacao' ? 'default' : 'outline'"
          :class="aba === 'aguardando_confirmacao' ? 'bg-primary text-slate-900 font-bold' : 'border-slate-200'"
          @click="aba = 'aguardando_confirmacao'"
        >
          Aguardando confirmação
          <Badge class="ml-2 bg-white/60 text-inherit border-0">{{ aguardandoConfirmacao.length }}</Badge>
        </Button>
      </div>

      <!-- Aguardando distribuição -->
      <div v-if="aba === 'aguardando_distribuicao'" class="space-y-3">
        <p v-if="aguardandoDistribuicao.length === 0" class="text-center text-slate-400 py-12">Nenhuma OS aguardando distribuição.</p>

        <div v-for="os in aguardandoDistribuicao" :key="os.id" class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p class="font-mono font-semibold text-slate-800">{{ os.numero }}</p>
              <p class="text-sm text-slate-600">{{ os.cliente.nome }} · {{ os.cliente.endereco.cidade || os.cliente.endereco.texto }}</p>
              <p class="text-xs text-slate-400">Agendamento: {{ formatarData(os.datas.agendamento) }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <select
              v-model="selecionado[os.id]"
              class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary min-w-[240px]"
            >
              <option value="">Selecione um prestador...</option>
              <option v-for="p in prestadoresSugeridos(os).lista" :key="p.id" :value="p.id">
                {{ rotuloPrestador(p, os) }}
              </option>
            </select>
            <Button size="sm" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="!selecionado[os.id]" @click="confirmarAtribuicao(os)">
              Atribuir
            </Button>
            <span v-if="!prestadoresSugeridos(os).porCobertura" class="text-xs text-amber-600">
              Cidade da OS não informada ou sem prestador com cobertura cadastrada — mostrando todos os ativos.
            </span>
          </div>

          <p
            v-if="selecionado[os.id] && osNoMesmoDia(selecionado[os.id]!, os.datas.agendamento) >= (prestadores.find(p => p.id === selecionado[os.id])?.limiteOsPorDia ?? Infinity)"
            class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1"
          >
            ⚠ Esse prestador já tem {{ osNoMesmoDia(selecionado[os.id]!, os.datas.agendamento) }} OS nesse mesmo dia — atingiu o limite diário configurado. Ainda é possível atribuir manualmente.
          </p>
        </div>
      </div>

      <!-- Aguardando confirmação -->
      <div v-else class="space-y-3">
        <p v-if="aguardandoConfirmacao.length === 0" class="text-center text-slate-400 py-12">Nenhuma OS aguardando confirmação.</p>

        <div v-for="os in aguardandoConfirmacao" :key="os.id" class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p class="font-mono font-semibold text-slate-800">{{ os.numero }}</p>
            <p class="text-sm text-slate-600">{{ os.cliente.nome }} · prestador: <strong>{{ os.prestadoresNomes[0] }}</strong></p>
            <p class="text-xs text-slate-400">Agendamento: {{ formatarData(os.datas.agendamento) }}</p>
          </div>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" class="border-emerald-200 text-emerald-700 hover:bg-emerald-50" @click="registrarRespostaDistribuicao(os.id, true)">
              Confirmar aceite
            </Button>
            <Button size="sm" variant="outline" class="border-red-200 text-red-600 hover:bg-red-50" @click="registrarRespostaDistribuicao(os.id, false)">
              Recusou, redistribuir
            </Button>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
