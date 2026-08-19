<script setup lang="ts">
import { ref } from 'vue'
import { useUsuarios } from '@/composables/useUsuarios'
import { useUsuarioAtual } from '@/composables/useUsuarioAtual'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PERFIL_LABEL } from '@/types/governanca'
import type { PerfilUsuario } from '@/types/governanca'

const { usuarios, atualizarPerfil, atualizarAtivo, criarUsuario } = useUsuarios()
const { usuarioAtual } = useUsuarioAtual()

function formatarData(iso: string | undefined): string {
  if (!iso) return 'nunca'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'nunca' : d.toLocaleString('pt-BR')
}

const perfilColor: Record<PerfilUsuario, string> = {
  super_admin: 'bg-violet-100 text-violet-700 border border-violet-200',
  operacao: 'bg-blue-100 text-blue-700 border border-blue-200',
  financeiro: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  leitura: 'bg-slate-100 text-slate-600 border border-slate-200',
}

async function mudarPerfil(uid: string, ev: Event) {
  const perfil = (ev.target as HTMLSelectElement).value as PerfilUsuario
  await atualizarPerfil(uid, perfil)
}

// ─── Novo usuário ────────────────────────────────────────────
const showModal = ref(false)
const form = ref({ nome: '', email: '', perfil: 'leitura' as PerfilUsuario })
const criando = ref(false)
const erroForm = ref('')
const credenciaisGeradas = ref<{ email: string; senhaTemporaria: string } | null>(null)

function abrirModal() {
  form.value = { nome: '', email: '', perfil: 'leitura' }
  erroForm.value = ''
  credenciaisGeradas.value = null
  showModal.value = true
}
function fecharModal() { showModal.value = false }

async function submit() {
  if (!form.value.nome.trim() || !form.value.email.trim()) return
  criando.value = true
  erroForm.value = ''
  try {
    const resultado = await criarUsuario(form.value)
    credenciaisGeradas.value = { email: form.value.email, senhaTemporaria: resultado.senhaTemporaria }
  } catch (err) {
    erroForm.value = err instanceof Error ? err.message : 'Erro ao criar usuário.'
  } finally {
    criando.value = false
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Usuários e Permissões</h2>
          <p class="text-slate-500 text-sm mt-0.5">{{ usuarios.length }} usuário(s) — perfis controlam o que cada um vê na navegação.</p>
        </div>
        <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" @click="abrirModal">+ Novo usuário</Button>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Situação</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Último acesso</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.uid" class="border-b border-slate-100 hover:bg-slate-50/60">
              <td class="px-4 py-3 text-slate-700">{{ u.nome }}<span v-if="u.uid === usuarioAtual?.uid" class="text-xs text-slate-400"> (você)</span></td>
              <td class="px-4 py-3 text-slate-600">{{ u.email }}</td>
              <td class="px-4 py-3">
                <select :value="u.perfil" class="h-8 rounded-md border border-slate-200 px-2 text-xs bg-white" @change="mudarPerfil(u.uid, $event)">
                  <option v-for="(label, p) in PERFIL_LABEL" :key="p" :value="p">{{ label }}</option>
                </select>
              </td>
              <td class="px-4 py-3">
                <Badge :class="u.ativo ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'">{{ u.ativo ? 'Ativo' : 'Inativo' }}</Badge>
              </td>
              <td class="px-4 py-3 text-slate-500">{{ formatarData(u.ultimoAcessoEm) }}</td>
              <td class="px-4 py-3">
                <button class="text-xs text-primary font-semibold hover:underline" @click="atualizarAtivo(u.uid, !u.ativo)">
                  {{ u.ativo ? 'Desativar' : 'Reativar' }}
                </button>
              </td>
            </tr>
            <tr v-if="usuarios.length === 0"><td colspan="6" class="px-4 py-12 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-slate-400">Perfil controla o que aparece no menu (Card 14.1). "Inativo" bloqueia o menu de módulos restritos, mas o login em si continua funcionando — pra bloquear login por completo, desative a conta direto no Firebase Auth.</p>
    </div>

    <!-- Modal novo usuário -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="fecharModal" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <template v-if="!credenciaisGeradas">
          <h3 class="text-lg font-bold text-slate-900">Novo usuário</h3>
          <div class="space-y-1.5">
            <Label>Nome *</Label>
            <Input v-model="form.nome" placeholder="Nome completo" />
          </div>
          <div class="space-y-1.5">
            <Label>E-mail *</Label>
            <Input v-model="form.email" type="email" placeholder="pessoa@guedesloc.com.br" />
          </div>
          <div class="space-y-1.5">
            <Label>Perfil</Label>
            <select v-model="form.perfil" class="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option v-for="(label, p) in PERFIL_LABEL" :key="p" :value="p">{{ label }}</option>
            </select>
          </div>
          <p v-if="erroForm" class="text-xs text-red-500">{{ erroForm }}</p>
          <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" @click="fecharModal">Cancelar</Button>
            <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" :disabled="criando || !form.nome.trim() || !form.email.trim()" @click="submit">
              {{ criando ? 'Criando...' : 'Criar usuário' }}
            </Button>
          </div>
        </template>
        <template v-else>
          <h3 class="text-lg font-bold text-slate-900">Usuário criado</h3>
          <p class="text-sm text-slate-600">Repasse essas credenciais pra pessoa por um canal seguro (WhatsApp, telefone) — a senha só aparece essa vez.</p>
          <div class="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1 font-mono text-sm">
            <p><span class="text-slate-400">E-mail:</span> {{ credenciaisGeradas.email }}</p>
            <p><span class="text-slate-400">Senha temporária:</span> {{ credenciaisGeradas.senhaTemporaria }}</p>
          </div>
          <div class="flex justify-end pt-2 border-t border-slate-100">
            <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold" @click="fecharModal">Fechar</Button>
          </div>
        </template>
      </div>
    </div>
  </DashboardLayout>
</template>
