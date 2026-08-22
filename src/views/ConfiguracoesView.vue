<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUsuarioAtual } from '@/composables/useUsuarioAtual'
import { useOrdens } from '@/composables/useOrdens'
import { registrarAuditoria } from '@/composables/useAuditoria'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PERFIL_LABEL } from '@/types/governanca'

const { usuarioAtual } = useUsuarioAtual()
const { ordens } = useOrdens()

// ─── Zona de perigo (Card 14.7) — só apaga da coleção `ordens`, nunca
// prestadores/usuários/permissões/auditoria (regra explícita do card). Não
// remove em cascata recebíveis/repasses vinculados — ficam órfãos, e isso
// é avisado na tela em vez de ser expandido silenciosamente.
type ModoExclusao = 'especifica' | 'periodo' | 'todas'
const modoExclusao = ref<ModoExclusao>('especifica')
const numeroAlvo = ref('')
const periodoInicio = ref('')
const periodoFim = ref('')
const confirmacaoTexto = ref('')
const apagando = ref(false)
const resultadoExclusao = ref('')

const osParaApagar = computed(() => {
  if (modoExclusao.value === 'especifica') {
    if (!numeroAlvo.value.trim()) return []
    const alvo = numeroAlvo.value.trim().toLowerCase()
    return ordens.value.filter((o) => o.numero.toLowerCase() === alvo || o.numeroOsSeguradora?.toLowerCase() === alvo)
  }
  if (modoExclusao.value === 'periodo') {
    if (!periodoInicio.value || !periodoFim.value) return []
    const ini = new Date(periodoInicio.value).getTime()
    const fim = new Date(periodoFim.value + 'T23:59:59').getTime()
    return ordens.value.filter((o) => {
      const t = new Date(o.datas.criacao).getTime()
      return t >= ini && t <= fim
    })
  }
  return ordens.value
})

const fraseEsperada = computed(() => `EXCLUIR ${osParaApagar.value.length} OS`)
const podeExecutar = computed(() => osParaApagar.value.length > 0 && confirmacaoTexto.value === fraseEsperada.value)

async function executarExclusao() {
  if (!podeExecutar.value) return
  apagando.value = true
  resultadoExclusao.value = ''
  try {
    const alvos = osParaApagar.value
    for (let i = 0; i < alvos.length; i += 450) {
      const lote = alvos.slice(i, i + 450)
      const batch = writeBatch(db)
      lote.forEach((os) => batch.delete(doc(db, 'ordens', os.id)))
      await batch.commit()
    }
    resultadoExclusao.value = `${alvos.length} OS apagada(s).`
    // Ação sensível (Backlog Fase 10, Card 8.3 — LGPD) — sempre auditada,
    // uma entrada por operação (não por OS) pra não afogar o log numa
    // exclusão em massa; a lista de números fica no próprio registro.
    registrarAuditoria({
      tipo: 'exclusao_os',
      descricao: `Zona de Perigo: ${alvos.length} OS apagada(s) (modo: ${modoExclusao.value}) — ${alvos.map((o) => o.numero).slice(0, 20).join(', ')}${alvos.length > 20 ? '...' : ''}`,
      usuarioUid: usuarioAtual.value?.uid ?? '',
      usuarioNome: usuarioAtual.value?.nome ?? '',
    }).catch(() => {})
    numeroAlvo.value = ''
    periodoInicio.value = ''
    periodoFim.value = ''
    confirmacaoTexto.value = ''
  } finally {
    apagando.value = false
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-6 max-w-3xl">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Configurações</h2>
        <p class="text-slate-500 text-sm mt-0.5">Dados da conta, atalhos e ações administrativas.</p>
      </div>

      <Card>
        <CardHeader><CardTitle class="text-base">Sua conta</CardTitle></CardHeader>
        <CardContent class="space-y-1 text-sm">
          <p><span class="text-slate-400">Nome:</span> {{ usuarioAtual?.nome }}</p>
          <p><span class="text-slate-400">E-mail:</span> {{ usuarioAtual?.email }}</p>
          <p><span class="text-slate-400">Perfil:</span> {{ usuarioAtual ? PERFIL_LABEL[usuarioAtual.perfil] : '—' }}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle class="text-base">Atalhos</CardTitle></CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <RouterLink to="/automacoes"><Button variant="outline" size="sm">⚡ Central de Automações</Button></RouterLink>
          <RouterLink to="/whatsapp"><Button variant="outline" size="sm">💬 Diagnóstico de WhatsApp</Button></RouterLink>
          <RouterLink v-if="usuarioAtual?.perfil === 'super_admin'" to="/usuarios"><Button variant="outline" size="sm">🔑 Usuários e Permissões</Button></RouterLink>
        </CardContent>
      </Card>

      <Card v-if="usuarioAtual?.perfil === 'super_admin'" class="border-red-200">
        <CardHeader><CardTitle class="text-base text-red-600">⚠ Zona de perigo</CardTitle></CardHeader>
        <CardContent class="space-y-4">
          <p class="text-xs text-slate-500">Só afeta a coleção de Ordens de Serviço — nunca prestadores, usuários, permissões ou auditoria. Recebíveis/repasses já gerados pra uma OS apagada não são removidos automaticamente (ficam órfãos, sem OS de origem).</p>

          <div class="flex gap-2">
            <button
              v-for="m in (['especifica', 'periodo', 'todas'] as const)"
              :key="m"
              class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              :class="modoExclusao === m ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'"
              @click="modoExclusao = m; confirmacaoTexto = ''"
            >{{ m === 'especifica' ? 'OS específica' : m === 'periodo' ? 'Por período' : 'Todas as OS' }}</button>
          </div>

          <div v-if="modoExclusao === 'especifica'" class="space-y-1.5">
            <Label class="text-xs">Número da OS</Label>
            <Input v-model="numeroAlvo" placeholder="Ex: OS-2026-001" />
          </div>
          <div v-else-if="modoExclusao === 'periodo'" class="flex gap-3">
            <div class="space-y-1.5">
              <Label class="text-xs">De</Label>
              <input v-model="periodoInicio" type="date" class="h-9 rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">Até</Label>
              <input v-model="periodoFim" type="date" class="h-9 rounded-md border border-slate-200 px-3 text-sm" />
            </div>
          </div>

          <p class="text-sm font-semibold" :class="osParaApagar.length > 0 ? 'text-red-600' : 'text-slate-400'">
            {{ osParaApagar.length }} OS será(ão) apagada(s) permanentemente.
          </p>

          <div v-if="osParaApagar.length > 0" class="space-y-1.5">
            <Label class="text-xs">Pra confirmar, digite exatamente: <span class="font-mono font-semibold">{{ fraseEsperada }}</span></Label>
            <Input v-model="confirmacaoTexto" :placeholder="fraseEsperada" />
          </div>

          <Button variant="destructive" :disabled="!podeExecutar || apagando" @click="executarExclusao">
            {{ apagando ? 'Apagando...' : 'Apagar permanentemente' }}
          </Button>
          <p v-if="resultadoExclusao" class="text-xs text-emerald-600">{{ resultadoExclusao }}</p>
        </CardContent>
      </Card>
      <p v-else class="text-xs text-slate-400">A Zona de Perigo só aparece pra usuários com perfil Super Admin.</p>
    </div>
  </DashboardLayout>
</template>
