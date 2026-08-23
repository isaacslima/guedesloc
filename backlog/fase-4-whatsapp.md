# Fase 4 — Comunicação com Prestadores (WhatsApp)

> **Objetivo:** Substituir o protótipo de teste (botão `wa.me` com telefone salvo em `localStorage`, adicionado em `src/views/OrdensIntegradasView.vue` durante a Fase 2 desta sessão) por uma integração real de WhatsApp Business via Z-API, com envio e recebimento de mensagens — pré-requisito de quase toda a Central de Automações (Fase 5).

---

## Módulos & Epics Inclusos

- **Epic 11 (novo):** Comunicação com Prestadores via WhatsApp

---

## Cards da Fase 4

### Card 11.1 — Integração com provedor WhatsApp (Z-API)
**Status:** ⚠️ Parcial — código pronto (`backend/src/services/zapi.ts` + `whatsapp.ts`, rota `POST /api/v1/whatsapp/enviar`) e **envio e recebimento reais confirmados ponta a ponta, com backend publicado em produção** (Cloud Run, projeto `guedesloc`, URL `https://guedesloc-gateway-1012282054525.southamerica-east1.run.app`; front publicado em `https://guedesloc.web.app`): mensagem de template "Distribuição" chegou de fato no WhatsApp de destino, status em `mensagens_whatsapp` mudou de `simulado`/`falha` pra `enviado`, **e a resposta do prestador pelo WhatsApp de verdade chegou de volta pelo webhook público** (não mais só simulada por curl). Segue usando uma **conta Z-API de teste pessoal** (plano Trial), não a conta do cliente. O protótipo de teste antigo (`wa.me` + `localStorage`) foi removido de `OrdensView.vue` nesta fase.

**Descrição:** Credenciais do provedor (Z-API) armazenadas só no servidor (Secret Manager/backend), nunca no front. Endpoint de envio de mensagem exposto pelo Gateway (`backend/`).

**Critérios de aceite:**
- Nenhuma credencial de WhatsApp trafega ou é persistida no front-end. ✅
- Envio de mensagem de teste funcional a partir do Gateway. ✅ (simulado) ✅ (real, testado com conta Z-API de teste — ver pendência abaixo sobre a conta de produção)
- **Pendência:** decisão/ação já tomada nesta sessão pra viabilizar o resto do card — o front nunca tinha chamado o Gateway antes (gap do Card 3.2, Fase 0). Implementado `firebaseAuthMiddleware` (`backend/src/middleware/auth.ts`) validando ID token do Firebase, CORS liberado só pra `FRONTEND_ORIGIN`, e `src/lib/gateway.ts` no front pra chamar com o token. Isso desbloqueou os Cards 11.1 e 11.6.
- **❌ Bloqueado — conta Z-API de produção (do cliente) ainda não configurada.** O link (`instances/.../token/...`) que o cliente passou não corresponde a nenhuma instância da conta Z-API acessada nesta sessão (Instance ID/Token diferentes) — não deu pra confirmar se é uma instância cancelada, de outra conta do cliente, ou copiada errada. `backend/.env` está hoje apontando pra uma **conta de teste pessoal** (Trial), só pra validar o fluxo. Próximo passo: confirmar com o cliente a conta/instância Z-API certa (acesso ao painel dele, ou ele mesmo reconferir e reenviar o link + Client-Token de lá), e então trocar `ZAPI_INSTANCE_ID`/`ZAPI_TOKEN`/`ZAPI_CLIENT_TOKEN` em `backend/.env` pra essa conta antes de qualquer envio real pra prestadores de verdade.
- Nota técnica pra quem for configurar isso de novo: a Z-API exige, além de `ZAPI_INSTANCE_ID`/`ZAPI_TOKEN` (da URL), um **Client-Token** de segurança da conta (painel Z-API > Segurança > "Token de segurança da conta") em `ZAPI_CLIENT_TOKEN` — sem ele (ou com o valor errado/de outra conta), a Z-API responde `400 {"error":"your client-token is not configured"}` **mesmo com o header presente e corretamente formatado**, o que pode confundir o diagnóstico. O painel só mostra esse token mascarado depois de gerado — se não tiver o valor salvo em algum lugar seguro, a única forma de recuperar é regenerar (o que invalida o anterior).
- **✅ Resolvido — webhook de recebimento publicado e alcançável pela Z-API.** Backend deployado no Cloud Run (`gcloud run deploy guedesloc-gateway --source backend/ --region southamerica-east1 --project guedesloc`, service account dedicada `guedesloc-gateway-sa@guedesloc.iam.gserviceaccount.com` com `roles/datastore.user`, sem `GOOGLE_APPLICATION_CREDENTIALS` — usa Application Default Credentials nativo do Cloud Run). URL de webhook (`Ao receber` e `Receber status da mensagem`) cadastrada no painel da instância de teste da Z-API apontando pra `https://guedesloc-gateway-1012282054525.southamerica-east1.run.app/api/v1/whatsapp/webhook?secret=<WHATSAPP_WEBHOOK_SECRET>`. Testado com resposta real de WhatsApp chegando no sistema. Deploy manual via `gcloud`, sem Dockerfile versionado de CI/CD ainda (`backend/Dockerfile` + `backend/.dockerignore` criados, mas pipeline automatizado continua pendente — ver Card 7.2 em `backlog/fase-0-fundacao.md`).

---

### Card 11.2 — Webhook de recebimento (callbacks)
**Status:** ✅ Concluído — validado com payload simulado e também com resposta real de WhatsApp chegando pelo webhook público (backend publicado no Cloud Run, ver Card 11.1).

**Descrição:** Endpoint no Gateway pra receber eventos da Z-API (mensagem recebida, status enviado/entregue/lido), protegido por segredo/assinatura, gravando o payload técnico bruto (id da mensagem, status HTTP) pra consulta posterior (tela "Callbacks WhatsApp", Fase 8).

**Critérios de aceite:**
- Webhook rejeita requisições sem assinatura/segredo válido. ✅ `WHATSAPP_WEBHOOK_SECRET` (header `x-webhook-secret` ou `?secret=`), testado com/sem segredo.
- Todo evento recebido é persistido e correlacionado a uma OS quando aplicável. ✅ `POST /api/v1/whatsapp/webhook` grava em `callbacks_whatsapp` (payload bruto, sempre) e `mensagens_whatsapp` (mensagem interpretada, quando é texto). Correlação com a OS via última mensagem enviada pro mesmo telefone (não por thread/sessão da Z-API, que não temos ainda).
- Testado end-to-end com payload no formato real da Z-API (`type: "ReceivedCallback"`, `phone`, `text.message`, `fromMe`) — ver https://developer.z-api.io.

---

### Card 11.3 — Templates de mensagem
**Status:** ✅ Concluído — `backend/src/services/whatsappTemplates.ts`, os 5 tipos previstos.

**Descrição:** Modelos de mensagem fixos nesta fase (a parametrização de horário/tentativas vem só na Fase 5 — Central de Automações): distribuição de OS ("dados completos da OS + responda 1-ACEITAR / 2-RECUSAR / 3-FALAR COM A EQUIPE"), confirmação do dia, confirmação de entrega, cobrança de foto, cobrança de retirada.

**Critérios de aceite:**
- Cada template inclui os dados mínimos da OS necessários pro prestador decidir/responder sem precisar abrir outro sistema. ✅ Testado o template de distribuição de ponta a ponta (texto exato conferido na inbox).

---

### Card 11.4 — Interpretação de resposta simples do prestador
**Status:** ✅ Concluído — testado de ponta a ponta: resposta "1" simulada via webhook avançou a OS de `distribuindo_aguardando_resposta` pra `confirmada_aguardando_dia` sozinha, com entrada correta em `historico[]` ("Prestador respondeu 1-ACEITAR via WhatsApp").

**Descrição:** Reconhecer respostas no padrão "1"/"2"/"3" (aceitar/recusar/falar com a equipe) e refletir a decisão no `historico[]` da OS e no status de distribuição (Fase 3). Resposta fora do padrão reconhecido cai pra atendimento humano (Card 11.5).

**Critérios de aceite:**
- Aceite/recusa reconhecidos atualizam a OS sem intervenção manual. ✅
- Resposta não reconhecida nunca é descartada — sempre visível na inbox pra um humano tratar. ✅ Toda mensagem recebida é sempre gravada em `mensagens_whatsapp`, independente de ser interpretável.
- ⚠️ Escopo interno: a interpretação "1"/"2" só se aplica quando a OS correlacionada está na etapa `distribuindo_aguardando_resposta` (resposta de distribuição). Uma vez que a Fase 5 tiver `confirmacao_dia`/`confirmacao_entrega` automatizadas, esse "1" vai precisar significar coisas diferentes dependendo da etapa — ainda não implementado, é trabalho da Central de Automações.

---

### Card 11.5 — Inbox de conversas (WhatsApp)
**Status:** ⚠️ Parcial — `src/views/WhatsAppView.vue`, rota `/whatsapp`. Núcleo funcional testado (lista de conversas agrupadas por telefone, thread cronológica, dados da OS correlacionada, composer de nova mensagem), mas simplificado em relação à descrição original.

**Descrição:** Interface de 3 colunas: lista de conversas por prestador (filtros Todas/Não lidas/Aguardando resposta/Confirmadas/Pendências, busca); thread mostrando o template exato enviado e status enviado/entregue/lido; painel lateral "Dados da OS" com status atual + atalho "Abrir OS"; atribuição de atendimento humano ("Atendido por"/"Transferir").

**Critérios de aceite:**
- Reaproveita layout/paleta existentes (Card 0 de `backlog/README.md`) — três colunas dentro do `DashboardLayout` atual. ✅
- Transferência de atendimento registra quem passou pra quem. ❌ Não implementado nesta rodada — "Atendido por"/"Transferir" ficou de fora pra não estourar o escopo da fase. Fica como pendência (ver `src/data/roadmap.ts`).
- ⚠️ Não implementado: filtros (Todas/Não lidas/Aguardando resposta/Confirmadas/Pendências) e busca — só a lista completa de conversas por enquanto. Atalho "Abrir OS" também não existe (mostra os dados inline, mas não linka pra `/os`).

---

### Card 11.6 — Diagnóstico de integração WhatsApp
**Status:** ⚠️ Parcial — versão mínima embutida no topo de `src/views/WhatsAppView.vue` (`GET /api/v1/whatsapp/status`): mostra se a Z-API está configurada ou simulada, e a data/hora do último callback recebido. Testado, funcionando.

**Descrição:** Painel em Configurações mostrando número conectado, URL de webhook a cadastrar na Z-API (eventos obrigatórios "Ao receber"/"Status da mensagem", opcional "Ao enviar"), último evento recebido, e alerta se nada chegou nas últimas 24h; telefone de teste real + botão enviar (substitui definitivamente o protótipo do Card 11.1).

**Critérios de aceite:**
- Alerta de "sem callback há 24h" visível sem precisar consultar log bruto. ❌ Não implementado — hoje só mostra a data do último callback, sem alerta se estiver velho.
- ❌ Não implementado: número conectado, URL de webhook pra copiar, telefone de teste com botão enviar dedicado (dá pra testar pela composer da inbox, Card 11.5, mas não é a mesma coisa). O painel "de verdade" faz mais sentido dentro de uma tela de Configurações — que só existe na Fase 8 (Card 14.7). Quando a Fase 8 acontecer, mover/expandir esse diagnóstico pra lá.

---

## Como testar (o que já está entregue)

1. Cadastre um prestador em **Prestadores** com um telefone válido (dígitos, com DDD e código do país — ex.: `5511999998888`).
2. Em **Distribuição**, atribua esse prestador a uma OS "Aguardando distribuição".
3. Abra **WhatsApp** — o badge no topo deve mostrar "Z-API simulada (sem credencial)" (normal, sem conta Z-API ainda).
4. No composer do topo, selecione a OS que você acabou de distribuir, escolha o tipo "Distribuição" e clique **Enviar mensagem** — deve aparecer "Enviado (simulado...)" e a conversa deve surgir na coluna da esquerda, com o texto do template certinho na coluna do meio.
5. Pra testar a resposta automática (Card 11.4), simule um callback da Z-API por `curl` (a Z-API de verdade só vai chamar isso quando a conta existir e o webhook estiver cadastrado lá):
   ```
   curl -X POST "http://localhost:8080/api/v1/whatsapp/webhook?secret=<WHATSAPP_WEBHOOK_SECRET do backend/.env>" \
     -H "Content-Type: application/json" \
     -d '{"type":"ReceivedCallback","fromMe":false,"phone":"<telefone do prestador>","messageId":"teste","text":{"message":"1"}}'
   ```
   Depois disso, a OS deve aparecer com etapa `confirmada_aguardando_dia` (confira em `/os` ou direto no Firestore) — sem nenhuma ação manual.
6. Repita com `"message":"2"` numa OS diferente — deve voltar pra `aguardando_distribuicao`, sem prestador.

**Fora do escopo desta fase:** envio/recebimento reais (precisa de conta Z-API — ver pendências), filtros/busca na inbox, "Atendido por"/"Transferir", painel de diagnóstico completo (fica pra Fase 8 junto da tela de Configurações).
