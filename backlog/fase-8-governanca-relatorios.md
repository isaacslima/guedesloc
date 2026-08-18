# Fase 8 — Governança, Acesso e Relatórios

> **Objetivo:** Fechar os módulos de RBAC, auditoria de negócio e relatórios do produto. Posicionada após o núcleo operacional e financeiro porque hoje o sistema roda com um único perfil de usuário (qualquer autenticado vê tudo) e isso não bloqueia nenhuma das fases anteriores — mas não pode ficar de fora do produto final, e faz mais sentido desenhar permissões quando já se sabe quais telas/módulos existem (Fases 2-7).

---

## Módulos & Epics Inclusos

- **Epic 14 (novo):** Governança, Acesso e Relatórios

---

## Cards da Fase 8

### Card 14.1 — Papéis e permissões (RBAC)
**Status:** Novo — `src/views/LoginView.vue` hoje usa Firebase Auth sem qualquer RBAC.

**Descrição:** Perfis (ex.: Super Admin, Operação, Financeiro, Leitura); tela "Usuários e permissões" com lista de colaboradores (Perfil, Situação, Permissões, Último acesso, ações Editar/Permissões/Acesso).

**Critérios de aceite:**
- RBAC é aditivo: nenhuma tela das Fases 2-7 fica bloqueada até este card existir — decisão consciente pra não travar entregas anteriores esperando este módulo.
- Ao entrar em vigor, usuário sem permissão não vê o módulo correspondente na navegação.

---

### Card 14.2 — "Equipe agora"
**Status:** Novo.

**Descrição:** Indicador de quais colaboradores estão online no momento.

---

### Card 14.3 — Auditoria de ações da equipe (UI de negócio)
**Status:** Novo. **Relaciona-se com o Card 8.3 (Fase 10)**, mas é uma camada diferente: aqui é a UI de negócio, buscável por ação/colaborador/OS/item (ex.: "Login no sistema", mudança de etapa, atribuição de prestador), com timestamps precisos. O Card 8.3 formaliza o log imutável de infraestrutura/LGPD que alimenta esta tela.

**Critérios de aceite:**
- Toda ação relevante das Fases 2-7 (mudança de etapa, atribuição, edição de OS, envio manual de WhatsApp) aparece aqui, buscável.

---

### Card 14.4 — Relatórios: Resumo mensal
**Status:** Não iniciado.

**Descrição:** Totais por empresa/cidade/prestador + métricas de excedente de tempo.

---

### Card 14.5 — Conferência de OS
**Status:** Novo.

**Descrição:** Cola-se uma lista bruta de números de OS + cidade, em qualquer formato; o sistema compara com o que já está registrado e aponta o que falta. É uma ferramenta somente leitura: nada é criado ou alterado.

**Critérios de aceite:**
- Nenhuma ação de escrita disparada por esta tela, em nenhuma circunstância.

---

### Card 14.6 — Arquivo/histórico
**Status:** Não iniciado.

**Descrição:** OS finalizadas/canceladas com motivo e anexos preservados, pesquisável.

---

### Card 14.7 — Configurações gerais
**Status:** Novo.

**Descrição:** Dados da conta, atalho pra Central de Automações (Fase 5), integração de WhatsApp (atalho pro Card 11.6), "Zona de perigo" (apagar OS específica/por período/todas).

**Critérios de aceite:**
- Zona de perigo nunca afeta prestadores, usuários, permissões ou auditoria — só OS.
- Ação de apagar exige confirmação explícita com resumo do impacto (quantidade de OS afetadas) antes de executar.
