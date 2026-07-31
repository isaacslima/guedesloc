# Fase 1 — Piloto

> **Objetivo:** Escolher 1 seguradora com API mais simples e 1 seguradora sem API (RPA), para validar os dois fluxos de ponta a ponta na arquitetura criada na Fase 0, incluindo logs e alertas estruturados.

---

## Módulos & Epics Inclusos

- **Epic 2 (Parcial):** 2 Integrações piloto (1 API + 1 RPA)
- **Epic 4 (Parcial):** Infraestrutura base de RPA & agendamento
- **Epic 8 (Parcial):** Logging centralizado e alertas essenciais

---

## Cards da Fase 1

### Card 2.0 (Spike 1 - Piloto API) — Descoberta Técnica: Seguradora API
**Descrição:** Levantar com a seguradora com API mais simples (ex: Tempo Assist ou Porto Seguro) tipo de autenticação, documentação, ambiente de homologação e endpoints.

**Critérios de aceite:**
- Documento de descoberta preenchido: API (REST/SOAP), autenticação, rate limit, ambiente de testes, contato técnico.
- Decisão confirmada: validação de viabilidade da API.

---

### Card 2.0 (Spike 2 - Piloto RPA) — Descoberta Técnica: Seguradora sem API
**Descrição:** Levantar com a seguradora sem API escolhida para o piloto (ex: Europ Assistance / Redion) o portal web, fluxo de login, formulários e comportamento do sistema.

**Critérios de aceite:**
- Decisão registrada: fluxo via RPA detalhado (URL do portal, login mapeado, prints das telas principais).
- Identificação de exigência de captcha, MFA ou IP fixo.

---

### Card 2.1 — Integração Piloto API (Ex: Tempo Assist ou similar)
**Descrição:** Implementar adapter API para ingestão de OS e atualização de status junto à primeira seguradora via API.

**Critérios de aceite:**
- Novas OS aparecem no sistema em até X minutos (definir SLA) após criação na seguradora.
- Atualizações de status (aceite, execução, finalização) são refletidas nos dois sentidos, se aplicável.
- Erros de integração geram log estruturado e alerta.
- Testado em ambiente de homologação antes de produção.

---

### Card 4.1 — Infraestrutura de execução de RPA (Básica)
**Descrição:** Ambiente containerizado (Cloud Run Jobs) para rodar scripts de automação (Playwright) contra o portal da seguradora piloto sem API.

**Critérios de aceite:**
- RPA roda em container isolado, com timeout configurável.
- Credenciais injetadas via Secret Manager, nunca hardcoded.
- Execução registra logs e evidências básicas (prints) em Cloud Storage.

---

### Card 4.2 — Agendamento de execuções
**Descrição:** Definir periodicidade de varredura do portal piloto (ex: a cada 15 min) via Cloud Scheduler.

**Critérios de aceite:**
- Integradora RPA do piloto tem sua própria frequência configurável.
- Execuções concorrentes da mesma integradora são bloqueadas (lock).

---

### Card 2.2 — Integração Piloto RPA (Ex: Europ Assistance / Redion)
**Descrição:** Implementar script e worker de RPA para ingestão de OS e extração de dados do portal da seguradora piloto sem API.

**Critérios de aceite:**
- RPA faz login, varre novos pedidos/OS e envia para o API Gateway no contrato único.
- Atualizações de status são capturadas e enviadas ao sistema.
- Erros de execução geram evidência (print) e log estruturado.

---

### Card 8.1 — Logging centralizado
**Descrição:** Todos os serviços (Gateway, adapters piloto, RPA piloto) enviam logs estruturados para o Cloud Logging.

**Critérios de aceite:**
- Logs padronizados (JSON) com correlação por ID de OS/execução.
- Retenção definida conforme necessidade de auditoria.

---

### Card 8.2 — Alertas de falha (Básico)
**Descrição:** Configurar Cloud Monitoring para alertar (e-mail/Slack) em caso de falha de integração ou RPA travado no piloto.

**Critérios de aceite:**
- Alertas configurados para: integração piloto fora do ar, taxa de erro acima de X%.
- Canal de notificação configurado.
