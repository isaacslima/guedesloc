# Fase 2 — Unificação do Modelo de OS & Criação Assistida

> **Objetivo:** Eliminar a divergência entre `OrdemDeServico` (manual, coleção `ordens`) e `OrdemDeServicoCanonica` (integrada, coleção `ordens_integradas`, somente leitura) antes de construir qualquer coisa nova em cima delas — kanban, distribuição, WhatsApp. Toda OS, venha de seguradora via API/RPA, criada manualmente, ou colada via IA, passa a ser uma única entidade fluindo pelo mesmo pipeline. Esta fase também entrega a "Nova assistência" (colar texto/PDF + extração assistida), por ser mais um modo de criação da mesma entidade unificada.

---

## Módulos & Epics Inclusos

- **Epic 9 (Parte 1):** Modelo Unificado de OS & Criação Assistida

---

## Cards da Fase 2

### Card 9.1 — Schema único de Ordem de Serviço
**Status:** ✅ Concluído — `src/types/ordem.ts` (`OrdemUnificada`, `OSOrigem`, `OSEtapa`, `HistoricoEntradaOS`, `EnderecoOS`). `OrdemDeServico` (`src/types/index.ts`) e `OrdemDeServicoCanonica` (`src/types/integracao.ts`) removidos. Etapa derivada de status por `src/lib/etapaOS.ts` (front) / `backend/src/services/etapaOS.ts` (Gateway) — heurística simples (aberta→aguardando_distribuicao, em_andamento→aguardando_entrega, concluida→finalizada, cancelada→cancelada), a ser refinada quando a Fase 5 tiver distribuição/confirmação reais. Endereço estruturado (`EnderecoOS`) só tem `texto` preenchido hoje — os campos separados (logradouro/bairro/etc.) ficam vazios até uma integração passar a enviá-los split (o RPA da Tempo Assist já os extrai em `integracoes/juvo/src/canonico.ts::formatarEndereco` antes de juntar tudo numa string — dá pra aproveitar depois sem re-trabalho).

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
**Status:** ✅ Concluído — `backend/scripts/migrar-fase2-unificacao.ts` (dry-run por padrão, `--aplicar` pra gravar de verdade; idempotente, pode rodar de novo sem duplicar). Rodado em produção: 84 de 84 OS de `ordens_integradas` migradas pra `ordens` sem nenhum problema reportado; 0 OS manuais existiam nesse ambiente até o momento. `ordens_integradas` não foi apagada — vira snapshot histórico congelado (ver nota em `firestore.rules`).

**Descrição:** Script (dry-run primeiro) que migra os documentos das coleções `ordens` e `ordens_integradas` pra coleção única, mapeando o `status` antigo pra uma `etapa` inicial coerente (ex.: `concluida` → `Finalizada`; `aberta` sem prestador → `Aguardando distribuição`).

**Critérios de aceite:**
- Nenhuma OS perdida na migração (contagem antes/depois bate).
- Execução em modo dry-run gera relatório de divergências antes da migração real.
- IDs/idempotencyKeys preservados onde aplicável, pra não quebrar reprocessamento do RPA.

---

### Card 9.3 — Atualização do Gateway para o modelo unificado
**Status:** ⚠️ Parcial (extensão dos Cards 3.1/1.2 da Fase 0).

**Descrição:** `POST /api/v1/os/ingest` passa a gravar na coleção única, preenchendo `origem` e uma `etapa` inicial padrão. Avaliar aqui endpoints novos de leitura/atualização de etapa, resolvendo o gap identificado no Card 3.1 (front lê Firestore direto, não passa pelo Gateway).

**Critérios de aceite:**
- RPA piloto (Fase 1) continua funcionando sem alteração de payload enviado. ✅ — o "contrato de entrada" (wire format validado por `src/lib/osValidator.ts::PayloadIngestaoOS`) não mudou; o Gateway (`backend/src/index.ts`) que adapta payload → `OrdemUnificada` na escrita, lendo o doc existente primeiro pra encadear `historico[]` corretamente em reenvios/atualizações.
- Validação de payload atualizada para o novo schema (Card 9.1). ✅ pro formato de entrada (`osValidator.ts` migrado do nome antigo `OrdemDeServicoCanonica` pro tipo local `PayloadIngestaoOS`, mesma lógica de validação).
- ⚠️ Pendente: `origem` é gravado fixo como `integrada_rpa` (não há lookup de `integradoras.tipoIntegracao` pra decidir `integrada_api` vs `integrada_rpa`) — sem problema hoje porque só a Tempo Assist (RPA) está em produção, mas precisa de ajuste quando o primeiro adapter de API real entrar (Card 2.1). Endpoints novos de leitura/atualização de etapa pelo Gateway (resolvendo o front ler Firestore direto) não foram criados nesta rodada — front continua lendo via SDK/`onSnapshot`.

---

### Card 9.4 — Tela única "Central de OS" (versão lista, sem kanban ainda)
**Status:** ✅ Concluído.

**Descrição:** Unificar `src/views/OrdensView.vue` e `src/views/OrdensIntegradasView.vue` numa única tela, reaproveitando os componentes visuais existentes (badges, tabela `@tanstack/vue-table`). OS manuais continuam editáveis via CRUD; OS integradas continuam somente leitura nos campos vindos da seguradora, mas passam a compartilhar a mesma listagem, filtros e badges de status que as manuais. O kanban entra só na Fase 5 — aqui é fundação de dado + lista.

**Critérios de aceite:**
- Uma única tela substitui as duas telas atuais. ✅ `src/views/OrdensView.vue` (rota `/os`) absorveu a listagem, filtros, painel de detalhe somente-leitura e o botão de WhatsApp de teste que estavam em `OrdensIntegradasView.vue` (removida, junto com `useOrdensIntegradas.ts` e a rota `/os-integradas`).
- Filtro por `origem` (manual/integrada_api/integrada_rpa/colada_ia/pdf_lote) disponível. ✅ Simplificado na UI pra duas opções (Manual / Integrada), já que hoje só existem essas duas origens em uso.
- Identidade visual preservada (ver Card 0 em `backlog/README.md`). ✅
- Bônus não previsto no card original: o Dashboard (`src/views/DashboardView.vue`) usa o mesmo `useOrdens()` e passou a contar OS integradas nos totais — antes ignorava `ordens_integradas` completamente.

---

### Card 9.5 — Criação de OS assistida por texto colado
**Status:** ❌ Bloqueado — depende de decisão de produto/infra ainda não tomada: qual provedor de IA/LLM usar pra extração (nenhuma credencial configurada no projeto hoje, nem em `backend/` nem no front) e onde esse endpoint de extração vive (Gateway novo endpoint vs. serviço à parte). Pulado nesta rodada pra não travar o avanço do resto da Fase 2 e das fases seguintes (metodologia em `CLAUDE.md`) — retomar quando essa decisão for tomada. O schema (Card 9.1) já reserva `origem: 'colada_ia'` pra quando for implementado.

**Descrição:** Tela "Nova assistência" com um modo "Colar assistência": campo de texto livre onde o usuário cola a comunicação recebida da seguradora (e-mail, WhatsApp, PDF copiado etc.) em qualquer formato, e uma ação "Extrair dados" que tenta preencher automaticamente os campos da OS (número da OS, empresa/origem, seguradora/contratante, data do serviço, horário específico ou janela início/fim, cliente, telefone, endereço completo, tipo de serviço, observações). O usuário sempre revisa e pode corrigir cada campo extraído antes de confirmar — nada é salvo automaticamente sem essa revisão humana.

**Critérios de aceite:**
- Extração popula os campos do formulário de criação de OS (Card 9.1), nunca grava direto.
- Campos não reconhecidos ficam em branco e visivelmente marcados para preenchimento manual, sem erro bloqueante.
- OS criada por este fluxo recebe `origem = colada_ia` e entra no pipeline unificado normalmente.

---

### Card 9.6 — Importação de PDF em lote
**Status:** ❌ Bloqueado — mesma dependência do Card 9.5 (provedor de IA/LLM ainda não decidido), mais parsing de PDF. Pulado por consequência (a base de extração de texto do 9.5 é pré-requisito direto). O schema já reserva `origem: 'pdf_lote'`.

**Descrição:** Mesmo princípio do Card 9.5, mas a partir de um ou mais arquivos PDF, processando múltiplas OS de uma vez, com uma tela de revisão em lote (uma linha por OS extraída) antes da confirmação final.

**Critérios de aceite:**
- Falha de extração em uma OS do lote não impede a revisão/confirmação das demais.
- Cada OS confirmada no lote passa pela mesma revisão humana do Card 9.5 antes de ser salva.

---

## Como testar (o que já está entregue — Cards 9.1 a 9.4)

Roteiro pra qualquer pessoa do time (ou o cliente, acompanhado) validar o que foi entregue até aqui, sem precisar ler código. Não cobre 9.5/9.6 (bloqueados, ver acima).

1. **Login** no sistema com um usuário autorizado.
2. Abrir **Ordens de Serviço** (menu lateral) — confirmar que aparecem OS com badge de origem **"Tempo Assist"** (vindas da integração) na coluna Origem.
3. Conferir o resumo no topo ("X total · Y abertas · Z em andamento · W integradas") — o número de integradas deve bater com o que está sincronizado da Tempo Assist.
4. No filtro **"Todas as origens"**, selecionar **"Integrada (seguradora)"** — a lista deve mostrar só essas OS. Trocar pra **"Manual"** — deve sobrar só as criadas por dentro do sistema (ou nenhuma, se ainda não criaram nenhuma).
5. Clicar em **"Detalhes"** numa OS integrada — conferir que cliente, endereço, serviço, valor e datas batem com o que está no portal da seguradora.
6. Clicar em **"+ Nova OS"**, preencher e salvar uma OS manual — confirmar que ela aparece na lista com badge **"Manual"**, com botões "Editar"/"Excluir" (diferente das integradas, que só têm "Detalhes"/"WhatsApp").
7. Editar essa OS manual e depois excluí-la — confirmar que os dois funcionam.
8. Abrir o **Dashboard** (tela inicial) — o card "Ordens de Serviço" deve mostrar o mesmo total da tela de OS (antes desta fase, o Dashboard não contava as OS integradas — agora conta).
9. No topo da tela de OS, preencher um telefone em **"Telefone de teste (WhatsApp)"** e clicar **"WhatsApp"** numa OS integrada — deve abrir o WhatsApp com uma mensagem pré-pronta. **Atenção:** isso ainda é só um protótipo de teste (telefone digitado manualmente); a integração de verdade com WhatsApp é a Fase 4, ainda não entregue.
10. Abrir **Andamento do Projeto** (`/roadmap`) — confirmar que a Fase 2 aparece como "Em andamento".

**Fora do escopo desta fase** (não esperar ainda): kanban visual de etapas, distribuição pra prestador, WhatsApp automático de verdade, criação de OS colando texto/PDF.
