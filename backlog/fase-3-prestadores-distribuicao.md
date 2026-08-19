# Fase 3 — Prestadores, Cobertura e Distribuição

> **Objetivo:** Evoluir o cadastro estático de prestadores (`src/views/PrestadoresView.vue`) para suportar cobertura geográfica com prioridade de cascata, e entregar uma tela de distribuição manual — pré-requisito direto da distribuição automática da Fase 5.

---

## Módulos & Epics Inclusos

- **Epic 10 (novo):** Prestadores, Cobertura e Distribuição

---

## Cards da Fase 3

### Card 10.1 — Extensão do cadastro de prestadores
**Status:** ✅ Concluído (evolução de `src/composables/usePrestadores.ts` / `src/views/PrestadoresView.vue` / tipo `Prestador` em `src/types/index.ts`).

**Descrição:** Adicionar cidade, estado, região, limite de OS por dia (opcional), observação, e trocar `status: ativo/inativo` por `situação: Ativo/Pausado/Bloqueado` (pausado e bloqueado ficam fora da distribuição automática).

**Critérios de aceite:**
- Prestadores existentes migram automaticamente `ativo → Ativo`, `inativo → Bloqueado` (ou critério equivalente a validar com o time). ✅ Migração leve feita na leitura (`usePrestadores.ts`), sem precisar de script — não havia nenhum prestador cadastrado em produção até o momento, então não houve dado real pra migrar de fato.
- Campo `especialidade` atual (hoje uma lista fixa de manutenção genérica — "Eletricista", "Mecânico" etc. — herdada de um domínio que não bate com locação de caçamba) é revisto/neutralizado. ✅ Virou campo de texto livre opcional ("Observação de especialidade"), sem dropdown fixo.

---

### Card 10.2 — Cidades atendidas com ordem de acionamento (cascata)
**Status:** ✅ Concluído.

**Descrição:** Dentro do cadastro do prestador, lista de cidades cobertas, cada uma com uma prioridade numérica ("prioridade menor é chamado primeiro na cascata"). Prestador sem nenhuma cidade cadastrada não entra em nenhum fluxo de distribuição automática (mas continua disponível pra atribuição manual).

**Critérios de aceite:**
- Reordenação de prioridade dentro de uma mesma cidade sem duplicidade de posição. ✅ Botões ▲/▼ no cadastro do prestador trocam a prioridade entre duas cidades adjacentes.
- Regra "sem cobertura = fora da automática" documentada e válida mesmo antes de a automação (Fase 5) existir — a estrutura de dado já nasce pronta pra ser consumida por ela. ✅
- ⚠️ Gap conhecido: a comparação de cidade hoje é por texto exato (case-insensitive) contra `cliente.endereco.cidade` da OS — e esse campo só é preenchido pra OS manuais (a partir da cidade cadastrada no Cliente vinculado). OS integradas (as 84 migradas da Tempo Assist) não têm `endereco.cidade` estruturado ainda (só `endereco.texto`, ver gap já registrado no Card 9.1) — então a sugestão por cobertura não funciona pra elas até uma integração passar a enviar endereço estruturado.

---

### Card 10.3 — Tela de Distribuição (atribuição manual)
**Status:** ✅ Concluído — `src/views/DistribuicaoView.vue`, rota `/distribuicao`.

**Descrição:** Tela dedicada com abas "Aguardando distribuição" (OS sem prestador) e "Aguardando confirmação" (OS já atribuídas, esperando resposta — nesta fase a resposta ainda é registrada manualmente pela equipe; o canal automatizado via WhatsApp entra na Fase 4/5). Ao atribuir, o sistema sugere prestadores ordenados pela cascata de cobertura (Card 10.2) da cidade da OS.

**Critérios de aceite:**
- Toda atribuição gera entrada no `historico[]` da OS (Card 9.1). ✅ `atribuirPrestador()`/`registrarRespostaDistribuicao()` em `src/composables/useOrdens.ts`.
- Sugestão de prestador respeita a ordem de prioridade cadastrada; prestadores Pausados/Bloqueados não aparecem na sugestão (mas podem ser escolhidos manualmente com aviso). ✅ Sugestão filtra só `situacao === 'ativo'`; sem cobertura conhecida pra cidade, cai no fallback "todos os ativos" com aviso visível (ver gap do Card 10.2).
- Testado de ponta a ponta nesta sessão: atribuição move a OS de "Aguardando distribuição" pra "Aguardando confirmação"; "Confirmar aceite" avança pra `confirmada_aguardando_dia` (some das duas abas, correto — essa etapa já não é nenhuma das duas); "Recusou, redistribuir" volta pra `aguardando_distribuicao` e limpa o prestador.

---

### Card 10.4 — Aviso de limite diário
**Status:** ✅ Concluído.

**Descrição:** Ao atribuir manualmente (Card 10.3) um prestador que já atingiu o limite diário configurado (Card 10.1), o sistema exibe aviso — não bloqueia, é indicativo, decisão final é humana nesta fase.

**Critérios de aceite:**
- Aviso visível antes da confirmação da atribuição. ✅ Conta OS já atribuídas ao prestador selecionado com o mesmo `datas.agendamento` (mesmo dia), excluindo etapas `cancelada`/`finalizada`.
- Não impede a atribuição. ✅

---

### Card 10.5 — Importação de contatos do Google (prestadores)
**Status:** ❌ Bloqueado — depende de projeto Google Cloud + credencial OAuth, nenhum dos dois existe ainda no projeto (mesmo padrão de bloqueio do Card 5.1/Z-API na Fase 4).

**Descrição:** Hoje os contatos de prestador do cliente estão concentrados na agenda telefônica pessoal dele (conta Gmail), não no cadastro da plataforma. Este card resolve a busca/importação desses contatos pra dentro de Prestadores — decisão explícita do cliente (via 3 perguntas de escopo, respondidas nesta sessão):
- **Direção:** só importação (Google → plataforma) nesta primeira etapa. O pedido original também mencionava "refletir na conta do Gmail" prestadores novos criados na plataforma (ou seja, o caminho inverso, plataforma → Google) — isso fica deliberadamente fora do escopo deste card, documentado abaixo como próxima etapa natural, não perdido.
- **Conta Google:** a conta pessoal de quem hoje administra os prestadores (não uma conta corporativa compartilhada) — a autorização OAuth é feita uma vez, por essa pessoa, e o backend guarda o token dela pra fazer as buscas.
- **Credencial:** nada configurado ainda (sem projeto Google Cloud, sem People API habilitada, sem OAuth client) — a ser criado do zero.

**Abordagem técnica (pra quando for desbloqueado):**
1. **Autenticação (uma vez):** tela "Conectar Google" (provavelmente dentro de Prestadores ou em Integrações) — fluxo OAuth2 padrão (`googleapis` no backend), escopo `contacts.readonly`. O backend troca o `code` pelo `refresh_token` e guarda (mesmo padrão de segredo usado hoje pra `ZAPI_TOKEN`/`SENTRY_DSN` — variável de ambiente/Secret Manager, nunca no front).
2. **Busca:** endpoint no Gateway chamando `people.people.connections.list` (People API), trazendo nome, telefone(s) e e-mail de cada contato da agenda conectada.
3. **Revisão antes de importar (obrigatório, não é auto-import):** a agenda pessoal de alguém tem familiares, amigos, outros contatos que não são prestadores — a tela mostra a lista trazida do Google com checkbox, a pessoa marca quais são prestadores de verdade, e só os marcados viram registros em `prestadores`. Sem isso, o cadastro de prestadores fica poluído com lixo.
4. **Deduplicação:** ao importar, compara telefone (normalizado, só dígitos) contra prestadores já cadastrados — evita duplicar quem já existe; permite reimportar sem medo de duplicidade.
5. **Prestador importado nasce sem cobertura/regra de repasse:** o Google não tem essa informação — cidades atendidas (Card 10.2) e regra de repasse (Fase 7, Card 6.1) continuam precisando ser preenchidas manualmente depois da importação.

**Próxima etapa natural (fora do escopo deste card, registrar quando chegar a hora):** exportação — todo prestador novo criado na plataforma (manual ou importado) vira automaticamente um contato na mesma conta Google, usando `people.people.createContact` e guardando o `resourceName` retornado no próprio documento do prestador pra permitir atualização depois. Isso completa o pedido original ("refletir na conta do Gmail"), mas é deliberadamente sequenciado depois da importação — a importação sozinha já resolve a dor mais urgente (contatos espalhados fora do sistema) e é mais simples de entregar primeiro.

**Como desbloquear:**
1. Criar um projeto no Google Cloud Console (dá pra reaproveitar o mesmo projeto que já existe pro Firebase, já que Firebase roda sobre GCP — evita criar um projeto novo do zero).
2. Habilitar a **People API** nesse projeto.
3. Configurar a tela de consentimento OAuth. Em modo "Teste", adicionar o e-mail da conta Google que vai ser conectada como usuário de teste — funciona sem passar pela verificação do Google, mas os tokens emitidos nesse modo precisam ser renovados periodicamente (reautorizar de tempos em tempos). Publicar em modo "Produção" com o escopo `contacts.readonly` (escopo sensível) exige verificação do Google — processo que pede política de privacidade publicada, site institucional, e pode levar dias/semanas; não é bloqueante pro uso inicial (modo Teste já viabiliza validar a integração), só vira relevante se o uso crescer além de reautorizações manuais ocasionais.
4. Criar as credenciais OAuth 2.0 (client ID + client secret) e configurar no `backend/.env` (mesmo padrão dos demais segredos do projeto).
5. A partir daí, implementar o fluxo descrito acima (conectar → buscar → revisar/selecionar → importar com deduplicação) e testar de ponta a ponta com a conta real antes de considerar o card concluído.

---

## Como testar (o que já está entregue — Cards 10.1 a 10.4)

1. Abrir **Prestadores** e cadastrar um prestador novo: nome, cidade, situação "Ativo", e pelo menos uma cidade em **"Cidades atendidas"** (a mesma cidade de alguma OS — hoje só funciona pra OS manuais, ver gap do Card 10.2).
2. Reordenar duas cidades atendidas com os botões ▲/▼ e confirmar que a prioridade (#1, #2...) muda junto.
3. Salvar e conferir que o prestador aparece na listagem com a coluna "Cobertura" mostrando a quantidade de cidades.
4. Abrir **Distribuição** — aba "Aguardando distribuição" deve listar as OS sem prestador (mesma contagem das OS "abertas" na tela de Ordens de Serviço).
5. Escolher um prestador no seletor de uma OS e clicar **"Atribuir"** — a OS deve sumir dessa aba e aparecer em **"Aguardando confirmação"**.
6. Na aba "Aguardando confirmação", clicar **"Confirmar aceite"** — a OS sai da lista (avançou de etapa, fora do escopo visual desta fase). Testar também **"Recusou, redistribuir"** em outra OS — ela deve voltar pra "Aguardando distribuição", sem prestador.
7. Criar uma OS manual pra um cliente com cidade cadastrada igual à de um prestador — na Distribuição, esse prestador deve aparecer sugerido com a prioridade certa, sem o aviso amarelo de "cidade não informada".

**Fora do escopo desta fase:** distribuição automática de verdade (isso é Central de Automações, Fase 5), confirmação por WhatsApp (Fase 4) — hoje é tudo manual.
