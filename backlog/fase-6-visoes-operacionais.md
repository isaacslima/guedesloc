# Fase 6 — Visões Operacionais Especializadas

> **Objetivo:** Entregar Entregas, Retiradas e Pendências como recortes do mesmo pipeline unificado (Fase 2) e das mesmas datas reais capturadas pela Central de Automações (Fase 5) — nenhuma dessas telas introduz dado novo, só visões filtradas.

---

## Módulos & Epics Inclusos

- **Epic 13 (novo):** Visões Operacionais Especializadas

---

## Cards da Fase 6

### Card 13.1 — Entregas
**Status:** ✅ Concluído — `src/views/EntregasView.vue`, rota `/entregas`. Abas Agendadas / Entregas de hoje / Entregues, recorte direto de `useOrdens()` (mesma fonte do Kanban). Testado ao vivo: OS de teste em `aguardando_entrega` apareceu em Agendadas e Entregas de hoje; botão "Confirmar entrega agora" moveu pra `entregue_aguardando_foto`, gravou `datas.entregaReal` e a OS passou a aparecer em Entregues.
**Gap pré-existente resolvido nesta fase:** até aqui, nada no sistema de fato gravava `datas.entregaReal` — o campo existia no modelo (Card 9.1) mas nenhuma tela ou automação escrevia nele (a automação de confirmação de entrega, Card 12.4, só cobra por WhatsApp, não confirma sozinha — confirmação de entrega real depende de alguém confirmar, seja o prestador por foto/resposta ainda não interpretada automaticamente, seja a equipe manualmente). O botão "Confirmar entrega agora" desta tela é a primeira gravação real desse campo — cumpre o critério de aceite (nunca inferida, sempre por confirmação explícita).

---

### Card 13.2 — Retiradas
**Status:** ✅ Concluído — `src/views/RetiradasView.vue`, rota `/retiradas`. Abas Atrasadas / Vence hoje / No prazo / Retiradas hoje. SLA calculado em `src/lib/slaRetirada.ts::calcularSlaRetirada()` a partir de `datas.entregaReal` (nunca a data agendada). Prazo padrão global editável em tela (`configuracoes/operacional`, `useConfiguracoesOperacionais.ts`, default 5 dias) e exceção por OS (`slaRetiradaDiasOverride`) editável direto na tabela. Testado ao vivo: OS com entrega há 6 dias apareceu em Atrasadas (SLA padrão 5d); ao aplicar exceção de 10 dias, moveu automaticamente pra No prazo; botão "Confirmar retirada agora" finalizou a OS e ela apareceu em Retiradas hoje.
**Bônus desta fase:** o indicador "Retirada vencendo" do Kanban (Card 9.9, Fase 5) usava uma aproximação fixa de 5 dias, documentada como pendência — agora usa o mesmo `calcularSlaRetirada()` desta tela, validado ao vivo (indicador bateu com a contagem real de OS atrasadas/vencendo).
**Pendência:** "regra de permanência legal por município" (SLA variável por cidade/seguradora, não só um número global) não implementada — hoje o prazo é um único valor global + exceção manual por OS, sem tabela de regras por município.

---

### Card 13.3 — Pendências
**Status:** ✅ Concluído — `src/views/PendenciasView.vue`, rota `/pendencias`. Abas Pendências (`etapa === 'pendencia'`) / Excedentes (mesmo `calcularSlaRetirada()` do Card 13.2, situação "atrasada") / Canceladas (`etapa === 'cancelada'`) / Com motivo registrado (todo `historico[]` de toda OS com `motivo` preenchido, achatado num log único ordenado por data). Testado ao vivo: OS movida manualmente pra Pendência/Cancelada apareceu nas respectivas abas sem nenhum cadastro extra; aba "Com motivo registrado" mostrou a transição completa (etapa anterior → nova + motivo) de cada ação, incluindo as automáticas do motor de automações (Fase 5).
**Definição de "Excedentes":** interpretado como OS que já passaram do prazo de retirada (mesmo cálculo do Card 13.2) — a métrica financeira de cobrança por excedente de tempo (mencionada na Fase 8) ainda não existe; esta aba é só a visão operacional de "quais OS estão gerando excedente agora", não o cálculo de valor a cobrar.

---

## Como testar

1. Abra **Entregas** no menu lateral (`/entregas`) — confira as abas Agendadas / Entregas de hoje / Entregues. Numa OS da aba Agendadas, clique **"Confirmar entrega agora"** e veja ela sumir dali e aparecer em Entregues.
2. Abra **Retiradas** (`/retiradas`) — veja as abas Atrasadas / Vence hoje / No prazo / Retiradas hoje (só aparecem aqui OS já confirmadas como entregues, aguardando volta da caçamba).
3. No topo, clique **"Editar prazo padrão"** pra mudar o prazo global de retirada (em dias) e salve.
4. Numa OS da lista, clique no valor do **"Prazo"** (ex.: "5 dias") pra abrir a edição rápida — digite um número diferente e confirme com ✓. A OS pode mudar de aba na hora, se isso alterar a situação dela (atrasada → no prazo, por exemplo).
5. Clique **"Confirmar retirada agora"** numa OS — ela finaliza e passa a aparecer em "Retiradas hoje".
6. Abra **Pendências** (`/pendencias`) — veja as abas Pendências, Excedentes (retiradas atrasadas), Canceladas e "Com motivo registrado" (o histórico completo de tudo que já mudou de etapa com um motivo anotado, manual ou automático).
7. Volte pra **Central de OS** (`/kanban`) e confira que o indicador "Retirada vencendo" no topo bate com a soma de Atrasadas + Vence hoje da tela de Retiradas — é o mesmo cálculo.
