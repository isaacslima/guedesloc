<script setup lang="ts">
// DashboardLayout.vue
</script>

<template>
  <div class="flex h-screen w-full bg-background overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-slate-50 flex flex-col shrink-0">
      <div class="p-6 border-b border-slate-800">
        <h1 class="text-2xl font-black text-primary tracking-widest uppercase">Guedesloc</h1>
        <p class="text-xs text-slate-400 mt-1">Locações e Serviços</p>
      </div>
      <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <a href="#" class="block px-4 py-2 rounded-md bg-slate-800 text-primary font-medium">Dashboard</a>
        <a href="#" class="block px-4 py-2 rounded-md hover:bg-slate-800/50 text-slate-300 transition-colors">Ordens de Serviço</a>
        <a href="#" class="block px-4 py-2 rounded-md hover:bg-slate-800/50 text-slate-300 transition-colors">Equipamentos</a>
        <a href="#" class="block px-4 py-2 rounded-md hover:bg-slate-800/50 text-slate-300 transition-colors">Clientes</a>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto bg-slate-50 p-8">
      <slot />
    </main>
  </div>
</template>
