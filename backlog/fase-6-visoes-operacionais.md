# Fase 6 — Visões Operacionais Especializadas

> **Objetivo:** Entregar Entregas, Retiradas e Pendências como recortes do mesmo pipeline unificado (Fase 2) e das mesmas datas reais capturadas pela Central de Automações (Fase 5) — nenhuma dessas telas introduz dado novo, só visões filtradas.

---

## Módulos & Epics Inclusos

- **Epic 13 (novo):** Visões Operacionais Especializadas

---

## Cards da Fase 6

### Card 13.1 — Entregas
**Status:** Novo.

**Descrição:** Abas Agendadas / Entregas de hoje / Entregues, exibindo a data e hora REAL da entrega (campo distinto da data agendada, já modelado no Card 9.1).

**Critérios de aceite:**
- Data/hora real de entrega só é gravada por confirmação (manual ou automática via Card 12.4), nunca inferida.

---

### Card 13.2 — Retiradas
**Status:** Novo.

**Descrição:** Abas Atrasadas / Vence hoje / No prazo / Retiradas hoje, com SLA de prazo de retirada configurável — regra de permanência legal por município (referenciada no template do Card 11.3 e na regra do Card 12.6).

**Critérios de aceite:**
- Prazo padrão configurável globalmente, com exceção por OS quando necessário.
- Contagem de atraso usa a data de entrega real (Card 13.1), não a agendada.

---

### Card 13.3 — Pendências
**Status:** Novo.

**Descrição:** Abas Pendências / Excedentes / Canceladas / Com motivo registrado, reaproveitando o `historico[]` com motivo obrigatório (Card 9.7) — nenhuma OS é perdida, todo desvio operacional fica rastreável.

**Critérios de aceite:**
- Toda OS movida manualmente pra Pendência ou Cancelada (Card 9.7) aparece aqui automaticamente, sem cadastro duplicado.
