# Guedesloc — instruções do projeto

## Estrutura

- `src/` — frontend Vue 3 + TypeScript (dashboard interno, autenticado via Firebase Auth). Layout/identidade visual em `src/components/layout/DashboardLayout.vue` + `src/components/ui/`.
- `backend/` — Gateway de orquestração (Express), único ponto de escrita de OS integradas no Firestore.
- `integracoes/juvo/` — RPA (Playwright) da integração piloto com a Tempo Assist.
- `Backlog.md` + `backlog/fase-0-fundacao.md` … `fase-10-maturidade.md` — roadmap do projeto, fonte de verdade do que já foi feito, o que está em andamento, e o que falta, por Epic/Card. `backlog/README.md` tem o mapa de dependências entre fases e a restrição de identidade visual (Card 0).
- `src/data/roadmap.ts` — tradução executiva do backlog pra tela `/roadmap` do produto (visão por fase, sem Epic/Card), mostrada ao cliente pelo time.
- O front chama o Gateway direto (não só lê Firestore) desde a Fase 4 — `src/lib/gateway.ts` autentica com ID token do Firebase, validado no Gateway por `firebaseAuthMiddleware` (`backend/src/middleware/auth.ts`). CORS liberado só pra `FRONTEND_ORIGIN`. Usar esse padrão pra qualquer chamada nova do front ao Gateway (não inventar outro mecanismo de auth).

## Metodologia de execução do roadmap

- Trabalhar **fase a fase, na ordem do roadmap** (`backlog/README.md` tem o porquê de cada ordem — normalmente dependência real entre fases, não capricho).
- Dentro de cada fase, implementar os cards que não têm dependência pendente. Se um card esbarrar numa interdependência ainda não resolvida (precisa de uma credencial que não existe, depende de uma decisão de produto ainda em aberto, ou depende de um card de outra fase ainda não feito), **pular esse card específico** em vez de travar a fase inteira nele.
- Todo card pulado por dependência tem que ser **documentado no próprio arquivo de fase** (`backlog/fase-N-*.md`), com uma nota clara do motivo (ex.: "Bloqueado — depende de decisão de provedor de IA/LLM, sem credencial configurada ainda"). Nunca deixar um card incompleto sem explicação por perto. Todo card marcado "❌ Bloqueado" também entra no array `pendencias` da fase correspondente em `src/data/roadmap.ts` (item, motivo, próximo passo) — pra aparecer visível na tela `/roadmap`, não só no `.md` técnico. Quando o bloqueio for resolvido, remover a entrada de `pendencias` (e atualizar o `Status` do card no `.md`).
- **Integrações com seguradoras (Epic 2 — spikes de descoberta + adapter por seguradora, nas Fases 1 e 9) são o esforço mais custoso do roadmap.** Não deixar esse tipo de card represar o avanço das demais fases — o objetivo é progredir em largura pelo roadmap (entregar o que dá em cada fase) em vez de esgotar profundidade numa fase de integração antes de seguir adiante.
- Ao concluir ou avançar cards de uma fase, atualizar o `Status` de cada card no `.md` correspondente (✅ concluído / ⚠️ parcial / ❌ bloqueado + motivo) — o backlog é a fonte de verdade do progresso.
- Ao entregar algo testável numa fase (mesmo que a fase não esteja 100% concluída), documentar uma seção **"Como testar"** no `.md` da fase — passo a passo, sem jargão técnico, que qualquer pessoa (inclusive o cliente) consiga seguir na aplicação de verdade — e espelhar esses passos no campo `comoTestar` da fase correspondente em `src/data/roadmap.ts`, pra aparecer expansível na tela `/roadmap`.
- Migração/alteração de dado em produção (Firestore com dado real) sempre roda em modo dry-run primeiro, com relatório revisado antes de qualquer escrita real — nunca aplicar direto.

## Identidade visual (restrição permanente, vale pra toda fase)

- Toda tela nova é montada dentro de `DashboardLayout.vue`, usando os componentes de `src/components/ui/` — sidebar escura + dourado/âmbar (`--primary`), badges de status na paleta semântica já usada (âmbar/azul/esmeralda/vermelho, estendida quando necessário).
- Nenhum protótipo de referência de cliente (visual/UX) é copiado na aparência — só usado como referência funcional.

## Rastreamento de erros (Sentry)

- Os três serviços (`src/` front, `backend/`, `integracoes/juvo/`) têm Sentry instalado, mas **desligado por padrão** — só ativa se a variável `SENTRY_DSN` (backend/RPA) ou `VITE_SENTRY_DSN` (front) estiver preenchida. Sem DSN, `Sentry.init` nunca roda: zero custo, zero chamada de rede, comportamento idêntico a antes do Sentry existir no projeto.
- Pra ativar de verdade: criar um projeto em [sentry.io](https://sentry.io) por serviço (ou um projeto único cobrindo os três, como preferirem) e colar o DSN no `.env` correspondente (`​.env` na raiz pro front, `backend/.env`, `integracoes/juvo/.env`).
- Toda chamada de `logger.error(...)` (backend e RPA) também vira uma issue no Sentry automaticamente (`backend/src/services/logger.ts` e `integracoes/juvo/src/logger.ts`) — não precisa chamar o Sentry à parte pra cada erro já logado. Só usar `Sentry.captureException(err)` direto quando quiser preservar o stack trace completo de uma exceção específica (ver `integracoes/juvo/src/index.ts`, catch fatal).
- Front-end captura automaticamente qualquer erro não tratado do Vue via `Sentry.init({ app, ... })` em `src/lib/sentry.ts` — nada a fazer manualmente pra isso.
