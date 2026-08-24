<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWhatsapp, type MensagemWhatsapp, type StatusWhatsapp, type TipoMensagemWhatsapp } from '@/composables/useWhatsapp'
import { useOrdens } from '@/composables/useOrdens'
import { useUsuarioAtual } from '@/composables/useUsuarioAtual'
import { registrarAuditoria } from '@/composables/useAuditoria'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const { mensagens, enviarMensagem, buscarStatus } = useWhatsapp()
const { ordens } = useOrdens()
const { usuarioAtual } = useUsuarioAtual()

const tipoLabel: Record<TipoMensagemWhatsapp, string> = {
  distribuicao: 'Distribuição',
  confirmacao_dia: 'Confirmação do dia',
  confirmacao_entrega: 'Confirmação de entrega',
  cobranca_foto: 'Cobrança de foto',
  cobranca_retirada: 'Cobrança de retirada',
  livre: 'Livre',
}

const tiposEnviaveis: Exclude<TipoMensagemWhatsapp, 'livre'>[] = [
  'distribuicao', 'confirmacao_dia', 'confirmacao_entrega', 'cobranca_foto', 'cobranca_retirada',
]

function formatarData(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// ─── Conversas agrupadas por telefone do prestador ─────────────
interface Thread {
  telefone: string
  prestadorNome: string
  osId: string | null
  numeroOs?: string
  ultimaMensagem: MensagemWhatsapp
}

/**
 * Mensagens antigas podem ter `prestadorTelefone` gravado com formatos
 * diferentes pro mesmo contato (a Z-API às vezes devolve o telefone da
 * resposta sem DDI e/ou sem o "nono dígito" do celular — ver
 * backend/src/services/whatsapp.ts, `chaveTelefone`). Normaliza aqui
 * também pra agrupar essas mensagens na mesma conversa mesmo em dados já
 * gravados antes da correção.
 */
function chaveTelefone(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '')
  const semDDI = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos
  if (semDDI.length === 11 && semDDI[2] === '9') return semDDI.slice(0, 2) + semDDI.slice(3)
  return semDDI
}

const threads = computed<Thread[]>(() => {
  const porTelefone = new Map<string, MensagemWhatsapp[]>()
  for (const m of mensagens.value) {
    if (!m.prestadorTelefone) continue
    const chave = chaveTelefone(m.prestadorTelefone)
    if (!porTelefone.has(chave)) porTelefone.set(chave, [])
    porTelefone.get(chave)!.push(m)
  }
  const lista: Thread[] = []
  for (const [telefone, msgs] of porTelefone) {
    const ultima = msgs[0]! // mensagens já vêm ordenadas desc do composable
    lista.push({
      telefone,
      prestadorNome: msgs.find((m) => m.prestadorNome)?.prestadorNome || telefone,
      osId: (msgs.find((m) => m.osId)?.osId) ?? null,
      numeroOs: msgs.find((m) => m.numeroOs)?.numeroOs,
      ultimaMensagem: ultima,
    })
  }
  return lista.sort((a, b) => new Date(b.ultimaMensagem.criadoEm).getTime() - new Date(a.ultimaMensagem.criadoEm).getTime())
})

const telefoneSelecionado = ref<string | null>(null)

const mensagensDaThread = computed(() => {
  if (!telefoneSelecionado.value) return []
  return mensagens.value.filter((m) => chaveTelefone(m.prestadorTelefone) === telefoneSelecionado.value).slice().reverse()
})

const osDaThread = computed(() => {
  const thread = threads.value.find((t) => t.telefone === telefoneSelecionado.value)
  if (!thread?.osId) return null
  return ordens.value.find((o) => o.id === thread.osId) ?? null
})

// ─── Diagnóstico (Card 11.6 — versão mínima; painel completo de
// Configurações fica pra Fase 8, Card 14.7) ─────────────────────
const status = ref<StatusWhatsapp | null>(null)
const statusErro = ref('')

onMounted(async () => {
  try {
    status.value = await buscarStatus()
  } catch (err) {
    statusErro.value = err instanceof Error ? err.message : 'Falha ao consultar status.'
  }
})

// ─── Nova mensagem ──────────────────────────────────────────────
const ordensComPrestador = computed(() => ordens.value.filter((o) => o.prestadoresIds.length > 0))
const novaOsId = ref('')
const novoTipo = ref<Exclude<TipoMensagemWhatsapp, 'livre'>>('distribuicao')
const enviando = ref(false)
const envioErro = ref('')
const envioOk = ref('')

async function handleEnviar() {
  if (!novaOsId.value) return
  enviando.value = true
  envioErro.value = ''
  envioOk.value = ''
  try {
    const resultado = await enviarMensagem(novaOsId.value, novoTipo.value)
    envioOk.value = resultado.simulado ? 'Enviado (simulado — sem credencial Z-API configurada ainda).' : 'Enviado.'
    const os = ordens.value.find((o) => o.id === novaOsId.value)
    registrarAuditoria({
      tipo: 'envio_whatsapp_manual',
      descricao: `Mensagem "${tipoLabel[novoTipo.value]}" enviada manualmente`,
      usuarioUid: usuarioAtual.value?.uid ?? '',
      usuarioNome: usuarioAtual.value?.nome ?? '',
      entidadeTipo: 'os',
      entidadeId: novaOsId.value,
      entidadeLabel: os?.numero,
    }).catch(() => {})
  } catch (err) {
    envioErro.value = err instanceof Error ? err.message : 'Falha ao enviar.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4 h-full flex flex-col">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">WhatsApp</h2>
          <p class="text-slate-500 text-sm mt-0.5">Conversas com os prestadores vinculadas às OS.</p>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <Badge v-if="status" :class="status.zapiConfigurado ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'">
            {{ status.zapiConfigurado ? 'Z-API configurada' : 'Z-API simulada (sem credencial)' }}
          </Badge>
          <span v-if="status?.ultimoCallbackRecebidoEm" class="text-slate-400">Último callback: {{ formatarData(status.ultimoCallbackRecebidoEm) }}</span>
          <span v-else-if="status" class="text-slate-400">Nenhum callback recebido ainda</span>
          <span v-if="statusErro" class="text-red-500">{{ statusErro }}</span>
        </div>
      </div>

      <!-- Nova mensagem -->
      <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-2 flex-wrap">
        <select v-model="novaOsId" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary min-w-[260px]">
          <option value="">Selecione uma OS com prestador atribuído...</option>
          <option v-for="os in ordensComPrestador" :key="os.id" :value="os.id">{{ os.numero }} — {{ os.prestadoresNomes[0] }}</option>
        </select>
        <select v-model="novoTipo" class="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
          <option v-for="t in tiposEnviaveis" :key="t" :value="t">{{ tipoLabel[t] }}</option>
        </select>
        <Button size="sm" class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="!novaOsId || enviando" @click="handleEnviar">
          {{ enviando ? 'Enviando...' : 'Enviar mensagem' }}
        </Button>
        <span v-if="envioOk" class="text-xs text-emerald-600">{{ envioOk }}</span>
        <span v-if="envioErro" class="text-xs text-red-500">{{ envioErro }}</span>
      </div>

      <!-- Inbox 3 colunas -->
      <div class="flex-1 grid grid-cols-[280px_1fr_280px] gap-4 min-h-[420px]">
        <!-- Lista de conversas -->
        <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-y-auto divide-y divide-slate-100">
          <p v-if="threads.length === 0" class="p-4 text-sm text-slate-400 italic">Nenhuma conversa ainda.</p>
          <button
            v-for="t in threads"
            :key="t.telefone"
            class="w-full text-left p-3 hover:bg-slate-50 transition-colors"
            :class="telefoneSelecionado === t.telefone ? 'bg-slate-50 border-l-2 border-primary' : ''"
            @click="telefoneSelecionado = t.telefone"
          >
            <p class="text-sm font-semibold text-slate-800">{{ t.prestadorNome }}</p>
            <p v-if="t.numeroOs" class="text-xs text-slate-400 font-mono">{{ t.numeroOs }}</p>
            <p class="text-xs text-slate-500 truncate mt-0.5">{{ t.ultimaMensagem.texto }}</p>
            <p class="text-xs text-slate-400 mt-0.5">{{ formatarData(t.ultimaMensagem.criadoEm) }}</p>
          </button>
        </div>

        <!-- Thread -->
        <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-y-auto p-4 space-y-3">
          <p v-if="!telefoneSelecionado" class="text-sm text-slate-400 italic">Selecione uma conversa.</p>
          <div
            v-for="m in mensagensDaThread"
            :key="m.id"
            class="max-w-[80%] rounded-lg p-3 text-sm"
            :class="m.direcao === 'enviada' ? 'ml-auto bg-primary/10 text-slate-800' : 'bg-slate-100 text-slate-800'"
          >
            <p class="whitespace-pre-line">{{ m.texto }}</p>
            <p class="text-xs text-slate-400 mt-1">
              {{ formatarData(m.criadoEm) }} · {{ tipoLabel[m.tipo] }} · {{ m.status }}
            </p>
          </div>
        </div>

        <!-- Dados da OS -->
        <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dados da OS</p>
          <template v-if="osDaThread">
            <p class="text-sm font-mono font-semibold text-slate-800">{{ osDaThread.numero }}</p>
            <p class="text-sm text-slate-700">{{ osDaThread.cliente.nome }}</p>
            <p class="text-xs text-slate-500">{{ osDaThread.cliente.endereco.texto }}</p>
            <Badge class="bg-blue-100 text-blue-700 border border-blue-200">{{ osDaThread.etapa }}</Badge>
          </template>
          <p v-else class="text-sm text-slate-400 italic">Sem OS correlacionada.</p>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
