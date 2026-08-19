<script setup lang="ts">
import { RouterView } from 'vue-router'
import { iniciarHeartbeatPresenca } from '@/composables/usePresenca'

// "Equipe agora" (backlog Fase 8, Card 14.2) — inicia uma vez pra vida toda
// do app, não a cada troca de rota (App.vue é o único componente que
// persiste através da navegação).
iniciarHeartbeatPresenca()
</script>

<template>
  <RouterView />
</template>
