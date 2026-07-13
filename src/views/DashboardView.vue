<script setup lang="ts">
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = getAuth()

const handleLogout = async () => {
  await signOut(auth)
  router.push('/login')
}
</script>

<template>
  <DashboardLayout>
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-slate-900">Painel de Controle</h2>
          <p class="text-slate-500 mt-1">Bem-vindo ao sistema de gestão Guedesloc.</p>
        </div>
        <div class="flex items-center gap-4">
          <Button variant="outline" @click="handleLogout" class="border-slate-300 text-slate-600">Sair</Button>
          <Button class="bg-primary text-slate-900 hover:bg-primary/90 font-bold shadow-sm">
            Criar Nova OS
          </Button>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Mock do Card de OS -->
        <Card class="border-slate-200 shadow-sm">
          <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2">
            <div class="space-y-1">
              <CardTitle class="text-xl font-bold text-slate-900">OS #2026-089</CardTitle>
              <CardDescription class="text-slate-500">Manutenção Corretiva - Gerador 50kVA</CardDescription>
            </div>
            <Badge class="bg-primary text-slate-900 font-bold px-3 py-1 hover:bg-primary/90 uppercase tracking-wide">
              Nova OS
            </Badge>
          </CardHeader>
          <CardContent class="mt-4 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label class="text-xs text-slate-500 uppercase tracking-wider font-semibold">Cliente</Label>
                <div class="font-medium text-slate-900">Indústrias Metálicas S.A.</div>
              </div>
              <div class="space-y-1">
                <Label class="text-xs text-slate-500 uppercase tracking-wider font-semibold">Data</Label>
                <div class="font-medium text-slate-900">15 Jul 2026</div>
              </div>
            </div>
          </CardContent>
          <CardFooter class="flex justify-end gap-3 mt-2 border-t pt-4 border-slate-100">
            <Button variant="outline" class="text-slate-600 border-slate-300">
              Detalhes
            </Button>
            <Button class="bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Enviar WhatsApp
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  </DashboardLayout>
</template>
