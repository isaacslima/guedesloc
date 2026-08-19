# Fase 8 — Governança, Acesso e Relatórios

> **Objetivo:** Fechar os módulos de RBAC, auditoria de negócio e relatórios do produto. Posicionada após o núcleo operacional e financeiro porque hoje o sistema roda com um único perfil de usuário (qualquer autenticado vê tudo) e isso não bloqueia nenhuma das fases anteriores — mas não pode ficar de fora do produto final, e faz mais sentido desenhar permissões quando já se sabe quais telas/módulos existem (Fases 2-7).

---

## Módulos & Epics Inclusos

- **Epic 14 (novo):** Governança, Acesso e Relatórios

---

## Cards da Fase 8

### Card 14.1 — Papéis e permissões (RBAC)
**Status:** ✅ Concluído — 4 perfis (Super Admin, Operação, Financeiro, Leitura), mapeamento de módulos por perfil em `src/lib/permissoes.ts`. Bootstrap automático: o primeiro login que a plataforma vê nasce Super Admin (via doc sentinela `sistema/bootstrap`, protegido por transação — ver bug corrigido abaixo); os demais nascem Leitura até um Super Admin promover. Tela **"Usuários e Permissões"** (`/usuarios`) lista todo mundo, permite trocar perfil/ativar/desativar, e criar novos usuários (`POST /api/v1/usuarios` no Gateway, via Admin SDK — só o backend consegue criar conta Firebase Auth de terceiro; checagem "só Super Admin cria" no próprio backend).
Testado ao vivo de ponta a ponta: bootstrap (primeiro login virou Super Admin), criação de usuário com perfil Leitura, login como esse usuário mostrando só os módulos permitidos na sidebar, tentativa de navegação direta por URL pra `/usuarios`/`/precos`/`/prestadores`/`/configuracoes` bloqueada e redirecionada — dois níveis de proteção (sidebar esconde o link, guard de rota bloqueia a URL direta mesmo assim).
**Bug real encontrado e corrigido durante o teste:** o bootstrap original chamava `garantirUsuarioDoc` de dois lugares (guard de rota E do composable reativo `useUsuarioAtual`) sem transação — dois chamadores concorrentes no primeiro login faziam o segundo `setDoc` sobrescrever o primeiro, derrubando o Super Admin recém-criado pra Leitura. Corrigido: só o guard de rota cria o doc agora, dentro de uma transação Firestore com doc sentinela (`sistema/bootstrap`), à prova de logins simultâneos em múltiplas abas.

**Critérios de aceite:**
- RBAC é aditivo: nenhuma tela das Fases 2-7 fica bloqueada até este card existir — decisão consciente pra não travar entregas anteriores esperando este módulo. ✅
- Ao entrar em vigor, usuário sem permissão não vê o módulo correspondente na navegação. ✅ Validado ao vivo (ver acima).

**⚠️ Gap importante de infraestrutura (não é um gap de código):** as regras de segurança do Firestore (`firestore.rules`) que restringem escrita de `perfil`/`ativo` em `usuarios/{uid}` a Super Admin **não puderam ser publicadas nesta sessão** — o Firebase CLI está autenticado com uma conta Google sem acesso ao projeto `guedesloc`, e a chave de service account do backend não tem a permissão de IAM necessária pra publicar regras (só tem acesso de dado, via Admin SDK). Isso significa que, hoje, a proteção contra autopromoção (um usuário comum se tornando Super Admin direto via chamada ao Firestore, ignorando a interface) **existe só no arquivo do repositório, não em produção** — na prática, continua valendo a regra de fallback antiga (`allow read, write: if isAuthenticated()`), que já cobria (e ainda cobre) todas as coleções novas desta fase e das fases anteriores (Fase 5, 6, 7) do mesmo jeito, sem diferença de comportamento observável em nenhum teste desta sessão.

---

### Card 14.2 — "Equipe agora"
**Status:** ✅ Concluído — widget no Dashboard (`src/composables/usePresenca.ts`, coleção `presenca`). Cada sessão logada envia um heartbeat a cada 30s (`App.vue`, sobrevive à troca de rota — não reinicia a cada navegação); "online" = heartbeat nos últimos 2 minutos. Testado ao vivo com múltiplos usuários logados simultaneamente em abas diferentes — o widget atualizou corretamente conforme cada sessão pingava.
**Simplificação consciente:** não é presença "real" no sentido de detectar fechamento de aba instantaneamente (isso exigiria Firebase Realtime Database com `onDisconnect`, um produto Firebase à parte do Firestore) — é heartbeat por polling, com até 2 minutos de atraso pra marcar alguém como offline depois que a aba fecha. Suficiente pro caso de uso ("quem tá ativo agora"), não pretende ser um chat-style presence exato.

---

### Card 14.3 — Auditoria de ações da equipe (UI de negócio)
**Status:** ✅ Concluído — `src/views/AuditoriaView.vue` (`/auditoria`), coleção `auditoria` (`src/composables/useAuditoria.ts`) + `historico[]` de cada OS, fundidos numa única lista buscável/filtrável por tipo. **Relaciona-se com o Card 8.3 (Fase 10)**, mas é uma camada diferente: aqui é a UI de negócio; o Card 8.3 formaliza o log imutável de infraestrutura/LGPD.
Pontos instrumentados nesta fase: login (`LoginView.vue`), envio manual de WhatsApp (`WhatsAppView.vue`), edição de OS (`useOrdens.ts::updateOrdem`). Mudança de etapa com motivo (atribuição de prestador, mover no Kanban, confirmação de entrega/retirada) já vivia em `historico[]` desde a Fase 2 — não duplicado, só fundido na consulta desta tela.
Testado ao vivo: login gerou entrada buscável por e-mail; a fusão com `historico[]` mostrou corretamente até registros reais antigos (migração da Fase 2, Card 9.2); busca por texto filtrou corretamente.

**Critérios de aceite:**
- Toda ação relevante das Fases 2-7 (mudança de etapa, atribuição, edição de OS, envio manual de WhatsApp) aparece aqui, buscável. ✅
**Não instrumentado ainda:** criação/alteração de usuário (`usuario_criado`/`usuario_alterado` já existem como tipos no modelo, mas nenhum call site grava essas entradas ainda) — próximo passo direto se fizer falta, mesmo padrão dos outros pontos.

---

### Card 14.4 — Relatórios: Resumo mensal
**Status:** ✅ Concluído — `src/views/RelatorioMensalView.vue` (`/relatorios`), filtro por período, três blocos (por seguradora: qtd./faturado/recebido, reaproveitando `recebiveis` da Fase 7; por cidade: volume de OS criadas no período; por prestador: qtd./repasse devido, reaproveitando `repasses` da Fase 7) + excedente de tempo (reaproveita `calcularSlaRetirada` da Fase 6 — mesma definição de "excedente" já usada em Pendências/Retiradas, não uma nova métrica inventada). Exportação CSV. Testado ao vivo contra dado real (84 OS) — renderizou corretamente com os totais reais (0 finalizadas, então financeiro zerado; volume por cidade mostrou o gap conhecido de "Sem cidade" nas OS integradas sem endereço estruturado, mesmo gap documentado desde o Card 10.2).

---

### Card 14.5 — Conferência de OS
**Status:** ✅ Concluído — `src/views/ConferenciaOSView.vue` (`/conferencia`). Cola-se texto livre (uma OS por linha, cidade opcional depois de vírgula/tab/ponto-e-vírgula), compara contra `numero`/`numeroOsSeguradora` de cada OS cadastrada. Testado ao vivo: número real encontrado corretamente, número inventado sinalizado como faltando.

**Critérios de aceite:**
- Nenhuma ação de escrita disparada por esta tela, em nenhuma circunstância. ✅ Nenhum import de `addDoc`/`updateDoc`/`deleteDoc`/`setDoc` no arquivo — garantia estrutural, não só de comportamento observado.

---

### Card 14.6 — Arquivo/histórico
**Status:** ⚠️ Parcial — `src/views/ArquivoView.vue` (`/arquivo`): lista OS finalizadas/canceladas, busca por número/cliente/cidade, filtro por etapa, mostra o motivo final registrado em `historico[]`. Testado ao vivo com OS de teste (criada e depois apagada via Zona de Perigo, Card 14.7 — o ciclo completo funcionou).
**Não implementado:** "anexos preservados" — não existe, em nenhuma tela do sistema hoje (não só aqui), nenhuma captura de anexo (foto de entrega, comprovante). Não é um gap desta tela especificamente, é um recurso que nunca foi construído em lugar nenhum ainda; quando existir, aparece aqui automaticamente junto do histórico, sem mudança nesta tela.

---

### Card 14.7 — Configurações gerais
**Status:** ✅ Concluído — `src/views/ConfiguracoesView.vue` (`/configuracoes`). Dados da conta (nome/e-mail/perfil), atalhos pra Central de Automações, Diagnóstico de WhatsApp e Usuários e Permissões. Zona de Perigo só visível/utilizável por Super Admin (checagem na própria tela, além do RBAC de rota do Card 14.1), com 3 modos (OS específica / por período / todas), preview do impacto (quantidade exata antes de apagar) e confirmação por frase digitada (`EXCLUIR N OS`, com N sendo a contagem real — não dá pra confirmar sem saber o número certo).
Testado ao vivo de ponta a ponta no modo "OS específica": botão de apagar veio desabilitado sem a frase de confirmação correta, habilitou só com a frase exata, apagou a OS de teste (e só ela — confirmado direto no Firestore depois). Modos "por período" e "todas" usam exatamente o mesmo caminho de código (mesma função `executarExclusao`, só muda o filtro que popula `osParaApagar`) — não testados individualmente ao vivo por segurança (evitar qualquer risco, ainda que teórico, de atingir as 84 OS reais do cliente durante o teste).

**Critérios de aceite:**
- Zona de perigo nunca afeta prestadores, usuários, permissões ou auditoria — só OS. ✅ Só a coleção `ordens` é tocada pelo código; nenhum import de escrita pra outras coleções nesta tela.
- Ação de apagar exige confirmação explícita com resumo do impacto (quantidade de OS afetadas) antes de executar. ✅ Testado (ver acima).
**Nota:** apagar uma OS não remove em cascata os `recebiveis`/`repasses` gerados a partir dela (Fase 7) — ficam órfãos, referenciando uma OS que não existe mais. Avisado na própria tela; não expandido pra não violar o critério "só afeta OS".

---

## Como testar

1. Abra **Usuários e Permissões** — o primeiro login que o sistema vê já aparece como Super Admin (bootstrap automático). Clique **"+ Novo usuário"**, crie um com perfil "Leitura", copie a senha temporária mostrada (só aparece essa vez).
2. Faça login com esse novo usuário (aba anônima ou depois de sair) — repare que a barra lateral mostra só Dashboard, Ordens, Central de OS, Entregas, Retiradas, Pendências e Roadmap. Tente digitar a URL de uma tela restrita direto (ex.: `/usuarios`, `/precos`) — o sistema redireciona de volta pro início.
3. No Dashboard, veja o quadro **"Equipe agora"** — mostra quem está logado nos últimos 2 minutos.
4. Abra **Auditoria** — veja os logins registrados, use a busca por nome/OS/descrição, filtre por tipo de ação.
5. Abra **Relatório Mensal** — ajuste o período e veja os totais por seguradora/cidade/prestador, e o card de excedente de tempo. Exporte o CSV.
6. Abra **Conferência de OS**, cole alguns números de OS reais (um por linha) misturados com números inventados, clique **"Conferir"** — confira que os reais aparecem como "Encontrada" e os inventados como "Faltando".
7. Abra **Arquivo** — veja as OS finalizadas/canceladas, com busca e filtro.
8. Abra **Configurações** (só visível pra Super Admin) — veja seus dados de conta, os atalhos, e a **Zona de Perigo**: escolha "OS específica", digite um número, veja a contagem de impacto aparecer, e repare que o botão de apagar só habilita depois de digitar a frase de confirmação exata mostrada na tela.
