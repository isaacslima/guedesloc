# Backlog — Central de OS Guedesloc — Visão Geral & Roadmap

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

**Princípio central:** Cada seguradora é um "adapter" (API real ou RPA) que fala um protocolo próprio, mas todos entregam para a API de Orquestração no mesmo formato interno (contrato único de OS). O Gateway grava num **modelo único de OS** (Fase 2) — a mesma entidade que flui pelo kanban operacional, receba ela sido criada por integração automática, manualmente, ou colada via IA. Isso evita que o resto do sistema precise saber a diferença entre Porto Seguro e Mawdy, ou entre uma OS integrada e uma OS manual.

---

## Card 0 — Restrição transversal: identidade visual (vale para TODAS as fases)

O protótipo funcional que o cliente (Grupo Guedes) compartilhou como referência de produto é usado **exclusivamente como referência funcional/UX** — quais telas existem, quais campos, quais fluxos, quais estados. Nenhuma fase deste backlog importa a paleta, tipografia, iconografia ou layout desse protótipo.

**Critérios de aceite (valem para todo card de UI de toda fase):**
- Toda tela nova é montada dentro de `src/components/layout/DashboardLayout.vue` (sidebar fixa 264px `bg-slate-900`, área de conteúdo `bg-slate-50`).
- Cor de destaque continua `--primary` dourado/âmbar (`45 93% 47%`, `src/assets/index.css`); a paleta semântica de badges de status (âmbar/azul/esmeralda/vermelho) é **estendida**, nunca substituída, para cobrir as novas etapas do kanban (Fase 5).
- Componentes novos ainda inexistentes em `src/components/ui/` (select estilizado, dialog/modal, toast, tabs, kanban board) são construídos como extensão da mesma lib interna — mesmos tokens de cor/espaçamento dos componentes já existentes (`button`, `input`, `badge`, `card`, `label`, `table`) — nunca importando uma lib de UI genérica de terceiros com estilo próprio não adaptado.
- Nenhum card de fase posterior é aceito como "pronto" se a tela final lembrar visualmente o protótipo de referência do cliente.

---

## Estrutura do Backlog por Fases

O backlog foi reordenado por **dependência real de construção**, não pela ordem de navegação de nenhum protótipo de referência. Os Epics 1-8 mantêm a numeração original; os módulos novos entram como Epics 9-14.

| Fase | Arquivo | Nome | Epics | Depende de |
|---|---|---|---|---|
| 0 | 📄 [`fase-0-fundacao.md`](./fase-0-fundacao.md) | Fundação | 1, 3, 7 | — |
| 1 | 📄 [`fase-1-piloto.md`](./fase-1-piloto.md) | Piloto de Integração | 2 (parcial), 4 (base), 8 (base) | Fase 0 |
| 2 | 📄 [`fase-2-unificacao-os.md`](./fase-2-unificacao-os.md) | Unificação do Modelo de OS & Criação Assistida | 9 (parte 1) | Fase 0, Fase 1 |
| 3 | 📄 [`fase-3-prestadores-distribuicao.md`](./fase-3-prestadores-distribuicao.md) | Prestadores, Cobertura e Distribuição | 10 | Fase 2 |
| 4 | 📄 [`fase-4-whatsapp.md`](./fase-4-whatsapp.md) | Comunicação com Prestadores (WhatsApp) | 11 | Fase 2, Fase 3 |
| 5 | 📄 [`fase-5-kanban-automacoes.md`](./fase-5-kanban-automacoes.md) | Kanban Operacional Completo & Central de Automações | 9 (parte 2), 12 | Fase 2, 3, 4 |
| 6 | 📄 [`fase-6-visoes-operacionais.md`](./fase-6-visoes-operacionais.md) | Visões Operacionais Especializadas | 13 | Fase 5 |
| 7 | 📄 [`fase-7-financeiro.md`](./fase-7-financeiro.md) | Financeiro (Recebíveis e Pagamentos) | 5, 6 (base) | Fase 5 |
| 8 | 📄 [`fase-8-governanca-relatorios.md`](./fase-8-governanca-relatorios.md) | Governança, Acesso e Relatórios | 14 | Fase 5, Fase 7 |
| 9 | 📄 [`fase-9-escala.md`](./fase-9-escala.md) | Escala — Demais Seguradoras | 2 (restante) | Fase 5 |
| 10 | 📄 [`fase-10-maturidade.md`](./fase-10-maturidade.md) | Maturidade — Resiliência, Evidências, PIX e LGPD | 4 (completo), 6 (Card 6.3), 8 (completo) | Fase 7, Fase 9 |

---

## Por que essa ordem

- **Fase 2 (unificar o modelo de OS) vem antes de tudo que é novo**: hoje existem dois modelos de OS não unificados (`OrdemDeServico` manual e `OrdemDeServicoCanonica` integrada, coleções separadas, sem ponte). Kanban, distribuição, WhatsApp e as visões de entrega/retirada tratam **toda** OS como uma entidade só — construir isso em cima de dois modelos divergentes é retrabalho garantido.
- **Prestadores com cobertura por cidade (Fase 3) precisa vir antes de Distribuição automática**, que por sua vez depende de **WhatsApp bidirecional (Fase 4)** pra funcionar de ponta a ponta — por isso a Central de Automações só entra na Fase 5, depois das três pré-condições resolvidas.
- **Entregas/Retiradas/Pendências (Fase 6)** são só recortes/visões do mesmo pipeline unificado — não fazem sentido antes do kanban existir.
- **Financeiro (Fase 7) e Escala pra mais seguradoras (Fase 9)** foram propositalmente movidos pra depois do núcleo operacional: fazem mais sentido, com menos retrabalho de dado, quando já existe volume real de OS fluindo pelo pipeline unificado.
- **Governança/RBAC/Auditoria de negócio (Fase 8) e Maturidade/LGPD (Fase 10)** ficam por último por decisão consciente: são aditivas, não bloqueiam nenhuma entrega anterior, e fazem mais sentido desenhadas depois que se sabe quais módulos/telas realmente existem.

---

## Ponto de Atenção Crítico

> ⚠️ **Importante:** Antes de estimar prazos para a Fase 1 (Piloto) e a Fase 9 (Escala), os **Cards 2.0 (Spike de descoberta técnica)** de cada seguradora precisam ser realizados primeiro. É essa investigação que definirá se cada integração será via API ou RPA, o que impacta diretamente o esforço total.
