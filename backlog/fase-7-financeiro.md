# Fase 7 — Financeiro

> **Objetivo:** Implementar os módulos de Gestão de Recebíveis (faturamento junto às seguradoras) e Gestão de Pagamentos a Prestadores/Terceirizados. Reposicionada para depois do núcleo operacional (Fases 2-6: modelo unificado de OS, prestadores com cobertura, WhatsApp, kanban/automações e visões de entrega/retirada/pendência) — preços, conciliação e repasse fazem mais sentido, com menos retrabalho de dado, quando já existe volume real de OS fluindo pelo pipeline unificado. Nenhum código deste módulo existe hoje no repositório.

---

## Módulos & Epics Inclusos

- **Epic 5:** Gestão de Recebíveis (Valores a receber das seguradoras)
- **Epic 6 (Parcial):** Gestão de Pagamentos a Prestadores/Terceirizados (Regras, Lotes e Histórico)

---

## Cards da Fase 2

### Card 5.1 — Tabela de preços por seguradora/serviço
**Descrição:** Cadastro de valores acordados por tipo de serviço (remoção via caçamba, guincho, etc.) e por seguradora, incluindo histórico de reajustes.

**Critérios de aceite:**
- É possível cadastrar valor vigente e data de vigência por seguradora/tipo de serviço.
- Alterações preservam histórico (não sobrescrevem registros antigos).

---

### Card 5.2 — Conciliação automática de recebíveis
**Descrição:** Comparar o valor esperado (tabela de preços x OS finalizada) com o valor efetivamente pago/reportado pela seguradora, sinalizando divergências.

**Critérios de aceite:**
- Toda OS finalizada gera um lançamento "a receber".
- Sistema compara valor lançado com valor confirmado e marca como conciliado, divergente ou pendente.
- Divergências geram alerta para análise manual.

---

### Card 5.3 — Dashboard de recebíveis
**Descrição:** Visão consolidada de valores em aberto, vencidos e pagos, filtrável por seguradora e período.

**Critérios de aceite:**
- Filtros por seguradora, status e intervalo de datas.
- Totalizadores por seguradora e geral.
- Exportação para CSV/Excel.

---

### Card 5.4 — Relatórios financeiros de recebíveis
**Descrição:** Relatórios periódicos (mensais) de faturamento por seguradora para conferência e envio ao financeiro do cliente.

**Critérios de aceite:**
- Relatório gerado sob demanda ou agendado.
- Contempla total faturado, recebido, pendente e divergente por seguradora.

---

### Card 6.1 — Regras de repasse por prestador
**Descrição:** Definir como cada prestador é remunerado (valor fixo por OS, percentual, tabela específica).

**Critérios de aceite:**
- Cadastro de regra de repasse vinculado ao prestador.
- Sistema calcula automaticamente o valor devido ao finalizar uma OS.

---

### Card 6.2 — Geração de lote de pagamento
**Descrição:** Consolidar, por período, todos os valores devidos a cada prestador para gerar um lote de pagamento.

**Critérios de aceite:**
- Geração de lote por período (ex: quinzenal/mensal) agrupando OS finalizadas e aprovadas.
- Lote exportável em formato aceito pelo banco (CNAB, se aplicável) ou relatório para pagamento manual.

---

### Card 6.4 — Histórico e comprovantes de pagamento
**Descrição:** Manter histórico consultável de todos os pagamentos feitos a cada prestador, com comprovante anexado.

**Critérios de aceite:**
- Prestador (ou admin) consegue visualizar histórico de pagamentos recebidos.
- Comprovante de pagamento anexável/vinculável a cada lote.
