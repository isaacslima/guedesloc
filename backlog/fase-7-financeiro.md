# Fase 7 — Financeiro

> **Objetivo:** Implementar os módulos de Gestão de Recebíveis (faturamento junto às seguradoras) e Gestão de Pagamentos a Prestadores/Terceirizados. Reposicionada para depois do núcleo operacional (Fases 2-6: modelo unificado de OS, prestadores com cobertura, WhatsApp, kanban/automações e visões de entrega/retirada/pendência) — preços, conciliação e repasse fazem mais sentido, com menos retrabalho de dado, quando já existe volume real de OS fluindo pelo pipeline unificado.

---

## Módulos & Epics Inclusos

- **Epic 5:** Gestão de Recebíveis (Valores a receber das seguradoras)
- **Epic 6 (Parcial):** Gestão de Pagamentos a Prestadores/Terceirizados (Regras, Lotes e Histórico)

---

## Cards da Fase 7

### Card 5.1 — Tabela de preços por seguradora/serviço
**Status:** ✅ Concluído — `src/views/PrecosView.vue`, rota `/precos`, composable `src/composables/usePrecos.ts`, coleção `precos_servico`. Cadastro de valor vigente por seguradora (lista vem de `integradoras`, mesma fonte usada em OS) + tipo de serviço (texto livre). Testado ao vivo: cadastro de um novo preço; "Reajustar" sobre o mesmo par seguradora+serviço fechou a vigência anterior (`vigenciaFim` gravado) e abriu uma nova, sem apagar nada — confirmado no histórico expansível da tela.

**Descrição:** Cadastro de valores acordados por tipo de serviço (remoção via caçamba, guincho, etc.) e por seguradora, incluindo histórico de reajustes.

**Critérios de aceite:**
- É possível cadastrar valor vigente e data de vigência por seguradora/tipo de serviço.
- Alterações preservam histórico (não sobrescrevem registros antigos).

---

### Card 5.2 — Conciliação automática de recebíveis
**Status:** ✅ Concluído — `src/composables/useRecebiveis.ts`, coleção `recebiveis`. Todo OS finalizada gera um lançamento (geração idempotente por `osId`, disparada pelo botão "Gerar lançamentos pendentes" na tela de Recebíveis — cobre qualquer caminho de finalização: Kanban manual, confirmação de retirada da Fase 6). `valorEsperado` vem do preço vigente (Card 5.1) na data da finalização. Conciliação testada ao vivo: valor confirmado igual ao esperado → `conciliado`; valor diferente → `divergente`, com observação livre pra análise.

**Descrição:** Comparar o valor esperado (tabela de preços x OS finalizada) com o valor efetivamente pago/reportado pela seguradora, sinalizando divergências.

**Critérios de aceite:**
- Toda OS finalizada gera um lançamento "a receber".
- Sistema compara valor lançado com valor confirmado e marca como conciliado, divergente ou pendente.
- Divergências geram alerta para análise manual.
**Nota sobre "automática":** a comparação em si é automática (o sistema calcula e classifica sozinho); a entrada do "valor efetivamente pago" ainda é manual — não existe hoje nenhuma integração que traga esse dado direto da seguradora (isso seria uma integração de Epic 2, não modelada nesta fase).

---

### Card 5.3 — Dashboard de recebíveis
**Status:** ✅ Concluído — mesma tela `/recebiveis`. Filtros por seguradora, status e período (de/até); totalizadores (total faturado, recebido/conciliado, pendente, quantidade de divergentes) recalculados sobre o recorte filtrado; exportação CSV. Testado ao vivo com 3 OS de teste — totalizadores bateram exatamente com o esperado em cada cenário (conciliado, divergente, pendente).

**Descrição:** Visão consolidada de valores em aberto, vencidos e pagos, filtrável por seguradora e período.

**Critérios de aceite:**
- Filtros por seguradora, status e intervalo de datas.
- Totalizadores por seguradora e geral.
- Exportação para CSV/Excel.

---

### Card 5.4 — Relatórios financeiros de recebíveis
**Status:** ⚠️ Parcial — botão "Relatório por seguradora" na mesma tela `/recebiveis` exporta um CSV agregado (qtd. OS, total faturado, total recebido, total pendente, qtd. divergentes) por seguradora, respeitando os filtros de período ativos — cobre a geração "sob demanda". Testado ao vivo, exportação sem erro.
**Bloqueado — geração agendada (envio automático mensal):** exige infraestrutura de scheduler (o mesmo gap de infra do Card 12.8/9.10 na Fase 5 — nada como Cloud Scheduler/Cloud Tasks provisionado ainda). Próximo passo: quando essa infra for decidida (provavelmente junto com a fila real de automações), acoplar um job periódico que roda a mesma agregação e envia por e-mail/WhatsApp pro financeiro do cliente.

**Descrição:** Relatórios periódicos (mensais) de faturamento por seguradora para conferência e envio ao financeiro do cliente.

**Critérios de aceite:**
- Relatório gerado sob demanda ou agendado.
- Contempla total faturado, recebido, pendente e divergente por seguradora.

---

### Card 6.1 — Regras de repasse por prestador
**Status:** ✅ Concluído — seção "Regra de repasse" no formulário de `PrestadoresView.vue` (Valor fixo por OS ou Percentual do valor da OS). Cálculo automático testado ao vivo: prestador com regra percentual (70%) sobre uma OS de R$650 gerou repasse de R$455; prestador com regra de valor fixo (R$150) gerou repasse de R$150 independente do valor da OS; prestador sem regra cadastrada gerou repasse com `status: 'sem_regra'` e valor zero, sinalizado na tela em vez de sumir silenciosamente.

**Descrição:** Definir como cada prestador é remunerado (valor fixo por OS, percentual, tabela específica).

**Critérios de aceite:**
- Cadastro de regra de repasse vinculado ao prestador.
- Sistema calcula automaticamente o valor devido ao finalizar uma OS.
**Não implementado:** "tabela específica" (uma terceira modalidade além de fixo/percentual, ex.: tabela por tipo de serviço) — as duas modalidades cobertas (fixo e percentual) atendem o cenário real hoje (uma seguradora, um tipo de serviço); ampliar pra tabela específica é direto se surgir a necessidade.

---

### Card 6.2 — Geração de lote de pagamento
**Status:** ✅ Concluído (via relatório pra pagamento manual — ver bloqueio de CNAB abaixo) — `src/views/RepassesView.vue`, rota `/repasses`, composables `useRepasses.ts` + `useLotesPagamento.ts`, coleções `repasses` + `lotes_pagamento`. Fluxo: selecionar prestador → repasses pendentes dele aparecem com checkbox → "Gerar lote" cria o lote e marca os repasses selecionados como `em_lote`. Testado ao vivo de ponta a ponta: lote gerado com 1 OS/R$455, exportação CSV do lote sem erro.
**Bloqueado — exportação em formato bancário (CNAB):** critério permite explicitamente "relatório para pagamento manual" como alternativa, que é o que foi entregue (CSV com número da OS, valor e data). CNAB (240/400) exige decidir qual banco/formato a Guedesloc usa pra pagamento em lote — nenhuma credencial ou definição de banco configurada no projeto ainda. Próximo passo: quando o banco for definido, adicionar um segundo formato de exportação (CNAB) ao lado do CSV já existente, sem quebrar o fluxo manual atual.

**Descrição:** Consolidar, por período, todos os valores devidos a cada prestador para gerar um lote de pagamento.

**Critérios de aceite:**
- Geração de lote por período (ex: quinzenal/mensal) agrupando OS finalizadas e aprovadas.
- Lote exportável em formato aceito pelo banco (CNAB, se aplicável) ou relatório para pagamento manual.

---

### Card 6.4 — Histórico e comprovantes de pagamento
**Status:** ✅ Concluído — aba "Lotes e histórico" da mesma tela `/repasses`: lista todos os lotes (gerado/pago), botão "Marcar como pago" (grava data de pagamento e marca os repasses do lote como `pago`) com campo de link do comprovante. Testado ao vivo: lote marcado como pago com link de comprovante, status mudou pra "Pago", link "Ver comprovante" apareceu na tabela, repasses do lote confirmados como `pago` no banco.

**Descrição:** Manter histórico consultável de todos os pagamentos feitos a cada prestador, com comprovante anexado.

**Critérios de aceite:**
- Prestador (ou admin) consegue visualizar histórico de pagamentos recebidos.
- Comprovante de pagamento anexável/vinculável a cada lote.
**Decisão de implementação — "anexável" via link, não upload de arquivo:** o comprovante é um link colado (Drive, banco etc.), não um upload direto pro Firebase Storage. Mais simples e sem exigir habilitar/testar um serviço de storage novo pra esta fase; se fizer falta upload de arquivo de verdade, é um passo isolado (Storage já tem o bucket configurado no projeto, só falta habilitar o produto no console Firebase e escrever as regras de acesso).
**Visão do prestador:** hoje só o time interno (autenticado no dashboard) vê o histórico — não existe uma tela separada pro prestador consultar os próprios pagamentos (exigiria login de prestador, fora do escopo desta fase).

---

## Como testar

### Tabela de Preços (Card 5.1)
1. Abra **Tabela de Preços** no menu lateral (`/precos`).
2. Clique **"+ Novo preço / reajuste"**, escolha uma seguradora (cadastrada em Integrações), um tipo de serviço e um valor. Salve.
3. Clique **"Reajustar"** no preço recém-criado, mude o valor e salve — confira que o valor vigente na tabela mudou e que "Ver histórico de reajustes" mostra o valor anterior com a vigência fechada.

### Recebíveis (Cards 5.2/5.3/5.4)
1. Abra **Recebíveis** (`/recebiveis`) — a tela já sincroniza sozinha ao abrir; se quiser forçar de novo, clique **"Gerar lançamentos pendentes"** (só gera o que ainda não existe, pode clicar quantas vezes quiser).
2. Toda OS com etapa "Finalizada" (fluxo da Fase 6) aparece aqui com o valor esperado, calculado pela Tabela de Preços vigente na data da finalização.
3. Clique **"Registrar valor confirmado"** numa OS, digite o valor que a seguradora de fato pagou/reportou. Se bater com o esperado, o status vira "Conciliado"; se for diferente, vira "Divergente".
4. Use os filtros (seguradora, status, período) e confira que os totalizadores no topo mudam junto.
5. Clique **"Exportar CSV"** ou **"Relatório por seguradora"** pra baixar os dados.

### Repasses a Prestadores (Cards 6.1/6.2/6.4)
1. Em **Prestadores**, edite um prestador e defina a "Regra de repasse" (valor fixo em R$ ou percentual sobre o valor da OS).
2. Abra **Repasses** (`/repasses`) — sincroniza sozinha ao abrir, ou clique **"Gerar repasses pendentes"**. Toda OS finalizada com prestador atribuído gera um repasse, calculado pela regra cadastrada (sem regra, aparece sinalizado "Sem regra cadastrada").
3. Na aba **"Gerar lote"**, escolha o prestador, selecione os repasses pendentes dele (ou "Selecionar todos pendentes") e clique **"Gerar lote"**.
4. Na aba **"Lotes e histórico"**, veja o lote criado, exporte o CSV do lote, e clique **"Marcar como pago"** — cole opcionalmente um link de comprovante e confirme. O lote e todos os repasses dele passam pra "Pago".
