# Fase 3 — Escala

> **Objetivo:** Replicar o padrão de integração (Adapters API + Workers RPA) validado no piloto para todas as demais seguradoras do ecossistema.

---

## Módulos & Epics Inclusos

- **Epic 2 (Restante):** Integração de todas as demais seguradoras mapeadas.

---

## Cards da Fase 3

### Card 2.0 (Template/Spikes Restantes) — Spike de descoberta técnica por seguradora
**Descrição:** Levantar com cada seguradora/integradora remanescente se existe API disponível, tipo de autenticação, documentação, ambiente de homologação, ou se será via RPA.

**Critérios de aceite:**
- Documentos de descoberta preenchidos para cada seguradora.
- Decisão registrada (API vs RPA) para cada integradora.
- Se RPA: URL do portal, fluxo de login mapeado e telas anexadas.

---

### Card 2.3 — Integração Mawdy Brasil
**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Mawdy Brasil.

**Critérios de aceite:**
- Ingestão automática de OS e atualização de status em tempo hábil.
- Normalização no contrato único via Gateway.
- Validação em homologação antes de produção.

---

### Card 2.4 — Integração Maxpar Assistências
**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Maxpar Assistências.

**Critérios de aceite:**
- Ingestão automática de OS e atualização de status em tempo hábil.
- Normalização no contrato único via Gateway.
- Validação em homologação antes de produção.

---

### Card 2.5 — Integração Porto Seguro
**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Porto Seguro.
*Nota:* Seguradoras de grande porte possuem processos formais de homologação e credenciamento. Mapear prazos de homologação técnica separadamente.

**Critérios de aceite:**
- Validação do credenciamento formal e chaves de acesso de produção.
- Ingestão de OS e sincronização bilateral de status.
- Validação completa no ambiente de testes da Porto Seguro.

---

### Card 2.6 — Integração Tokio Marine
**Descrição:** Implementar adapter (API ou RPA, conforme resultado do spike 2.0) para ingestão de OS e atualização de status junto à Tokio Marine.

**Critérios de aceite:**
- Ingestão automática de OS e atualização de status em tempo hábil.
- Normalização no contrato único via Gateway.
- Validação em homologação antes de produção.

---

### Cards 2.X — Demais Integradoras Mapeadas
**Descrição:** Criar e implementar cards específicos para quaisquer novas seguradoras identificadas durante a fase de descoberta técnica.
