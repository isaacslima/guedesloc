# Fase 2 — Unificação do Modelo de OS & Criação Assistida

> **Objetivo:** Eliminar a divergência entre `OrdemDeServico` (manual, coleção `ordens`) e `OrdemDeServicoCanonica` (integrada, coleção `ordens_integradas`, somente leitura) antes de construir qualquer coisa nova em cima delas — kanban, distribuição, WhatsApp. Toda OS, venha de seguradora via API/RPA, criada manualmente, ou colada via IA, passa a ser uma única entidade fluindo pelo mesmo pipeline. Esta fase também entrega a "Nova assistência" (colar texto/PDF + extração assistida), por ser mais um modo de criação da mesma entidade unificada.

---

## Módulos & Epics Inclusos

- **Epic 9 (Parte 1):** Modelo Unificado de OS & Criação Assistida

---

## Cards da Fase 2

### Card 9.1 — Schema único de Ordem de Serviço
**Status:** Novo.

**Descrição:** Unificar `OrdemDeServico` (`src/types/index.ts`) e `OrdemDeServicoCanonica` (`src/types/integracao.ts`) num único modelo, guardado numa única coleção Firestore (substitui `ordens` + `ordens_integradas`). Campos novos que nenhum dos dois modelos atuais tem:
- `origem`: `manual` | `integrada_api` | `integrada_rpa` | `colada_ia` | `pdf_lote`.
- `etapa`: uma das etapas do kanban da Fase 5, mantendo um `status` simplificado derivado (aberta/em_andamento/concluida/cancelada) pras telas que não precisam do detalhe do kanban.
- Endereço estruturado completo (logradouro/complemento/bairro/CEP/referência/cidade/estado) — hoje `OrdemDeServico` só tem `endereco` string livre.
- Datas separadas por evento: agendamento, entrega real, retirada — distinto do `datas.agendamento` genérico de hoje.
- `historico[]`: array de mudanças de etapa (usuário, timestamp, etapa anterior/nova, motivo).

**Critérios de aceite:**
- Schema documentado e revisado com o time antes de qualquer migração de dado.
- Contrato canônico usado pelo Gateway (`backend/`) é atualizado sem quebrar o RPA piloto já em produção (Fase 1).
- Toda mudança de etapa, manual ou automática, gera entrada em `historico[]`.

---

### Card 9.2 — Migração dos dados existentes
**Status:** Novo.

**Descrição:** Script (dry-run primeiro) que migra os documentos das coleções `ordens` e `ordens_integradas` pra coleção única, mapeando o `status` antigo pra uma `etapa` inicial coerente (ex.: `concluida` → `Finalizada`; `aberta` sem prestador → `Aguardando distribuição`).

**Critérios de aceite:**
- Nenhuma OS perdida na migração (contagem antes/depois bate).
- Execução em modo dry-run gera relatório de divergências antes da migração real.
- IDs/idempotencyKeys preservados onde aplicável, pra não quebrar reprocessamento do RPA.

---

### Card 9.3 — Atualização do Gateway para o modelo unificado
**Status:** Novo (extensão dos Cards 3.1/1.2 da Fase 0).

**Descrição:** `POST /api/v1/os/ingest` passa a gravar na coleção única, preenchendo `origem` e uma `etapa` inicial padrão. Avaliar aqui endpoints novos de leitura/atualização de etapa, resolvendo o gap identificado no Card 3.1 (front lê Firestore direto, não passa pelo Gateway).

**Critérios de aceite:**
- RPA piloto (Fase 1) continua funcionando sem alteração de payload enviado.
- Validação de payload atualizada para o novo schema (Card 9.1).

---

### Card 9.4 — Tela única "Central de OS" (versão lista, sem kanban ainda)
**Status:** Novo.

**Descrição:** Unificar `src/views/OrdensView.vue` e `src/views/OrdensIntegradasView.vue` numa única tela, reaproveitando os componentes visuais existentes (badges, tabela `@tanstack/vue-table`). OS manuais continuam editáveis via CRUD; OS integradas continuam somente leitura nos campos vindos da seguradora, mas passam a compartilhar a mesma listagem, filtros e badges de status que as manuais. O kanban entra só na Fase 5 — aqui é fundação de dado + lista.

**Critérios de aceite:**
- Uma única tela substitui as duas telas atuais.
- Filtro por `origem` (manual/integrada_api/integrada_rpa/colada_ia/pdf_lote) disponível.
- Identidade visual preservada (ver Card 0 em `backlog/README.md`).

---

### Card 9.5 — Criação de OS assistida por texto colado
**Status:** Novo.

**Descrição:** Tela "Nova assistência" com um modo "Colar assistência": campo de texto livre onde o usuário cola a comunicação recebida da seguradora (e-mail, WhatsApp, PDF copiado etc.) em qualquer formato, e uma ação "Extrair dados" que tenta preencher automaticamente os campos da OS (número da OS, empresa/origem, seguradora/contratante, data do serviço, horário específico ou janela início/fim, cliente, telefone, endereço completo, tipo de serviço, observações). O usuário sempre revisa e pode corrigir cada campo extraído antes de confirmar — nada é salvo automaticamente sem essa revisão humana.

**Critérios de aceite:**
- Extração popula os campos do formulário de criação de OS (Card 9.1), nunca grava direto.
- Campos não reconhecidos ficam em branco e visivelmente marcados para preenchimento manual, sem erro bloqueante.
- OS criada por este fluxo recebe `origem = colada_ia` e entra no pipeline unificado normalmente.

---

### Card 9.6 — Importação de PDF em lote
**Status:** Novo.

**Descrição:** Mesmo princípio do Card 9.5, mas a partir de um ou mais arquivos PDF, processando múltiplas OS de uma vez, com uma tela de revisão em lote (uma linha por OS extraída) antes da confirmação final.

**Critérios de aceite:**
- Falha de extração em uma OS do lote não impede a revisão/confirmação das demais.
- Cada OS confirmada no lote passa pela mesma revisão humana do Card 9.5 antes de ser salva.
