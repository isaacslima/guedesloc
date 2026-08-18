# Fase 4 — Comunicação com Prestadores (WhatsApp)

> **Objetivo:** Substituir o protótipo de teste (botão `wa.me` com telefone salvo em `localStorage`, adicionado em `src/views/OrdensIntegradasView.vue` durante a Fase 2 desta sessão) por uma integração real de WhatsApp Business via Z-API, com envio e recebimento de mensagens — pré-requisito de quase toda a Central de Automações (Fase 5).

---

## Módulos & Epics Inclusos

- **Epic 11 (novo):** Comunicação com Prestadores via WhatsApp

---

## Cards da Fase 4

### Card 11.1 — Integração com provedor WhatsApp (Z-API)
**Status:** Novo. **O protótipo de teste existente deve ser descartado, não evoluído** — telefone digitado manualmente e salvo em `localStorage` não é integração real, e guarda dado de contato indevidamente no front.

**Descrição:** Credenciais do provedor (Z-API) armazenadas só no servidor (Secret Manager/backend), nunca no front. Endpoint de envio de mensagem exposto pelo Gateway (`backend/`).

**Critérios de aceite:**
- Nenhuma credencial de WhatsApp trafega ou é persistida no front-end.
- Envio de mensagem de teste funcional a partir do Gateway.

---

### Card 11.2 — Webhook de recebimento (callbacks)
**Status:** Novo.

**Descrição:** Endpoint no Gateway pra receber eventos da Z-API (mensagem recebida, status enviado/entregue/lido), protegido por segredo/assinatura, gravando o payload técnico bruto (id da mensagem, status HTTP) pra consulta posterior (tela "Callbacks WhatsApp", Fase 8).

**Critérios de aceite:**
- Webhook rejeita requisições sem assinatura/segredo válido.
- Todo evento recebido é persistido e correlacionado a uma OS quando aplicável.

---

### Card 11.3 — Templates de mensagem
**Status:** Novo.

**Descrição:** Modelos de mensagem fixos nesta fase (a parametrização de horário/tentativas vem só na Fase 5 — Central de Automações): distribuição de OS ("dados completos da OS + responda 1-ACEITAR / 2-RECUSAR / 3-FALAR COM A EQUIPE"), confirmação do dia, confirmação de entrega, cobrança de foto, cobrança de retirada.

**Critérios de aceite:**
- Cada template inclui os dados mínimos da OS necessários pro prestador decidir/responder sem precisar abrir outro sistema.

---

### Card 11.4 — Interpretação de resposta simples do prestador
**Status:** Novo.

**Descrição:** Reconhecer respostas no padrão "1"/"2"/"3" (aceitar/recusar/falar com a equipe) e refletir a decisão no `historico[]` da OS e no status de distribuição (Fase 3). Resposta fora do padrão reconhecido cai pra atendimento humano (Card 11.5).

**Critérios de aceite:**
- Aceite/recusa reconhecidos atualizam a OS sem intervenção manual.
- Resposta não reconhecida nunca é descartada — sempre visível na inbox pra um humano tratar.

---

### Card 11.5 — Inbox de conversas (WhatsApp)
**Status:** Novo.

**Descrição:** Interface de 3 colunas: lista de conversas por prestador (filtros Todas/Não lidas/Aguardando resposta/Confirmadas/Pendências, busca); thread mostrando o template exato enviado e status enviado/entregue/lido; painel lateral "Dados da OS" com status atual + atalho "Abrir OS"; atribuição de atendimento humano ("Atendido por"/"Transferir").

**Critérios de aceite:**
- Reaproveita layout/paleta existentes (Card 0 de `backlog/README.md`) — três colunas dentro do `DashboardLayout` atual.
- Transferência de atendimento registra quem passou pra quem.

---

### Card 11.6 — Diagnóstico de integração WhatsApp
**Status:** Novo.

**Descrição:** Painel em Configurações mostrando número conectado, URL de webhook a cadastrar na Z-API (eventos obrigatórios "Ao receber"/"Status da mensagem", opcional "Ao enviar"), último evento recebido, e alerta se nada chegou nas últimas 24h; telefone de teste real + botão enviar (substitui definitivamente o protótipo do Card 11.1).

**Critérios de aceite:**
- Alerta de "sem callback há 24h" visível sem precisar consultar log bruto.
