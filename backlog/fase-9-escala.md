# Fase 9 — Escala

> **Objetivo:** Replicar o padrão de integração (Adapters API + Workers RPA) validado no piloto (Fase 1) para todas as demais seguradoras do ecossistema. Reposicionada para depois do núcleo operacional (Fases 2-6): cada nova seguradora já nasce gravando no modelo unificado de OS (Fase 2), com kanban, distribuição e WhatsApp prontos, em vez de alimentar um modelo que ainda vai mudar.

---

## Módulos & Epics Inclusos

- **Epic 2 (Restante):** Integração de todas as demais seguradoras mapeadas.

---

## Cards da Fase 3

### Card 2.0 (Template/Spikes Restantes) — Spike de descoberta técnica por seguradora
**Status:** ❌ Bloqueado — sem contrato, contato comercial/técnico, acesso a portal ou documentação de API com nenhuma das 4 seguradoras desta fase (confirmado com o cliente). Diferente da Tempo Assist na Fase 1 (onde já havia relação estabelecida), aqui não existe nenhum ponto de partida — um spike de descoberta precisa de alguém do lado da seguradora pra responder "existe API?", "qual autenticação?", "tem ambiente de homologação?", e isso não é uma pergunta que dá pra responder sem contato real com cada uma.

**Descrição:** Levantar com cada seguradora/integradora remanescente se existe API disponível, tipo de autenticação, documentação, ambiente de homologação, ou se será via RPA.

**Critérios de aceite:**
- Documentos de descoberta preenchidos para cada seguradora.
- Decisão registrada (API vs RPA) para cada integradora.
- Se RPA: URL do portal, fluxo de login mapeado e telas anexadas.

**Próximo passo:** o cliente (Grupo Guedes) inicia contato comercial/técnico com cada seguradora — geralmente via o time de relacionamento com prestadores da própria seguradora, perguntando especificamente por "integração via API" ou "portal de prestadores" e se há documentação técnica disponível. Assim que houver qualquer contato, portal de acesso ou documento de uma delas, o spike de descoberta real (mesmo processo aplicado à Tempo Assist na Fase 1) pode começar pra essa seguradora especificamente, sem esperar as outras três.

---

### Card 2.3 — Integração Mawdy Brasil
**Status:** ❌ Bloqueado — depende do Card 2.0 (spike de descoberta) pra essa seguradora específica, ainda não iniciado por falta de contato/acesso.

**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Mawdy Brasil.

**Critérios de aceite:**
- Ingestão automática de OS e atualização de status em tempo hábil.
- Normalização no contrato único via Gateway.
- Validação em homologação antes de produção.

---

### Card 2.4 — Integração Maxpar Assistências
**Status:** ❌ Bloqueado — depende do Card 2.0 (spike de descoberta) pra essa seguradora específica, ainda não iniciado por falta de contato/acesso.

**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Maxpar Assistências.

**Critérios de aceite:**
- Ingestão automática de OS e atualização de status em tempo hábil.
- Normalização no contrato único via Gateway.
- Validação em homologação antes de produção.

---

### Card 2.5 — Integração Porto Seguro
**Status:** ❌ Bloqueado — depende do Card 2.0 (spike de descoberta) pra essa seguradora específica, ainda não iniciado por falta de contato/acesso. Por ser uma seguradora de grande porte, o próprio processo de credenciamento formal (não só o spike técnico) tende a ser mais longo — vale iniciar esse contato comercial com antecedência, mesmo antes de decidir a ordem de implementação entre as 4.

**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Porto Seguro.
*Nota:* Seguradoras de grande porte possuem processos formais de homologação e credenciamento. Mapear prazos de homologação técnica separadamente.

**Critérios de aceite:**
- Validação do credenciamento formal e chaves de acesso de produção.
- Ingestão de OS e sincronização bilateral de status.
- Validação completa no ambiente de testes da Porto Seguro.

---

### Card 2.6 — Integração Tokio Marine
**Status:** ❌ Bloqueado — depende do Card 2.0 (spike de descoberta) pra essa seguradora específica, ainda não iniciado por falta de contato/acesso.

**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Tokio Marine.

**Critérios de aceite:**
- Ingestão automática de OS e atualização de status em tempo hábil.
- Normalização no contrato único via Gateway.
- Validação em homologação antes de produção.

---

### Cards 2.X — Demais Integradoras Mapeadas
**Descrição:** Criar e implementar cards específicos para quaisquer novas seguradoras identificadas durante a fase de descoberta técnica.
