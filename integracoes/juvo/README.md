# Juvo Automation

Automação Playwright que loga no portal Tempo Assist (via Juvo), percorre as
abas de status de Ordens de Serviço, salva tudo no MySQL com rastreio de
mudança de status, e expõe uma fila de ações para triggers manuais (ex.:
aceitar uma OS, confirmar chegada, finalizar).

## Setup

```bash
docker compose up -d      # sobe MySQL + Adminer (http://localhost:8181)
npm install
npm run migrate           # aplica migrations/*.sql pendentes
cp .env.example .env      # preencher credenciais
npm start                 # execução única
npm run scheduler         # execução recorrente via cron (CRON_SCHEDULE)
npm run viewer            # tela de visualização em http://localhost:3000
```

## Arquitetura

- `src/scraper.ts` — login, navegação até a tela de Ordens de Serviço,
  coleta de cada aba (`src/config.ts::carregarAbas()`), e no fim processa a
  fila de ações pendente.
- `src/config.ts` — carrega abas/colunas das tabelas `aba_config`/`aba_coluna`
  (parametrizável: adicionar/ajustar aba é INSERT no banco, não deploy).
- `src/db.ts` — upsert de OS com histórico de transição de status
  (`ordens_servico` + `ordens_servico_historico`).
- `src/fila.ts` / `src/acoes.ts` — fila de ações (`fila_acoes`) e o
  consumidor que executa cada `tipo_acao` via Playwright.
- `src/enfileirar.ts` — CLI para publicar uma ação manualmente:
  `npm run enfileirar -- "<numeroOs>" <tipoAcao> ['{"payload":"..."}']`
- `src/viewer.ts` — tela HTML simples para ver as OS coletadas, o detalhe de
  cada uma (dados + histórico de status) e a fila de ações.
- `src/migrate.ts` + `migrations/*.sql` — runner de migração (idempotente via
  tabela `schema_migrations`).

## Abas monitoradas (`aba_config`)

| ordem | nome                                   | status de mapeamento |
|-------|-----------------------------------------|-----------------------|
| 1     | novos                                   | colunas assumidas por analogia com reagendados (nunca confirmadas com dado real — não havia OS novo) |
| 2     | reagendados                             | colunas confirmadas com dado real |
| 3     | em_andamento_aguardando_chegada         | colunas extras (`confirmacaoChegada`, `funcionario`) — ordem estimada, não confirmada |
| 4     | em_andamento_aguardando_finalizacao     | coluna extra (`finalizar`) — ordem estimada, não confirmada |
| 5     | agendados                               | confirmado com dado real, exceto `confirmacaoChegada` que aparece desabilitado nessa aba |
| 6     | cancelados                              | só colunas base cadastradas — não há nenhum cancelado no momento para confirmar se existe `aceite` ou outra coluna extra |

Colunas de cada aba: ver `aba_coluna` (`nome_campo`, `ordem`, `clicavel`,
`tipo_acao`). O scraper avisa no console (`esperava N colunas, encontrou M`)
sempre que uma linha real não bate com o que está cadastrado — é o sinal pra
corrigir a linha em `aba_coluna`.

## Próximos passos / pendências

- [ ] Confirmar a ordem real das colunas extras de `em_andamento_aguardando_chegada`
      (`confirmacaoChegada`, `funcionario`) e `em_andamento_aguardando_finalizacao`
      (`finalizar`) assim que houver OS real nessas abas — hoje é uma estimativa.
- [ ] Confirmar as colunas de `novos` com um caso real (nunca houve item pra inspecionar).
- [ ] Confirmar se `cancelados` tem coluna `aceite` (ou outra) — sem item real até agora.
      Quando aparecer um cancelado, conferir `debug/aba-cancelados-*.html` ou o aviso
      de contagem de colunas no console.
- [ ] Mapear os cliques reais dos botões de ação em `src/acoes.ts` (`EXECUTORES`):
      `aceite`, `finalizar`, `atualizar_confirmacao_chegada`, `ver_funcionario`.
      Até lá, qualquer ação enfileirada com esses tipos fica marcada `erro` em
      `fila_acoes` (mensagem "tipo de ação ainda não mapeado").
- [ ] Validar os seletores de login em `fazerLogin()` (`src/scraper.ts`) contra o DOM
      real — hoje são seletores genéricos/best-effort (`input[name="username"]`,
      `#entrar`), nunca confirmados na tela de login de verdade.
- [ ] Definir se a fila de ações precisa de um ciclo de processamento mais frequente
      que o scrape completo (hoje só roda 1x por execução do `scheduler.ts`, padrão
      2x/dia). Se o trigger manual precisar de resposta rápida, criar um
      `cron.schedule` dedicado, menor, só para `processarFilaAcoes`.
- [ ] Tela de visualização (`src/viewer.ts`) é só leitura HTML simples por ora —
      sem autenticação. Avaliar se precisa de login antes de expor fora do localhost.
