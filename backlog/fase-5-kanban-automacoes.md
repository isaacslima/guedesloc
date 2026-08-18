# Fase 5 — Kanban Operacional Completo & Central de Automações

> **Objetivo:** Com modelo unificado (Fase 2), cobertura/distribuição manual (Fase 3) e WhatsApp bidirecional (Fase 4) prontos, entregar a tela central do produto — o Kanban de 10 etapas — e a Central de Automações, que passa a operar boa parte da distribuição e das cobranças de confirmação/foto/retirada sozinha.

---

## Módulos & Epics Inclusos

- **Epic 9 (Parte 2):** Kanban Operacional Completo
- **Epic 12 (novo):** Central de Automações

---

## Cards da Fase 5

### Card 9.7 — Kanban de 10 etapas
**Status:** Novo.

**Descrição:** Colunas: Aguardando distribuição → Distribuindo/Aguardando resposta → Confirmada/Aguardando dia → Confirmação de hoje → Aguardando entrega → Entregue/Aguardando foto → Entregue/Aguardando retirada → Finalizada, com ramificações pra Pendência e Cancelada. Cada card mostra nº OS, badge URGENTE, cidade/UF + seguradora, data, prestador, indicador "sem automação programada"/"sem resposta há Xh", botões "Conversa" (abre a thread do Card 11.5) / "Pausar", e select "Mover para..." — mudança manual de etapa exige motivo obrigatório, registrado em `historico[]` (Card 9.1).

**Critérios de aceite:**
- Paleta semântica de status atual (âmbar/azul/esmeralda/vermelho) estendida pras 10 etapas, sem introduzir paleta nova (Card 0).
- Mudança manual de etapa sem motivo preenchido é bloqueada.

---

### Card 9.8 — Modos de visualização Lista e Agenda
**Status:** Novo.

**Descrição:** Mesma base de dados do kanban, duas visões alternativas: lista tabular (reaproveita `src/components/ui/table`) e agenda por data (agendamento/entrega/retirada).

**Critérios de aceite:**
- Trocar de modo não perde os filtros ativos.

---

### Card 9.9 — Filtros rápidos e indicadores "Precisa de atenção"
**Status:** Novo.

**Descrição:** Filtros rápidos (Minha atenção, Hoje, Amanhã, Próximos 2 dias); indicadores Sem prestador / Entregas de hoje / Pendências / Retirada vencendo; filtros avançados (Foto pendente, Excedente pendente, Aguardando retirada, Automação pausada).

**Critérios de aceite:**
- Cada indicador de "Precisa de atenção" navega direto pra lista filtrada correspondente.

---

### Card 9.10 — Exportar OS e Backup
**Status:** Novo.

**Descrição:** Exportação de OS filtradas (CSV/planilha) e rotina de backup dos dados operacionais.

**Critérios de aceite:**
- Exportação respeita os filtros ativos no momento da ação.

---

### Card 12.1 — Motor de regras de automação (fundação)
**Status:** Novo.

**Descrição:** Estrutura de configuração por tipo de automação: Modo (Desligada/Teste/Produção) e Nível de autonomia (Manual — nunca executa sozinha, apenas sugere / Automática — executa sozinha), mais um switch geral "Pausar todas as automações".

**Critérios de aceite:**
- Modo Teste nunca dispara ação real ao prestador — só registra o que faria.
- Switch geral pausa todas as automações imediatamente, independente da configuração individual de cada uma.

---

### Card 12.2 — Automação: Distribuição automática
**Status:** Novo. **Depende de:** Card 10.2 (cascata de cobertura), Card 11.4 (interpretação de resposta).

**Descrição:** Oferece a OS ao prestador de maior prioridade na cascata da cidade, com tempo de resposta configurável (min), tempo extra pra "preciso confirmar" (min), máximo de tentativas por OS, e checkboxes: encerrar após aceite, mandar pra Pendências se todos recusarem, distribuir só pra prestadores Ativos, ignorar Pausados/Bloqueados/cobertura inativa.

**Critérios de aceite:**
- Respeita rigorosamente a ordem de prioridade cadastrada (Card 10.2).
- Nunca oferece a mesma OS a dois prestadores simultaneamente.

---

### Card 12.3 — Automação: Confirmação do dia
**Status:** Novo.

**Descrição:** Horário padrão de envio (permitindo horário específico por OS); não envia se a OS estiver cancelada, com pendência bloqueada, ou já com entrega confirmada.

---

### Card 12.4 — Automação: Confirmação de entrega
**Status:** Novo.

**Descrição:** Regra de horário de disparo (ex.: próximo ao final da janela agendada), tempo antes de cobrar de novo, máximo de cobranças automáticas.

---

### Card 12.5 — Automação: Foto da entrega
**Status:** Novo.

**Descrição:** Tempo após confirmação de entrega pra cobrar foto, máximo de cobranças; encerra a cobrança quando uma foto chega (validação de que a foto é de fato válida continua sendo curadoria humana nesta fase).

---

### Card 12.6 — Automação: Retirada
**Status:** Novo.

**Descrição:** Dias após a entrega pra 1ª cobrança, tempo entre cobranças, máximo de cobranças, prazo específico configurável por OS (liga com o SLA legal detalhado na Fase 6).

---

### Card 12.7 — Horário permitido para mensagens automáticas
**Status:** Novo.

**Descrição:** Janela global (ex.: 08h-18h) com exceção pra OS de janela noturna. Nenhuma automação dispara fora da janela — mensagens ficam enfileiradas até o próximo horário permitido.

---

### Card 12.8 — Fila "Automações pendentes"
**Status:** Novo.

**Descrição:** Lista de ações agendadas ainda não executadas (OS, cidade, prestador, tipo, data/hora prevista, situação), com cancelamento manual.
