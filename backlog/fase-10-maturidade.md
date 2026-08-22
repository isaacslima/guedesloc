# Fase 10 — Maturidade, Resiliência e Automação

> **Objetivo:** Elevar o nível de maturidade operacional da plataforma com resiliência avançada de RPA, automação bancária fim a fim e conformidade estrita com LGPD e auditoria de segurança. Reposicionada para o final por depender de volume real de seguradoras (Fase 9) e do fluxo financeiro já rodando (Fase 7) para priorizar automação de pagamento e resiliência em escala. O Card 8.3 (log de auditoria imutável) é a base técnica que alimenta a tela de Auditoria de negócio do Card 14.3 (Fase 8); o Card 4.4 passa a cobrir também evidências de foto de entrega recebidas via WhatsApp (Fase 4/5); o Card 8.4 passa a cobrir também as credenciais do provedor de WhatsApp (Z-API).

---

## Módulos & Epics Inclusos

- **Epic 4 (Completo):** Motor de RPA (Resiliência, auto-recovery e armazenamento de evidências)
- **Epic 6 (Completo):** Automação de Pagamentos via PIX/API Bancária (Card 6.3)
- **Epic 8 (Completo):** Observabilidade, Auditoria LGPD e Gestão de Credenciais

---

## Cards da Fase 4

### Card 4.3 — Tratamento de falhas e resiliência do RPA
**Status:** ✅ Concluído — `integracoes/juvo/src/resiliencia.ts` (novo). `executarComRetry()` reexecuta a automação até 3 vezes (configurável via `RPA_MAX_TENTATIVAS`/`RPA_BACKOFF_BASE_MS`) com backoff exponencial (5s, 10s, 20s por padrão) antes de marcar como falha definitiva; usado tanto no disparo manual (`index.ts`) quanto no ciclo agendado (`scheduler.ts` — que antes não tinha nenhum retry, nem Sentry/logger estruturado, e passou a ter os dois). `ehErroDeSeletorOuLayout()` reconhece o padrão de mensagens de timeout/seletor do Playwright e loga como erro específico ("possível mudança de layout do portal"), separado de falhas transitórias comuns (rede, timeout de carregamento) — todo `logger.error` já vira issue no Sentry automaticamente (padrão existente do projeto).
Testado com um mock isolado (3 tentativas, sucesso na última; esgotamento e propagação do erro; classificação correta de erro de seletor vs. erro genérico) — sem rodar contra o portal real da Tempo Assist repetidamente só pra testar retry.

**Descrição:** Portais mudam de layout, caem, pedem captcha. O RPA precisa lidar com isso sem quebrar o sistema inteiro.

**Critérios de aceite:**
- Falha de um RPA não impacta os demais (isolamento de falha entre containers). **N/A por enquanto** — só existe um RPA hoje (Tempo Assist/Juvo), não há "containers" plural a isolar. Vira relevante de verdade quando a Fase 9 (outras seguradoras) desbloquear e um segundo worker existir — nesse momento, a decisão de containerização (Cloud Run Jobs ou similar, um processo por seguradora) precisa ser tomada.
- Alerta automático quando um seletor/elemento esperado não é encontrado (indício de mudança de layout do portal). ✅
- Reexecução automática com backoff exponencial antes de marcar como falha definitiva. ✅

---

### Card 4.4 — Armazenamento de evidências
**Status:** ❌ Bloqueado — testado nesta sessão (tentativa real de upload via Admin SDK): o produto **Cloud Storage for Firebase não está habilitado** no projeto (`guedesloc`). O bucket referenciado em `VITE_FIREBASE_STORAGE_BUCKET` (`.env`) é só o nome padrão que o Firebase *usaria* se o produto estivesse ativo — hoje ele não existe de verdade (erro `404 The specified bucket does not exist` ao tentar gravar um arquivo de teste).

**Descrição:** Guardar prints/HTML da execução do RPA para auditoria e troubleshooting.

**Critérios de aceite:**
- Evidência de cada execução armazenada em Cloud Storage com retenção definida (ex: 90 dias).
- Vinculada ao ID da execução no painel de monitoramento.

**Como desbloquear:** no Firebase Console do projeto, ir em **Storage > Get Started**, escolher a região (idealmente a mesma do Firestore) e confirmar as regras padrão. É uma ativação de poucos cliques, sem custo enquanto o uso for baixo (camada gratuita do Cloud Storage). Depois disso:
1. RPA (`integracoes/juvo`): capturar screenshot (`page.screenshot()`, já disponível via Playwright) e/ou o HTML da página no momento de uma falha (não em toda execução — só quando `executarComRetry` esgota as tentativas, pra não gerar volume desnecessário), subir pro Storage sob um caminho `evidencias/{execucaoId}/...`.
2. WhatsApp (Fase 4): hoje o Gateway só processa o *texto* de mensagens recebidas (`processarCallbackWhatsapp`) — mídia (foto de entrega) enviada pelo prestador via Z-API ainda não é baixada nem armazenada em lugar nenhum. Esse é um gap adicional, só descoberto ao mapear este card: nem o texto do payload de mídia é tratado hoje.
3. Painel de monitoramento vinculando execução → evidência: a tela de execuções do RPA (se existir — não mapeada neste levantamento) ou uma extensão da tela de Auditoria (Card 14.3/8.3) já construída, mostrando o link da evidência por execução.
4. Retenção de 90 dias: configurável via [regra de ciclo de vida do bucket](https://firebase.google.com/docs/storage/manage-files) (lifecycle rule), não precisa de código — configuração direta no Storage.

---

### Card 6.3 — Integração com meio de pagamento (Automação PIX/Bancária)
**Status:** ❌ Bloqueado — mesma pendência já registrada na Fase 7 (Card 6.2): nenhum banco/plataforma de pagamento definido, sem credencial de API bancária configurada. O fluxo manual (gerar lote → exportar CSV → pagar fora do sistema → marcar como pago com comprovante) já funciona de ponta a ponta desde a Fase 7 — este card é especificamente sobre automatizar a *execução* do pagamento, não sobre ter um lote pra pagar.

**Descrição:** Automatizar o pagamento a prestadores via PIX/transferência bancária diretamente pelo sistema ao aprovar o lote.

**Critérios de aceite:**
- Integração com API de banco ou plataforma de pagamentos.
- Confirmação de pagamento via webhook atualiza status do lote automaticamente.

**Como desbloquear:** decidir qual banco/plataforma usar (opções comuns no Brasil: API PIX direto de um banco como Banco Inter/BTG, ou uma plataforma de pagamento em lote como Iugu/Asaas/Celcoin) e abrir conta/credenciamento lá. A partir daí, o Gateway ganha um novo serviço (mesmo padrão de `zapi.ts`) que dispara o PIX ao confirmar o lote, e uma nova rota de webhook (mesmo padrão de `/api/v1/whatsapp/webhook`) que recebe a confirmação e chama `marcarPago()` automaticamente em vez de manual.

---

### Card 8.3 — Auditoria de acessos e ações (LGPD)
**Status:** ⚠️ Parcial (por decisão consciente, não por bloqueio técnico) — mecanismo técnico concluído; política de retenção/anonimização deliberadamente **não decidida por mim**, por ser uma decisão legal/de negócio do cliente (confirmado com o cliente antes de começar esta fase).
Reaproveita o mesmo mecanismo do Card 14.3 (Fase 8) — coleção `auditoria`, protegida por regra `allow update, delete: if false` (imutável por regra; mesma ressalva de regras-não-publicadas já registrada na pendência da Fase 8). Os 3 tipos de ação sensível do critério de aceite, que a Fase 8 **não** cobria, foram adicionados e testados ao vivo nesta fase:
- **Alteração de valores** — `usePrecos.ts` (cadastro/reajuste de preço, com valor anterior → novo registrado) e `useRecebiveis.ts` (registro de valor confirmado na conciliação).
- **Exclusão de OS** — `ConfiguracoesView.vue`, Zona de Perigo (Fase 8): uma entrada por operação (não por OS individual, pra não afogar o log numa exclusão em massa), com a lista de números apagados no próprio registro.
- **Aprovação de pagamentos** — `useLotesPagamento.ts`/`RepassesView.vue`, ao marcar um lote como pago.
Testado ao vivo os 3 caminhos com dados de teste descartáveis — cada ação gerou a entrada correta, buscável na tela de Auditoria (`/auditoria`), com o valor anterior/novo quando aplicável.

**Descrição:** Como o sistema trata dados sensíveis de clientes/veículos das seguradoras, é necessário registrar quem acessou/alterou cada informação.

**Critérios de aceite:**
- Log de auditoria imutável para ações sensíveis (alteração de valores, exclusão de OS, aprovação de pagamentos). ✅
- Revisão dos dados pessoais trafegados e aplicação de políticas de retenção/anonimização conforme LGPD. ❌ Não endereçado nesta fase — decisão do cliente, não técnica. Ver pendência no `/roadmap`.

---

### Card 8.4 — Política de segurança de credenciais
**Status:** ⚠️ Parcial — cronograma de rotação documentado abaixo (parte "documentado" do critério de aceite). Automação via Secret Manager **não implementada**: hoje todas as credenciais do projeto vivem em arquivos `.env` (padrão desde a Fase 0), não no GCP Secret Manager — migrar pra lá é um projeto de infraestrutura à parte, fora do escopo de código desta fase.

**Descrição:** Definir rotação periódica de credenciais de integração e de Service Accounts do GCP.

**Critérios de aceite:**
- Cronograma de rotação documentado e automatizado via Secret Manager onde possível. ⚠️ Documentado; automação bloqueada (ver acima).

**Cronograma de rotação — credenciais em uso hoje no projeto:**

| Credencial | Onde vive | Frequência recomendada | Como rotacionar |
|---|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` (chave de service account Firebase Admin) | `backend/.env`, arquivo JSON local | 180 dias, ou imediatamente se o arquivo vazar | Gerar nova chave no Firebase Console (Configurações do projeto > Contas de serviço > Gerar nova chave privada), atualizar o `.env`, revogar a chave antiga no mesmo painel |
| `GATEWAY_API_KEY` | `backend/.env` + `integracoes/juvo/.env` (precisa ser o mesmo valor nos dois) | 90 dias | Gerar novo valor aleatório (`openssl rand -hex 32`), atualizar nos dois `.env` juntos (um deploy só, senão o RPA perde acesso ao Gateway até sincronizar) |
| `WHATSAPP_WEBHOOK_SECRET` | `backend/.env` | 90 dias | Gerar novo valor (`openssl rand -hex 24`), atualizar no `.env` **e** no painel da Z-API (URL do webhook com o secret novo) — os dois lados precisam mudar juntos |
| `ZAPI_TOKEN` / `ZAPI_CLIENT_TOKEN` | `backend/.env` | Conforme política da Z-API (painel próprio) | Regenerar no painel Z-API (app.z-api.io), atualizar `backend/.env` |
| `SENTRY_DSN` (× 3: front/backend/RPA) | `.env` de cada serviço | Só se vazar (DSN não é super sensível — só permite *enviar* eventos, não ler dados) | Gerar novo projeto/client key no Sentry, atualizar o `.env` correspondente |
| Senhas de usuário (`usuarios` — Card 14.1, Fase 8) | Firebase Auth | Fora deste card — gestão de senha é decisão de cada pessoa, não uma credencial de integração/infraestrutura | N/A |

**Próximo passo pra automação via Secret Manager:** migrar as credenciais acima do `.env` pro GCP Secret Manager (o backend já roda como service account com acesso ao Firestore — dar a ela também o papel `roles/secretmanager.secretAccessor` é o próximo passo natural), e configurar rotação automática (Secret Manager suporta isso nativamente pra algumas credenciais, ex.: chaves de service account via `gcloud iam service-accounts keys create` agendado). Isso é um trabalho de infraestrutura (Terraform, já existe uma referência a `infra/terraform` nos comentários do projeto) mais do que de código da aplicação — vale tratar como iniciativa própria quando a prioridade de infraestrutura permitir, não como parte do código do produto.

---

## Como testar

### Resiliência do RPA (Card 4.3)
Não dá pra "testar visualmente" numa tela — é um comportamento interno do worker `integracoes/juvo`. Pra conferir que está funcionando: force uma falha temporária (ex.: desligue a internet um instante durante uma execução manual, `npm start` dentro de `integracoes/juvo`) e observe no console/log que ele tenta de novo automaticamente (2-3 vezes, com espera crescente) antes de desistir — a mensagem `[Resiliência] ... tentando de novo em Xms` aparece no console a cada tentativa.

### Auditoria de ações sensíveis (Card 8.3)
1. Em **Tabela de Preços**, cadastre ou reajuste um preço — depois abra **Auditoria** e confira que apareceu uma entrada "Alteração de valor" com o valor anterior e o novo.
2. Em **Repasses**, marque um lote como pago — confira em Auditoria a entrada "Pagamento aprovado".
3. Em **Configurações > Zona de Perigo**, apague uma OS de teste — confira em Auditoria a entrada "Exclusão de OS", com o número da OS listado.

### Bloqueados (sem tela pra testar)
Cards 4.4 (evidências), 6.3 (pagamento automático via PIX/banco) e a automação via Secret Manager do Card 8.4 dependem de ativação/decisão externa (ver "Como desbloquear" em cada card acima) — nada pra testar até lá.
