<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  error.value = ''
  isLoading.value = true
  
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/')
  } catch (err: any) {
    if (err.code === 'auth/invalid-credential') {
      error.value = 'E-mail ou senha inválidos.'
    } else {
      error.value = 'Erro ao fazer login. Verifique suas credenciais.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <Card class="w-full max-w-md shadow-lg border-slate-200">
      <CardHeader class="space-y-2 text-center pb-8">
        <h1 class="text-3xl font-black text-primary tracking-widest uppercase mx-auto mb-2">Guedesloc</h1>
        <CardTitle class="text-2xl font-bold text-slate-900">Bem-vindo de volta</CardTitle>
        <CardDescription class="text-slate-500">
          Insira suas credenciais para acessar o sistema.
        </CardDescription>
      </CardHeader>
      
      <form @submit.prevent="handleLogin">
        <CardContent class="space-y-4">
          <div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
            {{ error }}
          </div>
          
          <div class="space-y-2">
            <Label for="email" class="text-slate-700 font-semibold">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              v-model="email" 
              placeholder="seu@email.com" 
              required
              class="border-slate-300 focus-visible:ring-primary"
            />
          </div>
          
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="password" class="text-slate-700 font-semibold">Senha</Label>
            </div>
            <Input 
              id="password" 
              type="password" 
              v-model="password" 
              placeholder="••••••••" 
              required
              class="border-slate-300 focus-visible:ring-primary"
            />
          </div>
        </CardContent>
        
        <CardFooter class="pt-6">
          <Button 
            type="submit" 
            class="w-full bg-primary text-slate-900 hover:bg-primary/90 font-bold" 
            :disabled="isLoading"
          >
            <span v-if="isLoading">Entrando...</span>
            <span v-else>Entrar</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  </div>
</template>
