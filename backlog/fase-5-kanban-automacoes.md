# Fase 5 — Kanban Operacional Completo & Central de Automações

> **Objetivo:** Com modelo unificado (Fase 2), cobertura/distribuição manual (Fase 3) e WhatsApp bidirecional (Fase 4) prontos, entregar a tela central do produto — o Kanban de 10 etapas — e a Central de Automações, que passa a operar boa parte da distribuição e das cobranças de confirmação/foto/retirada sozinha.

---

## Módulos & Epics Inclusos

- **Epic 9 (Parte 2):** Kanban Operacional Completo
- **Epic 12 (novo):** Central de Automações

---

## Cards da Fase 5

### Card 9.7 — Kanban de 10 etapas
**Status:** ✅ Concluído — `src/views/KanbanView.vue`, rota `/kanban` (item "Central de OS" na sidebar). Colunas seguem `ETAPAS_KANBAN` (`src/lib/etapaLabels.ts`), cards mostram número/badge urgente/cidade+seguradora/prestador/data/indicador "sem resposta há Xh". Mudança manual de etapa via modal com campo motivo obrigatório (bloqueia salvar sem motivo), grava em `historico[]` e deriva `status` automaticamente (`derivarStatusDeEtapa`, `useOrdens.ts::moverEtapaManual`). Testado ao vivo no navegador.
**Não incluso:** botões "Conversa"/"Pausar" por card (a conversa já existe centralizada em `/whatsapp`, Card 11.5 — não duplicada por card aqui pra não fragmentar a inbox).

**Descrição:** Colunas: Aguardando distribuição → Distribuindo/Aguardando resposta → Confirmada/Aguardando dia → Confirmação de hoje → Aguardando entrega → Entregue/Aguardando foto → Entregue/Aguardando retirada → Finalizada, com ramificações pra Pendência e Cancelada. Cada card mostra nº OS, badge URGENTE, cidade/UF + seguradora, data, prestador, indicador "sem automação programada"/"sem resposta há Xh", botões "Conversa" (abre a thread do Card 11.5) / "Pausar", e select "Mover para..." — mudança manual de etapa exige motivo obrigatório, registrado em `historico[]` (Card 9.1).

**Critérios de aceite:**
- Paleta semântica de status atual (âmbar/azul/esmeralda/vermelho) estendida pras 10 etapas, sem introduzir paleta nova (Card 0).
- Mudança manual de etapa sem motivo preenchido é bloqueada.

---

### Card 9.8 — Modos de visualização Lista e Agenda
**Status:** ✅ Concluído — mesmo `KanbanView.vue`, toggle Kanban/Lista/Agenda no topo da tela, mesma base de dados e filtros ativos preservados ao trocar de modo.

**Descrição:** Mesma base de dados do kanban, duas visões alternativas: lista tabular (reaproveita `src/components/ui/table`) e agenda por data (agendamento/entrega/retirada).

**Critérios de aceite:**
- Trocar de modo não perde os filtros ativos.

---

### Card 9.9 — Filtros rápidos e indicadores "Precisa de atenção"
**Status:** ✅ Concluído — filtros rápidos (Minha atenção, Hoje, Amanhã, Próximos 2 dias) e indicadores clicáveis (Sem prestador, Entregas de hoje, Pendências, Retirada vencendo) no topo do Kanban, cada um alterna `filtroRapido` e filtra a lista/kanban/agenda direto.
**Parcial:** filtros avançados (Foto pendente, Automação pausada) não implementados. "Retirada vencendo" **resolvido na Fase 6** — agora usa o SLA de verdade (`src/lib/slaRetirada.ts`, prazo global configurável + exceção por OS), em vez da aproximação fixa de 5 dias usada até então.

**Descrição:** Filtros rápidos (Minha atenção, Hoje, Amanhã, Próximos 2 dias); indicadores Sem prestador / Entregas de hoje / Pendências / Retirada vencendo; filtros avançados (Foto pendente, Excedente pendente, Aguardando retirada, Automação pausada).

**Critérios de aceite:**
- Cada indicador de "Precisa de atenção" navega direto pra lista filtrada correspondente.

---

### Card 9.10 — Exportar OS e Backup
**Status:** ⚠️ Parcial — exportação CSV das OS filtradas implementada e testada (respeita os filtros ativos no momento). Rotina de backup de dados operacionais **não implementada** — ❌ Bloqueado, ver pendências abaixo.

**Descrição:** Exportação de OS filtradas (CSV/planilha) e rotina de backup dos dados operacionais.

**Critérios de aceite:**
- Exportação respeita os filtros ativos no momento da ação.

---

### Card 12.1 — Motor de regras de automação (fundação)
**Status:** ✅ Concluído — `backend/src/services/automacoesConfig.ts` (tipos + `decidirAcao(modo, autonomia)` + `dentroDaJanela`), config persistida em `automacoes_config/config` (Firestore), editável em `/automacoes` (`src/views/AutomacoesView.vue`). Switch geral "Pausar todas as automações" testado — pausado, `executarTick()` retorna sem processar nada. Modo Teste testado (ver "Como testar" abaixo): registra em `automacoes_fila` com `situacao: 'simulada'` e nunca chama `enviarMensagemOS` nem move a OS.

**Descrição:** Estrutura de configuração por tipo de automação: Modo (Desligada/Teste/Produção) e Nível de autonomia (Manual — nunca executa sozinha, apenas sugere / Automática — executa sozinha), mais um switch geral "Pausar todas as automações".

**Critérios de aceite:**
- Modo Teste nunca dispara ação real ao prestador — só registra o que faria.
- Switch geral pausa todas as automações imediatamente, independente da configuração individual de cada uma.

---

### Card 12.2 — Automação: Distribuição automática
**Status:** ✅ Concluído e testado de ponta a ponta — `processarDistribuicao()` em `backend/src/services/automacoesEngine.ts`. Teste real: prestador + OS de teste criados, tick disparado em modo Teste (registrou sugestão em `automacoes_fila` sem tocar a OS) e depois em modo Produção + autonomia Automática (moveu a OS de `aguardando_distribuicao` pra `distribuindo_aguardando_resposta`, gravou `historico[]`, enviou mensagem simulada via `enviarMensagemOS`, respeitou a cascata de prioridade por cidade e o rastreamento de tentativas via `tentativasDistribuicaoAutomatica[]`). Dados de teste removidos após validação.

**Descrição:** Oferece a OS ao prestador de maior prioridade na cascata da cidade, com tempo de resposta configurável (min), tempo extra pra "preciso confirmar" (min), máximo de tentativas por OS, e checkboxes: encerrar após aceite, mandar pra Pendências se todos recusarem, distribuir só pra prestadores Ativos, ignorar Pausados/Bloqueados/cobertura inativa.

**Critérios de aceite:**
- Respeita rigorosamente a ordem de prioridade cadastrada (Card 10.2).
- Nunca oferece a mesma OS a dois prestadores simultaneamente.

---

### Card 12.3 — Automação: Confirmação do dia
**Status:** ✅ Concluído — `processarConfirmacaoDia()`. Horário padrão de envio configurável, só dispara pra OS com `etapa: 'confirmada_aguardando_dia'` cujo `datas.agendamento` é hoje, evita reenvio no mesmo dia (`automacao.confirmacaoDiaEnviadaEm`). Corrigido durante o teste desta fase pra usar `registrarHistorico()` (antes atualizava a etapa direto no Firestore, sem entrada em `historico[]` nem derivar `status`).
**Não testado com dado real** (só revisão de código + typecheck) — sem OS real nessa etapa disponível no momento do teste; a lógica é análoga à de Distribuição (12.2), já validada de ponta a ponta.

**Descrição:** Horário padrão de envio (permitindo horário específico por OS); não envia se a OS estiver cancelada, com pendência bloqueada, ou já com entrega confirmada.

---

### Card 12.4 — Automação: Confirmação de entrega
**Status:** ✅ Concluído — `processarConfirmacaoEntrega()`. Dispara pra OS em `aguardando_entrega` cujo agendamento já chegou, respeita tempo mínimo entre cobranças e máximo de cobranças (`automacao.confirmacaoEntregaCobrancas`/`confirmacaoEntregaUltimoEnvioEm`). Não testado com dado real nesta fase (mesma lógica validada em 12.2, código revisado + typecheck limpo).

**Descrição:** Regra de horário de disparo (ex.: próximo ao final da janela agendada), tempo antes de cobrar de novo, máximo de cobranças automáticas.

---

### Card 12.5 — Automação: Foto da entrega
**Status:** ✅ Concluído — `processarCobrancaFoto()`. Dispara pra OS em `entregue_aguardando_foto`, tempo após gatilho e máximo de cobranças configuráveis (`automacao.fotoCobrancas`/`fotoUltimoEnvioEm`). Não testado com dado real nesta fase (mesma lógica validada em 12.2, código revisado + typecheck limpo).

**Descrição:** Tempo após confirmação de entrega pra cobrar foto, máximo de cobranças; encerra a cobrança quando uma foto chega (validação de que a foto é de fato válida continua sendo curadoria humana nesta fase).

---

### Card 12.6 — Automação: Retirada
**Status:** ✅ Concluído — `processarCobrancaRetirada()`. Dias após entrega pra 1ª cobrança, tempo entre cobranças e máximo configuráveis, usa `datas.entregaReal` como referência. Não testado com dado real nesta fase (mesma lógica validada em 12.2, código revisado + typecheck limpo).
**Pendência:** "prazo específico configurável por OS" (SLA legal por seguradora) ainda não existe — chega na Fase 6.

**Descrição:** Dias após a entrega pra 1ª cobrança, tempo entre cobranças, máximo de cobranças, prazo específico configurável por OS (liga com o SLA legal detalhado na Fase 6).

---

### Card 12.7 — Horário permitido para mensagens automáticas
**Status:** ✅ Concluído — `dentroDaJanela(config)` em `automacoesConfig.ts`, campos `janelaInicio`/`janelaFim` editáveis em `/automacoes`. Fora da janela, `executarTick()` retorna sem processar nenhuma automação.
**Pendência:** exceção por OS de "janela noturna" não implementada — a janela é global, sem override por OS individual.
**Gap de arquitetura conhecido:** como o motor roda por polling (`setInterval`, não fila real agendada), "mensagens ficam enfileiradas até o próximo horário permitido" não é literal — nada fica de fato enfileirado fora da janela, o motor simplesmente reavalia tudo de novo no próximo tick dentro da janela. Efeito prático é o mesmo (nada dispara fora do horário), mas não há uma fila de espera visível.

---

### Card 12.8 — Fila "Automações pendentes"
**Status:** ⚠️ Parcial — `automacoes_fila` (Firestore) + tabela "Fila de automações" em `/automacoes` mostra as últimas 100 execuções (OS, tipo, situação — executada/simulada/sugerida/falha —, prestador, detalhe, data/hora). Funciona como **log de execução**, testado e validado (Cards 12.2-12.7 escrevem nela a cada tick).
**Não implementado:** não é uma fila real de ações *futuras ainda não executadas* com cancelamento manual — o motor não agenda ações pra depois, ele reavalia o estado da OS a cada tick e decide ali na hora. Não existe, portanto, uma ação "cancelar" (não há o que cancelar — não há nada agendado, só o próximo tick reavaliando). Se um comportamento de fila real de agendamento futuro for necessário, isso exige infraestrutura de scheduler (Cloud Tasks ou similar) ainda não provisionada — mesmo gap de infra citado no Card 12.1/Fase 0.

---

## Como testar

### Kanban Operacional (Cards 9.7-9.9)
1. Entre em **Central de OS** no menu lateral (`/kanban`).
2. Confira as colunas do quadro — cada uma é uma etapa (Aguardando distribuição, Distribuindo, Confirmada, etc.). Cada cartão mostra o número da OS, cidade, prestador (se já tiver) e data.
3. No topo, use os botões **Minha atenção / Hoje / Amanhã / Próximos 2 dias** pra filtrar rápido, e clique nos indicadores (Sem prestador, Entregas de hoje, Pendências, Retirada vencendo) pra ver só as OS naquela situação.
4. Clique em "Mover para..." num cartão, escolha a nova etapa e **preencha o motivo** (é obrigatório — tentar salvar sem motivo mostra erro). Confirme e veja o cartão mudar de coluna.
5. Alterne entre os modos **Kanban / Lista / Agenda** no topo — os filtros que você aplicou continuam ativos.
6. Clique em **Exportar CSV** — baixa uma planilha só com as OS que estão filtradas na tela no momento.

### Central de Automações (Cards 12.1-12.7)
1. Entre em **Automações** no menu lateral (`/automacoes`).
2. Cada bloco (Distribuição, Confirmação do dia, Confirmação de entrega, Foto da entrega, Retirada) tem um seletor de **Modo** — deixe em **Desligada** enquanto não tiver certeza, ou **Teste** pra ver o que a automação faria sem enviar nada de verdade.
3. Ajuste os tempos/quantidades desejados e clique em **Salvar configurações**.
4. Marque **"Pausar todas as automações"** a qualquer momento pra travar tudo de uma vez, independente da configuração de cada bloco.
5. Clique em **"▶ Rodar 1 tick agora (teste)"** pra forçar uma rodada imediata, sem esperar o intervalo automático (roda a cada 1 minuto sozinho por padrão).
6. Role até a tabela **"Fila de automações"** — mostra as últimas 100 ações (o que foi executado, simulado ou sugerido, pra qual OS e prestador).

**Importante:** enquanto o modo estiver em **Produção** + autonomia **Automática**, a automação age sozinha (move a OS, "envia" mensagem — hoje em modo simulado, já que ainda não existe conta Z-API real, ver Fase 4). Use **Teste** pra validar as regras com segurança antes de ativar de verdade.
