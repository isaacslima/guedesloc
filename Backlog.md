# Backlog — Central de OS Guedesloc

> **Nota:** Este backlog foi estruturado em **11 fases sequenciais** (0 a 10), reordenadas por dependência real de construção — não pela ordem em que qualquer protótipo de referência apresenta as telas. Os arquivos por fase estão disponíveis na pasta [`backlog/`](./backlog/).

---

## 🗺️ Mapa de Navegação do Backlog por Fases

1. 📄 **[`backlog/README.md`](./backlog/README.md)** — Visão geral da arquitetura, diagrama, guia de navegação e o **Card 0** (restrição transversal de identidade visual).
2. 📄 **[`backlog/fase-0-fundacao.md`](./backlog/fase-0-fundacao.md)** — **Fase 0: Fundação** (Hub, modelo canônico, Pub/Sub, API Gateway e Infra GCP base).
3. 📄 **[`backlog/fase-1-piloto.md`](./backlog/fase-1-piloto.md)** — **Fase 1: Piloto de Integração** (Spikes de descoberta, 1º Adapter API, 1º Adapter RPA — Tempo Assist —, Infra RPA base e Logging).
4. 📄 **[`backlog/fase-2-unificacao-os.md`](./backlog/fase-2-unificacao-os.md)** — **Fase 2: Unificação do Modelo de OS & Criação Assistida** (schema único, migração, tela única de OS, criação por texto/PDF colado com extração assistida).
5. 📄 **[`backlog/fase-3-prestadores-distribuicao.md`](./backlog/fase-3-prestadores-distribuicao.md)** — **Fase 3: Prestadores, Cobertura e Distribuição** (cadastro com cidades/cascata, tela de distribuição manual).
6. 📄 **[`backlog/fase-4-whatsapp.md`](./backlog/fase-4-whatsapp.md)** — **Fase 4: Comunicação com Prestadores (WhatsApp)** (integração real via Z-API, webhook, templates, inbox de conversas).
7. 📄 **[`backlog/fase-5-kanban-automacoes.md`](./backlog/fase-5-kanban-automacoes.md)** — **Fase 5: Kanban Operacional Completo & Central de Automações** (10 etapas, lista/agenda, motor de automações configurável).
8. 📄 **[`backlog/fase-6-visoes-operacionais.md`](./backlog/fase-6-visoes-operacionais.md)** — **Fase 6: Visões Operacionais Especializadas** (Entregas, Retiradas, Pendências).
9. 📄 **[`backlog/fase-7-financeiro.md`](./backlog/fase-7-financeiro.md)** — **Fase 7: Financeiro** (Gestão de Recebíveis de seguradoras e Pagamentos a prestadores/terceirizados).
10. 📄 **[`backlog/fase-8-governanca-relatorios.md`](./backlog/fase-8-governanca-relatorios.md)** — **Fase 8: Governança, Acesso e Relatórios** (RBAC, auditoria de negócio, relatórios, conferência de OS).
11. 📄 **[`backlog/fase-9-escala.md`](./backlog/fase-9-escala.md)** — **Fase 9: Escala** (replicação do padrão pra todas as demais seguradoras: Porto, Mawdy, Maxpar, Tokio Marine etc.).
12. 📄 **[`backlog/fase-10-maturidade.md`](./backlog/fase-10-maturidade.md)** — **Fase 10: Maturidade** (resiliência do RPA, evidências, pagamentos automáticos PIX, auditoria/LGPD).

---

## Visão geral da arquitetura proposta

```
[Seguradoras: API]                 [Seguradoras: sem API]
Tempo Assist, Porto Seguro,        Europ/Redion, Mawdy, Maxpar,
Tokio Marine (a confirmar)         etc. (a confirmar)
        │                                    │
        ▼                                    ▼
  Adapters de API                    Workers de RPA
 (Cloud Run, 1 serviço                (Cloud Run + Playwright,
  por seguradora ou                    containers isolados,
  multi-tenant)                        agendados via Cloud
        │                              Scheduler)
        └───────────────┬─────────────────────┘
                        ▼
             API de Orquestração (Gateway)
          - normaliza payload de cada seguradora
          - publica eventos em Pub/Sub
          - grava estado no modelo único de OS (Firestore)
                        │
                        ▼
        Núcleo Operacional — Central de OS (kanban único)
        - Prestadores com cobertura por cidade e cascata
        - Distribuição manual e automática
        - Comunicação bidirecional via WhatsApp (Z-API)
        - Central de Automações (distribuição, confirmações,
          foto, retirada)
        - Entregas / Retiradas / Pendências
                        │
                        ▼
        Módulos de apoio:
        - Gestão de Recebíveis e Pagamentos a Terceirizados
        - Governança (RBAC, Auditoria, Relatórios, Conferência de OS)
                        │
                        ▼
              Front-end (Firebase Hosting)
```

Princípio central: **cada seguradora é um "adapter"** (API real ou RPA) que fala um protocolo próprio, mas todos entregam para a API de Orquestração no mesmo formato interno (contrato único de OS). O Gateway grava num **modelo único de OS** (Fase 2) — a mesma entidade que flui pelo kanban operacional, tenha ela vindo de integração automática, sido criada manualmente, ou colada via IA.

---

## Resumo dos Epics e Alocação por Fases

| Epic | Descrição | Fase Alocada |
|---|---|---|
| **EPIC 1** | Hub Central de Integrações | **Fase 0 (Fundação)** |
| **EPIC 3** | API de Orquestração (Gateway) | **Fase 0 (Fundação)** |
| **EPIC 7** | Infraestrutura GCP | **Fase 0 (Fundação)** |
| **EPIC 2 (Piloto)** | Integrações Piloto (1 API + 1 RPA) | **Fase 1 (Piloto de Integração)** |
| **EPIC 4 (Base)** | Infraestrutura Base de RPA | **Fase 1 (Piloto de Integração)** |
| **EPIC 8 (Base)** | Logging Centralizado e Alertas Básicos | **Fase 1 (Piloto de Integração)** |
| **EPIC 9 (Parte 1)** | Modelo Unificado de OS & Criação Assistida | **Fase 2** |
| **EPIC 10** | Prestadores, Cobertura e Distribuição | **Fase 3** |
| **EPIC 11** | Comunicação com Prestadores via WhatsApp | **Fase 4** |
| **EPIC 9 (Parte 2)** | Kanban Operacional Completo | **Fase 5** |
| **EPIC 12** | Central de Automações | **Fase 5** |
| **EPIC 13** | Visões Operacionais Especializadas | **Fase 6** |
| **EPIC 5** | Gestão de Recebíveis (Seguradoras) | **Fase 7 (Financeiro)** |
| **EPIC 6 (Base)** | Gestão de Pagamentos a Terceirizados | **Fase 7 (Financeiro)** |
| **EPIC 14** | Governança, Acesso e Relatórios | **Fase 8** |
| **EPIC 2 (Restante)** | Escala para Demais Seguradoras | **Fase 9 (Escala)** |
| **EPIC 4 (Avançado)** | Resiliência e Evidências RPA | **Fase 10 (Maturidade)** |
| **EPIC 6 (Card 6.3)** | Automação de Pagamento PIX | **Fase 10 (Maturidade)** |
| **EPIC 8 (Completo)** | Auditoria LGPD e Segurança de Credenciais | **Fase 10 (Maturidade)** |

---

## Sugestão de sequenciamento (roadmap)

1. **Fase 0 — Fundação:** Epic 1 (hub, contrato único, fila) + Epic 7 (infra GCP base) + Epic 3 (gateway e auth). *Parcialmente implementada.*
2. **Fase 1 — Piloto de Integração:** validar os dois fluxos (adapter API + RPA) de ponta a ponta — RPA da Tempo Assist já rodando em produção, incluindo Epic 8 básico (logs). *Parcialmente implementada.*
3. **Fase 2 — Unificação do Modelo de OS & Criação Assistida:** eliminar a divergência entre OS manual e OS integrada antes de construir qualquer coisa nova em cima delas; entregar criação assistida por texto/PDF colado.
4. **Fase 3 — Prestadores, Cobertura e Distribuição:** cadastro de prestador com cidades/cascata de prioridade + tela de distribuição manual.
5. **Fase 4 — Comunicação com Prestadores (WhatsApp):** integração real via Z-API (substitui o protótipo de teste), webhook, templates, inbox.
6. **Fase 5 — Kanban Operacional Completo & Central de Automações:** a tela central do produto — kanban de 10 etapas — e o motor de regras que automatiza distribuição/confirmações/cobranças.
7. **Fase 6 — Visões Operacionais Especializadas:** Entregas, Retiradas, Pendências — recortes do mesmo pipeline.
8. **Fase 7 — Financeiro:** Epic 5 (recebíveis) e Epic 6 (pagamentos), já com volume real de OS rodando pelo núcleo operacional.
9. **Fase 8 — Governança, Acesso e Relatórios:** RBAC, auditoria de negócio, relatórios, conferência de OS.
10. **Fase 9 — Escala:** replicar o padrão validado pras demais seguradoras (Epic 2, cards restantes), já gravando direto no modelo unificado.
11. **Fase 10 — Maturidade:** Epic 4 completo (resiliência de RPA), Epic 8 completo (auditoria/LGPD), automação de pagamento (Card 6.3).

**Ponto de atenção:** antes de estimar prazo, os cards 2.0 (spike de descoberta) de cada seguradora precisam ser feitos primeiro — é isso que vai dizer quantas integrações serão API vs RPA, e isso muda bastante o esforço total.

**Restrição transversal:** toda tela nova, em qualquer fase, preserva a identidade visual atual da Guedesloc (`DashboardLayout.vue`, paleta dourado/âmbar, componentes de `src/components/ui/`) — ver Card 0 em [`backlog/README.md`](./backlog/README.md). Qualquer protótipo de referência usado no planejamento vale só como guia funcional/UX, nunca visual.
