# Backlog — Central de Integrações de OS com Seguradoras

> **Nota:** Este backlog foi estruturado e quebrado em **5 partes/fases sequenciais** para planejamento e execução ágil. Os arquivos por fase estão disponíveis na pasta [`backlog/`](./backlog/).

---

## 🗺️ Mapa de Navegação do Backlog por Fases

1. 📄 **[`backlog/README.md`](./backlog/README.md)** — Visão geral da arquitetura, diagrama e guia de navegação.
2. 📄 **[`backlog/fase-0-fundacao.md`](./backlog/fase-0-fundacao.md)** — **Fase 0: Fundação** (Hub, modelo canônico, Pub/Sub, API Gateway e Infra GCP base).
3. 📄 **[`backlog/fase-1-piloto.md`](./backlog/fase-1-piloto.md)** — **Fase 1: Piloto** (Spikes de descoberta, 1º Adapter API, 1º Adapter RPA, Infra RPA base e Logging/Alertas).
4. 📄 **[`backlog/fase-2-financeiro.md`](./backlog/fase-2-financeiro.md)** — **Fase 2: Financeiro** (Gestão de Recebíveis de seguradoras e Pagamentos a prestadores/terceirizados).
5. 📄 **[`backlog/fase-3-escala.md`](./backlog/fase-3-escala.md)** — **Fase 3: Escala** (Replicação do padrão para todas as demais seguradoras: Porto, Mawdy, Maxpar, Tokio Marine, etc.).
6. 📄 **[`backlog/fase-4-maturidade.md`](./backlog/fase-4-maturidade.md)** — **Fase 4: Maturidade** (Resiliência do RPA, Evidências, Pagamentos automáticos PIX e Auditoria/LGPD).

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
          - grava estado em Firestore
                        │
                        ▼
        Sistema atual (OS + Prestadores) + módulos novos:
        - Gestão de Recebíveis
        - Gestão de Pagamentos a Terceirizados
                        │
                        ▼
              Front-end (Firebase Hosting)
```

Princípio central: **cada seguradora é um "adapter"** (API real ou RPA) que fala um protocolo próprio, mas todos entregam para a API de Orquestração no mesmo formato interno (contrato único de OS). Isso evita que o resto do sistema precise saber a diferença entre Porto Seguro e Mawdy.

---

## Resumo dos Epics e Alocação por Fases

| Epic | Descrição | Fase Alocada |
|---|---|---|
| **EPIC 1** | Hub Central de Integrações | **Fase 0 (Fundação)** |
| **EPIC 3** | API de Orquestração (Gateway) | **Fase 0 (Fundação)** |
| **EPIC 7** | Infraestrutura GCP | **Fase 0 (Fundação)** |
| **EPIC 2 (Piloto)** | Integrações Piloto (1 API + 1 RPA) | **Fase 1 (Piloto)** |
| **EPIC 4 (Base)** | Infraestrutura Base de RPA | **Fase 1 (Piloto)** |
| **EPIC 8 (Base)** | Logging Centralizado e Alertas Básicos | **Fase 1 (Piloto)** |
| **EPIC 5** | Gestão de Recebíveis (Seguradoras) | **Fase 2 (Financeiro)** |
| **EPIC 6 (Base)** | Gestão de Pagamentos a Terceirizados | **Fase 2 (Financeiro)** |
| **EPIC 2 (Restante)** | Escala para Demais Seguradoras | **Fase 3 (Escala)** |
| **EPIC 4 (Avançado)** | Resiliência e Evidências RPA | **Fase 4 (Maturidade)** |
| **EPIC 6 (Card 6.3)** | Automação de Pagamento PIX | **Fase 4 (Maturidade)** |
| **EPIC 8 (Completo)** | Auditoria LGPD e Segurança de Credenciais | **Fase 4 (Maturidade)** |

---

## Sugestão de sequenciamento (roadmap)

1. **Fase 0 — Fundação:** Epic 1 (hub, contrato único, fila) + Epic 7 (infra GCP base) + Epic 3 (gateway e auth).
2. **Fase 1 — Piloto:** escolher 1 seguradora com API mais simples e 1 sem API, para validar os dois fluxos (adapter API + RPA) de ponta a ponta, incluindo Epic 8 básico (logs/alertas).
3. **Fase 2 — Financeiro:** Epic 5 (recebíveis) e Epic 6 (pagamentos), já com dados reais vindos do piloto.
4. **Fase 3 — Escala:** replicar o padrão validado para as demais seguradoras (Epic 2, cards restantes).
5. **Fase 4 — Maturidade:** Epic 4 completo (resiliência de RPA), Epic 8 completo (auditoria/LGPD), automação de pagamento (Card 6.3).

**Ponto de atenção:** antes de estimar prazo, os cards 2.0 (spike de descoberta) de cada seguradora precisam ser feitos primeiro — é isso que vai dizer quantas integrações serão API vs RPA, e isso muda bastante o esforço total.