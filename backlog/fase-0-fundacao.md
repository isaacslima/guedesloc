# Fase 0 — Fundação

> **Objetivo:** Estabelecer a infraestrutura de dados, barramento de eventos, gateway de orquestração e ambiente base na GCP antes de construir adapters específicos de seguradoras.

---

## Módulos & Epics Inclusos

- **Epic 1:** Hub Central de Integrações
- **Epic 3:** API de Orquestração (Gateway)
- **Epic 7:** Infraestrutura GCP Base

---

## Cards da Fase 0

### Card 1.1 — Modelagem de domínio das integradoras
**Status:** Parcialmente implementado — coleção `integradoras`, tipo `Integradora` (`src/types/integracao.ts`), CRUD via `src/composables/useIntegradoras.ts` + `src/views/IntegracoesView.vue`. Falta: Secret Manager real (`secretRef` existe como campo, mas nada aponta pra um Secret Manager de verdade ainda — RPA piloto usa `.env`/config local).

**Descrição:** Criar estrutura de dados (Firestore) para cadastrar cada seguradora/integradora: nome, tipo de integração (API ou RPA), status (ativa/inativa/em homologação), credenciais (referência ao Secret Manager, nunca a credencial em si), URLs/endpoints, SLA esperado.

**Critérios de aceite:**
- Existe uma coleção `integradoras` com schema documentado. ✅
- É possível cadastrar/editar/desativar uma integradora pela área administrativa sem deploy de código. ✅
- Campo `tipo_integracao` distingue `API` de `RPA`. ✅
- Credenciais nunca são gravadas em texto puro no Firestore — apenas referência ao Secret Manager. ⚠️ Pendente (Secret Manager real).

---

### Card 1.2 — Contrato único de Ordem de Serviço (modelo canônico)
**Status:** Parcialmente implementado — `OrdemDeServicoCanonica` (`src/types/integracao.ts`) usada de ponta a ponta (RPA → Gateway → Firestore → Front). Será revisado na **Fase 2** para ganhar `origem`, `etapa` de kanban e `historico[]`.

**Descrição:** Definir o "formato interno" de OS que todo adapter (API ou RPA) deve entregar, independente da seguradora de origem. Isso desacopla o resto do sistema das particularidades de cada integração.

**Critérios de aceite:**
- Documento de schema (OpenAPI/JSON Schema) versionado no repositório. ❌ Hoje só existe como `type` TypeScript, não como schema formal documentado.
- Contempla campos obrigatórios (nº OS seguradora, nº OS interno, cliente, endereço, tipo de serviço, valor, status, prestador, datas) e campos opcionais por seguradora. ✅ (via `camposAdicionais`)
- Validação automática rejeita payload fora do contrato antes de gravar no Firestore. ⚠️ Existe validação básica de campos obrigatórios em `backend/src/index.ts`, não um validador de schema completo.

---

### Card 1.3 — Fila assíncrona de eventos (Pub/Sub)
**Status:** Parcialmente implementado — tipos de evento e chamada de publicação existem (`backend/src/services/pubsub.ts`), mas `publicarEventoOS` hoje só loga o evento — **não é GCP Pub/Sub real**, sem tópicos provisionados, sem subscriptions, sem DLQ.

**Descrição:** Toda nova OS ou mudança de status recebida de uma integradora publica um evento em um tópico Pub/Sub, desacoplando a ingestão do processamento (financeiro, notificação, dashboard).

**Critérios de aceite:**
- Tópicos criados: `os.criada`, `os.status_alterado`, `os.cancelada`, `os.finalizada`. ⚠️ Existem só como `type TipoEventoOS`, não como tópicos GCP reais.
- Cada consumidor (financeiro, notificações, auditoria) tem sua própria subscription. ❌
- Mensagens com falha de processamento vão para uma dead-letter queue e geram alerta. ❌

---

### Card 1.4 — Motor de retry e idempotência
**Status:** Parcialmente implementado — idempotência por chave `seguradoraId:numeroOsSeguradora` funcionando em produção (`backend/src/services/idempotency.ts`: dedupe em memória + persistência em `idempotencia_logs`). Retry com backoff exponencial configurável por integradora ainda não existe (RPA hoje só loga erro e segue).

**Descrição:** Garantir que reenvios de webhook, reprocessamento de RPA ou falhas de rede não dupliquem OS nem pagamentos.

**Critérios de aceite:**
- Toda ingestão usa uma chave de idempotência (ex: `seguradora + nº_os_seguradora`). ✅
- Requisições duplicadas são identificadas e descartadas/atualizadas, nunca duplicadas. ✅
- Retries com backoff exponencial configurável por integradora. ❌

---

### Card 1.5 — Painel de monitoramento de integrações
**Status:** Não iniciado — `IntegracoesView.vue` lista integradoras, mas o botão "Sync" é mockado (`setTimeout` + `alert`, não chama nada real). Não há indicador de status real por seguradora nem reprocessamento manual de OS falhada.

**Descrição:** Tela administrativa mostrando, por seguradora, status da última sincronização, quantidade de OS processadas no dia, erros recentes.

**Critérios de aceite:**
- Lista todas as integradoras com indicador visual (verde/amarelo/vermelho). ❌
- Exibe timestamp da última execução com sucesso e da última falha. ⚠️ Campos existem no tipo (`ultimaSincronizacaoSucesso`/`ultimaSincronizacaoFalha`), não exibidos na tabela.
- Permite reprocessar manualmente uma OS que falhou. ❌

---

### Card 3.1 — API Gateway central
**Status:** Parcialmente implementado — `backend/src/index.ts` é o único ponto de escrita de `ordens_integradas` via `POST /api/v1/os/ingest`. **Gap a resolver antes da Fase 2:** o front hoje lê o Firestore **diretamente via SDK** (`onSnapshot` em `src/composables/useOrdensIntegradas.ts`), não passa pelo Gateway para leitura — decisão implícita que precisa ser formalizada (manter por realtime/simplicidade, ou revisar quando o kanban da Fase 5 precisar de campos computados/agregações que o Firestore puro não resolve bem).

**Descrição:** Serviço único (Cloud Run) que expõe endpoints internos para o front-end e recebe os dados normalizados de todos os adapters, sendo o único ponto de escrita no Firestore relacionado a OS.

**Critérios de aceite:**
- Endpoints documentados em OpenAPI/Swagger. ❌
- Nenhum adapter escreve diretamente no Firestore — tudo passa pelo Gateway. ✅ (pra escrita; leitura é direta, ver gap acima)
- Testes de carga básicos validam throughput mínimo esperado. ❌

---

### Card 3.2 — Autenticação e autorização service-to-service
**Status:** Parcialmente implementado — API key entre RPA e Gateway (`serviceAuthMiddleware` em `backend/src/middleware/auth.ts`) funcionando, agora com log estruturado em rejeições (adicionado nesta sessão). Validação de token Firebase Auth no backend ainda não existe (sem necessidade hoje, pois o front não chama o Gateway para leitura).

**Descrição:** Definir como os adapters (Cloud Run) se autenticam junto ao Gateway e como o front-end (Firebase Auth) se autentica para consumir a API.

**Critérios de aceite:**
- Comunicação adapter → gateway usa autenticação de serviço (IAM/Service Account do GCP ou API key com rotação). ⚠️ API key fixa, sem rotação.
- Comunicação front-end → gateway valida o token do Firebase Authentication. ❌ (front não chama o Gateway hoje)
- Nenhum endpoint sensível acessível sem autenticação. ✅

---

### Card 3.3 — Versionamento de contrato
**Status:** Já implementado — endpoint nasceu em `/api/v1/`.

**Descrição:** Estratégia de versionamento (`/v1/`, `/v2/`) para permitir evolução das integrações sem quebrar adapters já em produção.

**Critérios de aceite:**
- Endpoints versionados desde o primeiro deploy. ✅
- Documentação de política de depreciação. ❌

---

### Cards 7.1 a 7.6 — Infraestrutura GCP Base
**Status:** Não iniciado — ambiente atual roda local (`docker-compose.yml` no RPA, `.env` local no backend), sem Terraform aplicado, sem Secret Manager, sem Cloud Scheduler (RPA usa `node-cron` local via `integracoes/juvo/src/scheduler.ts`). Existe um esqueleto Terraform em `infra/terraform/` (service account do Gateway, tópicos/DLQ de Pub/Sub, secret de credenciais de integradoras, e — adicionado nesta sessão — permissão `roles/logging.logWriter` para Cloud Logging) mas ainda não é o ambiente real em uso.
**Nota de sequenciamento:** esses gaps de infra GCP real **não bloqueiam** as Fases 1-6 do roadmap — o sistema já funciona sobre o que existe hoje. Fechar com prioridade alta antes da Fase 9 (escala para múltiplas seguradoras), quando execução agendada em produção de verdade passa a ser necessária.

### Card 7.1 — Provisionamento de projeto e ambientes
**Descrição:** Estruturar projetos GCP separados (ou ao menos ambientes isolados) para homologação e produção, com IAM adequado.

**Critérios de aceite:**
- Ambientes de hml/prod isolados.
- IAM com princípio de menor privilégio por serviço.
- Infra como código (Terraform) versionada.

---

### Card 7.2 — Cloud Run para serviços de API e adapters
**Descrição:** Cada adapter e o Gateway rodam como serviços Cloud Run independentes, com deploy via CI/CD.

**Critérios de aceite:**
- Cada serviço tem pipeline de deploy próprio.
- Escalonamento automático configurado (min/max instâncias).

---

### Card 7.3 — Pub/Sub para orquestração de eventos
**Descrição:** Provisionar infraestrutura de eventos no GCP (criação de tópicos, subscriptions, DLQ).

**Critérios de aceite:**
- Tópicos e subscriptions provisionados via infra como código.
- Monitoramento de mensagens não processadas configurado.

---

### Card 7.4 — Secret Manager para credenciais
**Descrição:** Todas as credenciais de integração (API keys, logins de RPA) armazenadas no Secret Manager, nunca em código ou Firestore.

**Critérios de aceite:**
- Nenhuma credencial em texto puro no repositório ou banco de dados.
- Rotação de credenciais documentada.

---

### Card 7.5 — Cloud Scheduler para rotinas
**Descrição:** Agendamento de execuções de RPA, conciliações financeiras e geração de relatórios.

**Critérios de aceite:**
- Jobs agendados e monitorados, com alerta em caso de falha de execução.

---

### Card 7.6 — Integração entre backend GCP e Firestore/Firebase Auth existentes
**Descrição:** Garantir que o novo backend (Cloud Run) se conecta corretamente ao Firestore e Firebase Authentication já usados no front-end, sem duplicar fontes de verdade.

**Critérios de aceite:**
- Backend usa a mesma instância de Firestore do projeto atual (ou estratégia clara de múltiplos bancos, se necessário).
- Regras de segurança do Firestore revisadas para impedir escrita direta do front-end nas coleções sensíveis (financeiro), forçando passagem pela API.
