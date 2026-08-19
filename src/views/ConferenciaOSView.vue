<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdens } from '@/composables/useOrdens'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const { ordens } = useOrdens()

// Ferramenta somente leitura (Card 14.5) — nenhuma ação de escrita em
// nenhuma circunstância, mesmo por engano: não existe um único import de
// addDoc/updateDoc/deleteDoc neste arquivo.

const textoColado = ref('')
const conferido = ref(false)

interface LinhaConferencia {
  numeroDigitado: string
  cidadeDigitada?: string
  encontrada: boolean
  osNumero?: string
  osCidade?: string
}

function normalizar(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

const resultado = computed<LinhaConferencia[]>(() => {
  if (!conferido.value) return []
  const linhasBrutas = textoColado.value.split('\n').map((l) => l.trim()).filter(Boolean)

  return linhasBrutas.map((linha) => {
    const partes = linha.split(/[;,\t]|\s{2,}/).map((p) => p.trim()).filter(Boolean)
    const numeroDigitado = partes[0] ?? linha.trim()
    const cidadeDigitada = partes[1]

    const alvo = normalizar(numeroDigitado)
    const encontrada = ordens.value.find((o) => normalizar(o.numero) === alvo || normalizar(o.numeroOsSeguradora ?? '') === alvo)

    return {
      numeroDigitado,
      cidadeDigitada,
      encontrada: Boolean(encontrada),
      osNumero: encontrada?.numero,
      osCidade: encontrada?.cliente.endereco.cidade,
    }
  })
})

const faltando = computed(() => resultado.value.filter((r) => !r.encontrada))
const encontradas = computed(() => resultado.value.filter((r) => r.encontrada))

function conferir() {
  conferido.value = true
}
function limpar() {
  textoColado.value = ''
  conferido.value = false
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Conferência de OS</h2>
        <p class="text-slate-500 text-sm mt-0.5">Cole uma lista de números de OS (uma por linha, cidade opcional depois de vírgula/tab) e confira o que já está registrado. Só leitura — nada aqui cria, edita ou apaga nada.</p>
      </div>

      <div class="space-y-2">
        <textarea
          v-model="textoColado"
          rows="8"
          placeholder="Ex.:
542.71898731/1, Goiânia
602.71898576/1; Aparecida de Goiânia
2.71898401/1"
          class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
        />
        <div class="flex items-center gap-2">
          <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="!textoColado.trim()" @click="conferir">Conferir</Button>
          <Button variant="outline" @click="limpar">Limpar</Button>
        </div>
      </div>

      <div v-if="conferido" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 max-w-md">
          <div class="rounded-lg border border-slate-200 bg-white p-3">
            <p class="text-2xl font-black text-emerald-600">{{ encontradas.length }}</p>
            <p class="text-xs text-slate-500">Já registradas</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-white p-3">
            <p class="text-2xl font-black text-red-600">{{ faltando.length }}</p>
            <p class="text-xs text-slate-500">Faltando</p>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número digitado</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cidade digitada</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Situação</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cidade no cadastro</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in resultado" :key="i" class="border-b border-slate-100" :class="!r.encontrada ? 'bg-red-50/40' : ''">
                <td class="px-4 py-3 font-mono font-semibold text-slate-800">{{ r.numeroDigitado }}</td>
                <td class="px-4 py-3 text-slate-500">{{ r.cidadeDigitada || '—' }}</td>
                <td class="px-4 py-3">
                  <Badge :class="r.encontrada ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'">
                    {{ r.encontrada ? 'Encontrada' : 'Faltando' }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-slate-500">{{ r.osCidade || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
