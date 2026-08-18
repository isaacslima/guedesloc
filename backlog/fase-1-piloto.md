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
**Status:** Não iniciado — nenhuma seguradora com API real integrada ainda. Recomenda-se retomar antes da Fase 9 (Escala), pra não escalar só o padrão RPA.

**Descrição:** Levantar com a seguradora com API mais simples (ex: Tempo Assist ou Porto Seguro) tipo de autenticação, documentação, ambiente de homologação e endpoints.

**Critérios de aceite:**
- Documento de descoberta preenchido: API (REST/SOAP), autenticação, rate limit, ambiente de testes, contato técnico.
- Decisão confirmada: validação de viabilidade da API.

---

### Card 2.0 (Spike 2 - Piloto RPA) — Descoberta Técnica: Seguradora sem API
**Status:** Já validado na prática — construído em `integracoes/juvo/` contra o portal da Tempo Assist (login mapeado, abas identificadas: novos/reagendados/agendados/cancelados, sem captcha/MFA bloqueante encontrado).

**Descrição:** Levantar com a seguradora sem API escolhida para o piloto (ex: Europ Assistance / Redion) o portal web, fluxo de login, formulários e comportamento do sistema.

**Critérios de aceite:**
- Decisão registrada: fluxo via RPA detalhado (URL do portal, login mapeado, prints das telas principais). ✅
- Identificação de exigência de captcha, MFA ou IP fixo. ✅ (nenhum encontrado até agora)

---

### Card 2.1 — Integração Piloto API (Ex: Tempo Assist ou similar)
**Status:** Não iniciado.

**Descrição:** Implementar adapter API para ingestão de OS e atualização de status junto à primeira seguradora via API.

**Critérios de aceite:**
- Novas OS aparecem no sistema em até X minutos (definir SLA) após criação na seguradora.
- Atualizações de status (aceite, execução, finalização) são refletidas nos dois sentidos, se aplicável.
- Erros de integração geram log estruturado e alerta.
- Testado em ambiente de homologação antes de produção.

---

### Card 4.1 — Infraestrutura de execução de RPA (Básica)
**Status:** Parcialmente implementado — roda containerizado (`integracoes/juvo/docker-compose.yml`, MySQL + Playwright); pendente migrar pra Cloud Run Jobs, credenciais via Secret Manager (hoje `.env`), e captura de evidências visuais (prints) em Cloud Storage — hoje só os dados extraídos são persistidos, sem screenshot da execução.

**Descrição:** Ambiente containerizado (Cloud Run Jobs) para rodar scripts de automação (Playwright) contra o portal da seguradora piloto sem API.

**Critérios de aceite:**
- RPA roda em container isolado, com timeout configurável. ✅ (local; falta Cloud Run Jobs)
- Credenciais injetadas via Secret Manager, nunca hardcoded. ❌ (`.env`)
- Execução registra logs e evidências básicas (prints) em Cloud Storage. ⚠️ Logs sim (ver Card 8.1); prints não.

---

### Card 4.2 — Agendamento de execuções
**Status:** Parcialmente implementado — `integracoes/juvo/src/scheduler.ts` usa `node-cron` local; falta migrar pra Cloud Scheduler e reforçar lock anti-concorrência explícito entre execuções da mesma integradora.

**Descrição:** Definir periodicidade de varredura do portal piloto (ex: a cada 15 min) via Cloud Scheduler.

**Critérios de aceite:**
- Integradora RPA do piloto tem sua própria frequência configurável. ✅ (via `CRON_SCHEDULE`, local)
- Execuções concorrentes da mesma integradora são bloqueadas (lock). ⚠️ A confirmar/reforçar.

---

### Card 2.2 — Integração Piloto RPA (Tempo Assist, via portal Juvo)
**Status:** Já implementado — `integracoes/juvo/` (Playwright faz login, varre OS por aba, persiste em MySQL local, envia ao Gateway via `src/gateway.ts`). Corrigido nesta sessão: bug que restringia a busca de detalhe (e portanto o envio ao Gateway) só à aba "novos" — agora usa `precisaSincronizar()` em `src/db.ts` pra decidir por qualquer aba; e um crash no Gateway causado por número de OS contendo "/" (sanitização de ID de documento Firestore em `backend/src/services/firestore.ts`).

**Descrição:** Implementar script e worker de RPA para ingestão de OS e extração de dados do portal da seguradora piloto sem API.

**Critérios de aceite:**
- RPA faz login, varre novos pedidos/OS e envia para o API Gateway no contrato único. ✅
- Atualizações de status são capturadas e enviadas ao sistema. ✅
- Erros de execução geram evidência (print) e log estruturado. ⚠️ Log estruturado sim; print/evidência visual ainda não (ver Card 4.1).

---

### Card 8.1 — Logging centralizado
**Status:** Já implementado nesta sessão — `backend/src/services/logger.ts` e `integracoes/juvo/src/logger.ts`: logs estruturados (JSON) sempre no console, com correlação por `requestId` (Gateway) / `execucaoId` (RPA), e envio opcional ao Cloud Logging via `@google-cloud/logging` controlado por `CLOUD_LOGGING_ENABLED` (default `false` — liga só quando a service account tiver o papel `roles/logging.logWriter`, já provisionado em `infra/terraform/main.tf`).

**Descrição:** Todos os serviços (Gateway, adapters piloto, RPA piloto) enviam logs estruturados para o Cloud Logging.

**Critérios de aceite:**
- Logs padronizados (JSON) com correlação por ID de OS/execução. ✅
- Retenção definida conforme necessidade de auditoria. ❌ (depende do Cloud Logging estar de fato ligado em produção — pendente de infra real, ver Fase 0 Cards 7.1-7.6)

---

### Card 8.2 — Alertas de falha (Básico)
**Status:** Não iniciado.

**Descrição:** Configurar Cloud Monitoring para alertar (e-mail/Slack) em caso de falha de integração ou RPA travado no piloto.

**Critérios de aceite:**
- Alertas configurados para: integração piloto fora do ar, taxa de erro acima de X%.
- Canal de notificação configurado.
