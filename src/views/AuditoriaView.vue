<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuditoria } from '@/composables/useAuditoria'
import { useOrdens } from '@/composables/useOrdens'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TIPO_ACAO_LABEL } from '@/types/governanca'

const { entradas } = useAuditoria()
const { ordens } = useOrdens()

interface LinhaAuditoria {
  id: string
  em: string
  tipoLabel: string
  descricao: string
  usuarioNome: string
  entidadeLabel?: string
  cor: string
}

const CORES: Record<string, string> = {
  login: 'bg-slate-100 text-slate-600 border border-slate-200',
  edicao_os: 'bg-blue-100 text-blue-700 border border-blue-200',
  envio_whatsapp_manual: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  usuario_criado: 'bg-violet-100 text-violet-700 border border-violet-200',
  usuario_alterado: 'bg-violet-100 text-violet-700 border border-violet-200',
  mudanca_etapa: 'bg-amber-100 text-amber-700 border border-amber-200',
  // Ações sensíveis (Backlog Fase 10, Card 8.3 — LGPD) — destacadas em vermelho.
  exclusao_os: 'bg-red-100 text-red-600 border border-red-200',
  valor_alterado: 'bg-red-100 text-red-600 border border-red-200',
  pagamento_aprovado: 'bg-red-100 text-red-600 border border-red-200',
}

const linhas = computed<LinhaAuditoria[]>(() => {
  const deAuditoria: LinhaAuditoria[] = entradas.value.map((e) => ({
    id: e.id,
    em: e.em,
    tipoLabel: TIPO_ACAO_LABEL[e.tipo],
    descricao: e.descricao,
    usuarioNome: e.usuarioNome,
    entidadeLabel: e.entidadeLabel,
    cor: CORES[e.tipo] ?? CORES.edicao_os!,
  }))

  const deHistoricoOS: LinhaAuditoria[] = []
  for (const os of ordens.value) {
    for (const h of os.historico) {
      if (!h.motivo?.trim()) continue
      deHistoricoOS.push({
        id: `${os.id}-${h.em}`,
        em: h.em,
        tipoLabel: 'Mudança de etapa',
        descricao: `${h.etapaAnterior ?? 'Criação'} → ${h.etapaNova}: ${h.motivo}`,
        usuarioNome: h.usuario ?? 'Sistema/equipe',
        entidadeLabel: os.numero,
        cor: CORES.mudanca_etapa!,
      })
    }
  }

  return [...deAuditoria, ...deHistoricoOS].sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
})

const busca = ref('')
const filtroTipo = ref('')

const filtradas = computed(() => {
  return linhas.value.filter((l) => {
    if (filtroTipo.value && l.tipoLabel !== filtroTipo.value) return false
    if (busca.value.trim()) {
      const alvo = busca.value.trim().toLowerCase()
      const texto = `${l.descricao} ${l.usuarioNome} ${l.entidadeLabel ?? ''}`.toLowerCase()
      if (!texto.includes(alvo)) return false
    }
    return true
  })
})

const tiposDisponiveis = computed(() => [...new Set(linhas.value.map((l) => l.tipoLabel))].sort())

function formatarData(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR')
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Auditoria</h2>
        <p class="text-slate-500 text-sm mt-0.5">Toda ação relevante da equipe — login, edição de OS, mudança de etapa, envio manual de WhatsApp, gestão de usuários.</p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <Input v-model="busca" placeholder="Buscar por OS, pessoa, descrição..." class="max-w-sm border-slate-200" />
        <select v-model="filtroTipo" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white">
          <option value="">Todos os tipos</option>
          <option v-for="t in tiposDisponiveis" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quando</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in filtradas.slice(0, 200)" :key="l.id" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 text-slate-500 whitespace-nowrap">{{ formatarData(l.em) }}</td>
              <td class="px-4 py-3"><Badge :class="l.cor">{{ l.tipoLabel }}</Badge></td>
              <td class="px-4 py-3 text-slate-700">{{ l.descricao }}</td>
              <td class="px-4 py-3 font-mono text-slate-600">{{ l.entidadeLabel || '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ l.usuarioNome }}</td>
            </tr>
            <tr v-if="filtradas.length === 0"><td colspan="5" class="px-4 py-12 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
          </tbody>
        </table>
      </div>
      <p v-if="filtradas.length > 200" class="text-xs text-slate-400">Mostrando as 200 primeiras de {{ filtradas.length }} — refine a busca pra achar algo específico.</p>
    </div>
  </DashboardLayout>
</template>
