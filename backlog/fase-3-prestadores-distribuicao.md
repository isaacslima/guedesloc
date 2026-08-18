# Fase 3 — Prestadores, Cobertura e Distribuição

> **Objetivo:** Evoluir o cadastro estático de prestadores (`src/views/PrestadoresView.vue`) para suportar cobertura geográfica com prioridade de cascata, e entregar uma tela de distribuição manual — pré-requisito direto da distribuição automática da Fase 5.

---

## Módulos & Epics Inclusos

- **Epic 10 (novo):** Prestadores, Cobertura e Distribuição

---

## Cards da Fase 3

### Card 10.1 — Extensão do cadastro de prestadores
**Status:** Novo (evolução de `src/composables/usePrestadores.ts` / `src/views/PrestadoresView.vue` / tipo `Prestador` já existentes).

**Descrição:** Adicionar cidade, estado, região, limite de OS por dia (opcional), observação, e trocar `status: ativo/inativo` por `situação: Ativo/Pausado/Bloqueado` (pausado e bloqueado ficam fora da distribuição automática).

**Critérios de aceite:**
- Prestadores existentes migram automaticamente `ativo → Ativo`, `inativo → Bloqueado` (ou critério equivalente a validar com o time).
- Campo `especialidade` atual (hoje uma lista fixa de manutenção genérica — "Eletricista", "Mecânico" etc. — herdada de um domínio que não bate com locação de caçamba) é revisto/neutralizado.

---

### Card 10.2 — Cidades atendidas com ordem de acionamento (cascata)
**Status:** Novo.

**Descrição:** Dentro do cadastro do prestador, lista de cidades cobertas, cada uma com uma prioridade numérica ("prioridade menor é chamado primeiro na cascata"). Prestador sem nenhuma cidade cadastrada não entra em nenhum fluxo de distribuição automática (mas continua disponível pra atribuição manual).

**Critérios de aceite:**
- Reordenação de prioridade dentro de uma mesma cidade sem duplicidade de posição.
- Regra "sem cobertura = fora da automática" documentada e válida mesmo antes de a automação (Fase 5) existir — a estrutura de dado já nasce pronta pra ser consumida por ela.

---

### Card 10.3 — Tela de Distribuição (atribuição manual)
**Status:** Novo.

**Descrição:** Tela dedicada com abas "Aguardando distribuição" (OS sem prestador) e "Aguardando confirmação" (OS já atribuídas, esperando resposta — nesta fase a resposta ainda é registrada manualmente pela equipe; o canal automatizado via WhatsApp entra na Fase 4/5). Ao atribuir, o sistema sugere prestadores ordenados pela cascata de cobertura (Card 10.2) da cidade da OS.

**Critérios de aceite:**
- Toda atribuição gera entrada no `historico[]` da OS (Card 9.1).
- Sugestão de prestador respeita a ordem de prioridade cadastrada; prestadores Pausados/Bloqueados não aparecem na sugestão (mas podem ser escolhidos manualmente com aviso).

---

### Card 10.4 — Aviso de limite diário
**Status:** Novo.

**Descrição:** Ao atribuir manualmente (Card 10.3) um prestador que já atingiu o limite diário configurado (Card 10.1), o sistema exibe aviso — não bloqueia, é indicativo, decisão final é humana nesta fase.

**Critérios de aceite:**
- Aviso visível antes da confirmação da atribuição.
- Não impede a atribuição.
