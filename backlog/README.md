# Backlog de Integrações de OS com Seguradoras — Visão Geral & Roadmap

## Visão Geral da Arquitetura Proposta

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

**Princípio central:** Cada seguradora é um "adapter" (API real ou RPA) que fala um protocolo próprio, mas todos entregam para a API de Orquestração no mesmo formato interno (contrato único de OS). Isso evita que o resto do sistema precise saber a diferença entre Porto Seguro e Mawdy.

---

## Estrutura do Backlog por Fases

O backlog original foi divido em 5 arquivos sequenciais de fase para facilitar o planejamento, priorização e execução progressiva:

| Arquivo de Fase | Descrição resumida | Escopo de Epics & Cards |
|---|---|---|
| 📄 [`fase-0-fundacao.md`](./fase-0-fundacao.md) | **Fundação da Arquitetura & Hub** | Epic 1 completo + Epic 7 (Infra GCP base) + Epic 3 (API Gateway & Auth) |
| 📄 [`fase-1-piloto.md`](./fase-1-piloto.md) | **Validação Piloto (1 API + 1 RPA)** | Spikes Piloto + 1 Adapter API + 1 Adapter RPA + Infra RPA Base + Logging/Alertas |
| 📄 [`fase-2-financeiro.md`](./fase-2-financeiro.md) | **Gestão Financeira (Recebíveis e Pagamentos)** | Epic 5 (Recebíveis) + Epic 6 (Pagamentos a prestadores) |
| 📄 [`fase-3-escala.md`](./fase-3-escala.md) | **Escala de Integrações** | Spikes restantes + Cards restantes do Epic 2 (Porto, Mawdy, Maxpar, Tokio, etc.) |
| 📄 [`fase-4-maturidade.md`](./fase-4-maturidade.md) | **Maturidade, Resiliência e Automação** | Epic 4 completo (Resiliência RPA) + Epic 8 (LGPD/Auditoria) + Card 6.3 (Automação PIX) |

---

## Ponto de Atenção Crítico

> ⚠️ **Importante:** Antes de estimar prazos para as fases de Piloto e Escala, os **Cards 2.0 (Spike de descoberta técnica)** de cada seguradora precisam ser realizados primeiro. É essa investigação que definirá se cada integração será via API ou RPA, o que impacta diretamente o esforço total.
