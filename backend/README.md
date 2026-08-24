# Guedesloc — Gateway Backend

Gateway de orquestração (Express/TypeScript) — único ponto de escrita de OS integradas no Firestore, e responsável pela integração de WhatsApp (Z-API). Ver `CLAUDE.md` na raiz do repo pra visão geral do projeto.

## Desenvolvimento local

```
npm install
npm run dev      # tsx watch src/index.ts, porta definida em PORT (padrão 8080)
```

Variáveis de ambiente em `backend/.env` (não versionado — copiar de `backend/.env.example` e preencher). Localmente, `GOOGLE_APPLICATION_CREDENTIALS` aponta pra um arquivo de chave de service account do Firebase Admin; em produção (Cloud Run) isso não é usado — ver abaixo.

## Deploy em produção (Cloud Run)

O Gateway roda hoje publicado no **Cloud Run**, projeto GCP `guedesloc`, região `southamerica-east1`. Deploy é manual (sem CI/CD ainda — ver Card 7.2 em `backlog/fase-0-fundacao.md`).

### Pré-requisitos (uma vez só)

1. **Billing habilitado** no projeto `guedesloc` (Cloud Run/Cloud Build não funcionam sem isso, mesmo dentro da camada gratuita). Confirmar com `gcloud billing projects describe guedesloc`.
2. **APIs habilitadas**: `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`.
   ```
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project guedesloc
   ```
3. **Autenticação do `gcloud`** com uma conta com acesso ao projeto (`gcloud auth login`, depois `gcloud config set project guedesloc`).
4. **Service account dedicada** do Gateway, com só a permissão de Firestore que ela precisa (não usar a service account padrão do Compute Engine — o projeto pode ser compartilhado com outros serviços):

   ```
   gcloud iam service-accounts create guedesloc-gateway-sa \
     --project=guedesloc \
     --display-name="Guedesloc Gateway (Cloud Run)"

   gcloud projects add-iam-policy-binding guedesloc \
     --member="serviceAccount:guedesloc-gateway-sa@guedesloc.iam.gserviceaccount.com" \
     --role="roles/datastore.user" \
     --condition=None
   ```

### Deploy (primeira vez ou quando mudar variáveis de ambiente)

```
gcloud run deploy guedesloc-gateway \
  --source backend/ \
  --region southamerica-east1 \
  --project guedesloc \
  --service-account guedesloc-gateway-sa@guedesloc.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars="^;^GATEWAY_API_KEY=<valor>;GOOGLE_CLOUD_PROJECT=guedesloc;LOG_NAME=guedesloc-gateway-backend;CLOUD_LOGGING_ENABLED=false;SENTRY_DSN=<valor, opcional>;FRONTEND_ORIGIN=http://localhost:5173,https://guedesloc.web.app,https://guedesloc.firebaseapp.com;ZAPI_INSTANCE_ID=<valor>;ZAPI_TOKEN=<valor>;ZAPI_CLIENT_TOKEN=<valor>;WHATSAPP_WEBHOOK_SECRET=<valor>"
```

Rodar a partir da **raiz do repo** (não de dentro de `backend/`) — `--source backend/` é relativo ao diretório onde o comando é executado.

Valores reais de cada variável: ver `backend/.env` local (nunca commitado) ou `backend/.env.example` pra saber o que cada uma faz.

**Por que `--allow-unauthenticated`:** quem chama o Gateway (navegador via token do Firebase, Z-API via webhook, RPA via API key) não tem como fornecer um token IAM do Cloud Run. A autenticação de verdade é feita rota-a-rota dentro do próprio Express (`firebaseAuthMiddleware`, `serviceAuthMiddleware`, segredo do webhook) — isso não muda com o Cloud Run público.

**Por que sem `GOOGLE_APPLICATION_CREDENTIALS`:** em produção o Firebase Admin SDK usa Application Default Credentials, fornecida nativamente pelo Cloud Run através da service account anexada ao serviço (`backend/src/services/firestore.ts` já suporta isso sem mudança de código — só não setar essa variável no Cloud Run).

**Por que `CLOUD_LOGGING_ENABLED=false`:** o Cloud Run já captura stdout/stderr como log estruturado automaticamente; ligar essa flag chamaria a API de Cloud Logging de novo, duplicando log e exigindo a role `roles/logging.logWriter` à toa.

### Redeploy (só código mudou, variáveis de ambiente continuam as mesmas)

```
gcloud run deploy guedesloc-gateway --source backend/ --region southamerica-east1 --project guedesloc
```

Sem `--set-env-vars`/`--service-account`/`--allow-unauthenticated`, o Cloud Run mantém a configuração da revisão anterior — só troca a imagem.

### Depois do deploy

1. Anotar a URL pública (`https://guedesloc-gateway-<hash>-<region>.a.run.app`, aparece na saída do comando ou via `gcloud run services describe guedesloc-gateway --region southamerica-east1 --project guedesloc --format='value(status.url)'`).
2. Se a URL mudou (primeiro deploy, ou o serviço foi recriado): atualizar `VITE_GATEWAY_URL` no `.env` da raiz do repo (frontend), rodar `npm run build` e `firebase deploy --only hosting --project guedesloc`.
3. Se o webhook da Z-API ainda não estiver configurado (ou a URL mudou): painel [app.z-api.io](https://app.z-api.io) → Instâncias Web → a instância em uso → aba "Webhooks e configurações gerais" → preencher **"Ao receber"** e **"Receber status da mensagem"** com:
   ```
   https://<url-do-cloud-run>/api/v1/whatsapp/webhook?secret=<WHATSAPP_WEBHOOK_SECRET>
   ```
   (o mesmo valor de `WHATSAPP_WEBHOOK_SECRET` configurado no passo de deploy) → Salvar.
4. Verificar:
   ```
   curl https://<url-do-cloud-run>/health
   ```
   deve responder `{"status":"ok", ...}`.

## Arquivos relevantes

- `Dockerfile` / `.dockerignore` — build multi-stage (compila TS, roda só com deps de produção). Usado automaticamente pelo `gcloud run deploy --source` (Cloud Build detecta o Dockerfile).
- `.env.example` — lista todas as variáveis de ambiente esperadas, com comentário do que cada uma faz.

## Pendências conhecidas (ver `backlog/fase-0-fundacao.md`, Card 7.2)

- Deploy é manual — sem pipeline de CI/CD.
- Um projeto GCP só (`guedesloc`) — sem separação hml/prod.
- Existe um esqueleto Terraform em `infra/terraform/` (não usado neste deploy — aponta por padrão pro projeto `guedesloc-hml`, nunca aplicado).
