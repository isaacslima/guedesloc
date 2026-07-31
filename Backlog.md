# Backlog — Central de Integrações de OS com Seguradoras

## Visão geral da arquitetura proposta

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

Princípio central: **cada seguradora é um "adapter"** (API real ou RPA) que fala um protocolo próprio, mas todos entregam para a API de Orquestração no mesmo formato interno (contrato único de OS). Isso evita que o resto do sistema precise saber a diferença entre Porto Seguro e Mawdy.

---

## EPIC 1 — Hub Central de Integrações

### Card 1.1 — Modelagem de domínio das integradoras
**Descrição:** Criar estrutura de dados (Firestore) para cadastrar cada seguradora/integradora: nome, tipo de integração (API ou RPA), status (ativa/inativa/em homologação), credenciais (referência ao Secret Manager, nunca a credencial em si), URLs/endpoints, SLA esperado.

**Critérios de aceite:**
- Existe uma coleção `integradoras` com schema documentado.
- É possível cadastrar/editar/desativar uma integradora pela área administrativa sem deploy de código.
- Campo `tipo_integracao` distingue `API` de `RPA`.
- Credenciais nunca são gravadas em texto puro no Firestore — apenas referência ao Secret Manager.

### Card 1.2 — Contrato único de Ordem de Serviço (modelo canônico)
**Descrição:** Definir o "formato interno" de OS que todo adapter (API ou RPA) deve entregar, independente da seguradora de origem. Isso desacopla o resto do sistema das particularidades de cada integração.

**Critérios de aceite:**
- Documento de schema (OpenAPI/JSON Schema) versionado no repositório.
- Contempla campos obrigatórios (nº OS seguradora, nº OS interno, cliente, endereço, tipo de serviço, valor, status, prestador, datas) e campos opcionais por seguradora.
- Validação automática rejeita payload fora do contrato antes de gravar no Firestore.

### Card 1.3 — Fila assíncrona de eventos (Pub/Sub)
**Descrição:** Toda nova OS ou mudança de status recebida de uma integradora publica um evento em um tópico Pub/Sub, desacoplando a ingestão do processamento (financeiro, notificação, dashboard).

**Critérios de aceite:**
- Tópicos criados: `os.criada`, `os.status_alterado`, `os.cancelada`, `os.finalizada`.
- Cada consumidor (financeiro, notificações, auditoria) tem sua própria subscription.
- Mensagens com falha de processamento vão para uma dead-letter queue e geram alerta.

### Card 1.4 — Motor de retry e idempotência
**Descrição:** Garantir que reenvios de webhook, reprocessamento de RPA ou falhas de rede não dupliquem OS nem pagamentos.

**Critérios de aceite:**
- Toda ingestão usa uma chave de idempotência (ex: `seguradora + nº_os_seguradora`).
- Requisições duplicadas são identificadas e descartadas/atualizadas, nunca duplicadas.
- Retries com backoff exponencial configurável por integradora.

### Card 1.5 — Painel de monitoramento de integrações
**Descrição:** Tela administrativa mostrando, por seguradora, status da última sincronização, quantidade de OS processadas no dia, erros recentes.

**Critérios de aceite:**
- Lista todas as integradoras com indicador visual (verde/amarelo/vermelho).
- Exibe timestamp da última execução com sucesso e da última falha.
- Permite reprocessar manualmente uma OS que falhou.

---

## EPIC 2 — Integrações por seguradora

> Antes de detalhar cada card, é necessário fazer o levantamento técnico: existe API? é REST/SOAP? tem documentação? exige certificado/whitelist de IP? Isso deve virar o primeiro card de cada seguradora ("spike" de descoberta).

### Card 2.0 (template, repetir para cada seguradora) — Spike de descoberta técnica
**Descrição:** Levantar com a seguradora/integradora [NOME] se existe API disponível, tipo de autenticação, documentação, ambiente de homologação, e se há alternativa de e-mail/portal para eventual RPA.

**Critérios de aceite:**
- Documento de descoberta preenchido: tem API (S/N), protocolo, autenticação, rate limit, ambiente de testes, contato técnico.
- Decisão registrada: será feita via API ou via RPA.
- Se RPA: URL do portal, fluxo de login mapeado, print das telas principais anexado.

### Card 2.1 — Integração Tempo Assist
**Descrição:** Implementar adapter (API ou RPA, conforme spike) para ingestão de OS e atualização de status junto à Tempo Assist.

**Critérios de aceite:**
- Novas OS aparecem no sistema em até X minutos (definir SLA) após criação na Tempo Assist.
- Atualizações de status (aceite, execução, finalização) são refletidas nos dois sentidos, se aplicável.
- Erros de integração geram log estruturado e alerta.
- Testado em ambiente de homologação da seguradora antes de produção.

### Card 2.2 — Integração Europ Assistance / Redion
**Descrição:** Mesma estrutura do Card 2.1, adaptada para Europ/Redion.
**Critérios de aceite:** (mesmo padrão do Card 2.1)

### Card 2.3 — Integração Mawdy Brasil
**Descrição:** Mesma estrutura do Card 2.1, adaptada para Mawdy.
**Critérios de aceite:** (mesmo padrão do Card 2.1)

### Card 2.4 — Integração Maxpar Assistências
**Descrição:** Mesma estrutura do Card 2.1, adaptada para Maxpar.
**Critérios de aceite:** (mesmo padrão do Card 2.1)

### Card 2.5 — Integração Porto Seguro
**Descrição:** Mesma estrutura do Card 2.1, adaptada para Porto Seguro. Atenção: seguradoras grandes costumam ter processo de homologação/credenciamento mais formal — mapear prazo à parte.
**Critérios de aceite:** (mesmo padrão do Card 2.1, + validação de credenciamento formal concluída)

### Card 2.6 — Integração Tokio Marine
**Descrição:** Mesma estrutura do Card 2.1, adaptada para Tokio Marine.
**Critérios de aceite:** (mesmo padrão do Card 2.1)

---

## EPIC 3 — API de Orquestração (Gateway)

### Card 3.1 — API Gateway central
**Descrição:** Serviço único (Cloud Run) que expõe endpoints internos para o front-end e recebe os dados normalizados de todos os adapters, sendo o único ponto de escrita no Firestore relacionado a OS.

**Critérios de aceite:**
- Endpoints documentados em OpenAPI/Swagger.
- Nenhum adapter escreve diretamente no Firestore — tudo passa pelo Gateway.
- Testes de carga básicos validam throughput mínimo esperado.

### Card 3.2 — Autenticação e autorização service-to-service
**Descrição:** Definir como os adapters (Cloud Run) se autenticam junto ao Gateway e como o front-end (Firebase Auth) se autentica para consumir a API.

**Critérios de aceite:**
- Comunicação adapter → gateway usa autenticação de serviço (IAM/Service Account do GCP ou API key com rotação).
- Comunicação front-end → gateway valida o token do Firebase Authentication.
- Nenhum endpoint sensível acessível sem autenticação.

### Card 3.3 — Versionamento de contrato
**Descrição:** Estratégia de versionamento (`/v1/`, `/v2/`) para permitir evolução das integrações sem quebrar adapters já em produção.

**Critérios de aceite:**
- Endpoints versionados desde o primeiro deploy.
- Documentação de política de depreciação.

---

## EPIC 4 — Motor de RPA

### Card 4.1 — Infraestrutura de execução de RPA
**Descrição:** Ambiente containerizado (Cloud Run Jobs ou GKE, conforme necessidade de sessão longa) para rodar scripts de automação (Playwright/Puppeteer) contra os portais das seguradoras sem API.

**Critérios de aceite:**
- Cada RPA roda em container isolado, com timeout configurável.
- Credenciais injetadas via Secret Manager, nunca hardcoded.
- Execução registra logs e evidências (prints) em Cloud Storage.

### Card 4.2 — Agendamento de execuções
**Descrição:** Definir periodicidade de varredura de cada portal (ex: a cada 15 min) via Cloud Scheduler.

**Critérios de aceite:**
- Cada integradora RPA tem sua própria frequência configurável.
- Execuções concorrentes da mesma integradora são bloqueadas (lock).

### Card 4.3 — Tratamento de falhas e resiliência do RPA
**Descrição:** Portais mudam de layout, caem, pedem captcha. O RPA precisa lidar com isso sem quebrar o sistema inteiro.

**Critérios de aceite:**
- Falha de um RPA não impacta os demais (isolamento de falha).
- Alerta automático quando um seletor/elemento esperado não é encontrado (indício de mudança de layout).
- Reexecução automática com backoff antes de marcar como falha definitiva.

### Card 4.4 — Armazenamento de evidências
**Descrição:** Guardar prints/HTML da execução do RPA para auditoria e troubleshooting.

**Critérios de aceite:**
- Evidência de cada execução armazenada em Cloud Storage com retenção definida (ex: 90 dias).
- Vinculada ao ID da execução no painel de monitoramento (Card 1.5).

---

## EPIC 5 — Gestão de Recebíveis (valores a receber das seguradoras)

### Card 5.1 — Tabela de preços por seguradora/serviço
**Descrição:** Cadastro de valores acordados por tipo de serviço (remoção via caçamba, etc.) e por seguradora, incluindo histórico de reajustes.

**Critérios de aceite:**
- É possível cadastrar valor vigente e data de vigência por seguradora/tipo de serviço.
- Alterações preservam histórico (não sobrescrevem).

### Card 5.2 — Conciliação automática de recebíveis
**Descrição:** Comparar o valor esperado (tabela de preços x OS finalizada) com o valor efetivamente pago/reportado pela seguradora, sinalizando divergências.

**Critérios de aceite:**
- Toda OS finalizada gera um lançamento "a receber".
- Sistema compara valor lançado com valor confirmado e marca como conciliado, divergente ou pendente.
- Divergências geram alerta para análise manual.

### Card 5.3 — Dashboard de recebíveis
**Descrição:** Visão consolidada de valores em aberto, vencidos e pagos, filtrável por seguradora e período.

**Critérios de aceite:**
- Filtros por seguradora, status e intervalo de datas.
- Totalizadores por seguradora e geral.
- Exportação para CSV/Excel.

### Card 5.4 — Relatórios financeiros de recebíveis
**Descrição:** Relatórios periódicos (mensal) de faturamento por seguradora para conferência e envio ao financeiro do cliente.

**Critérios de aceite:**
- Relatório gerado sob demanda ou agendado.
- Contempla total faturado, recebido, pendente e divergente por seguradora.

---

## EPIC 6 — Gestão de Pagamentos a Prestadores/Terceirizados

### Card 6.1 — Regras de repasse por prestador
**Descrição:** Definir como cada prestador é remunerado (valor fixo por OS, percentual, tabela específica).

**Critérios de aceite:**
- Cadastro de regra de repasse vinculado ao prestador.
- Sistema calcula automaticamente o valor devido ao finalizar uma OS.

### Card 6.2 — Geração de lote de pagamento
**Descrição:** Consolidar, por período, todos os valores devidos a cada prestador para gerar um lote de pagamento.

**Critérios de aceite:**
- Geração de lote por período (ex: quinzenal/mensal) agrupando OS finalizadas e aprovadas.
- Lote exportável em formato aceito pelo banco (CNAB, se aplicável) ou relatório para pagamento manual.

### Card 6.3 — Integração com meio de pagamento (opcional/fase 2)
**Descrição:** Automatizar o pagamento via PIX/transferência bancária diretamente pelo sistema.

**Critérios de aceite:**
- Integração com API de banco ou plataforma de pagamento definida.
- Confirmação de pagamento atualiza status do lote automaticamente.

### Card 6.4 — Histórico e comprovantes de pagamento
**Descrição:** Manter histórico consultável de todos os pagamentos feitos a cada prestador, com comprovante anexado.

**Critérios de aceite:**
- Prestador (ou admin) consegue visualizar histórico de pagamentos recebidos.
- Comprovante de pagamento anexável/vinculável a cada lote.

---

## EPIC 7 — Infraestrutura GCP

### Card 7.1 — Provisionamento de projeto e ambientes
**Descrição:** Estruturar projetos GCP separados (ou ao menos ambientes isolados) para homologação e produção, com IAM adequado.

**Critérios de aceite:**
- Ambientes de hml/prod isolados.
- IAM com princípio de menor privilégio por serviço.
- Infra como código (Terraform) versionada.

### Card 7.2 — Cloud Run para serviços de API e adapters
**Descrição:** Cada adapter e o Gateway rodam como serviços Cloud Run independentes, com deploy via CI/CD.

**Critérios de aceite:**
- Cada serviço tem pipeline de deploy próprio.
- Escalonamento automático configurado (min/max instâncias).

### Card 7.3 — Pub/Sub para orquestração de eventos
**Descrição:** Ver Card 1.3 — aqui é o item de infraestrutura correspondente (criação de tópicos, subscriptions, DLQ).

**Critérios de aceite:**
- Tópicos e subscriptions provisionados via infra como código.
- Monitoramento de mensagens não processadas configurado.

### Card 7.4 — Secret Manager para credenciais
**Descrição:** Todas as credenciais de integração (API keys, logins de RPA) armazenadas no Secret Manager, nunca em código ou Firestore.

**Critérios de aceite:**
- Nenhuma credencial em texto puro no repositório ou banco de dados.
- Rotação de credenciais documentada.

### Card 7.5 — Cloud Scheduler para rotinas
**Descrição:** Agendamento de execuções de RPA, conciliações financeiras e geração de relatórios.

**Critérios de aceite:**
- Jobs agendados e monitorados, com alerta em caso de falha de execução.

### Card 7.6 — Integração entre backend GCP e Firestore/Firebase Auth existentes
**Descrição:** Garantir que o novo backend (Cloud Run) se conecta corretamente ao Firestore e Firebase Authentication já usados no front-end, sem duplicar fontes de verdade.

**Critérios de aceite:**
- Backend usa a mesma instância de Firestore do projeto atual (ou estratégia clara de múltiplos bancos, se necessário).
- Regras de segurança do Firestore revisadas para impedir escrita direta do front-end nas coleções sensíveis (financeiro), forçando passagem pela API.

---

## EPIC 8 — Observabilidade, Segurança e Auditoria

### Card 8.1 — Logging centralizado
**Descrição:** Todos os serviços (Gateway, adapters, RPA) enviam logs estruturados para o Cloud Logging.

**Critérios de aceite:**
- Logs padronizados (JSON) com correlação por ID de OS/execução.
- Retenção definida conforme necessidade de auditoria.

### Card 8.2 — Alertas de falha
**Descrição:** Configurar Cloud Monitoring para alertar (e-mail/Slack) em caso de falha de integração, RPA travado, ou divergência financeira acima de um limite.

**Critérios de aceite:**
- Alertas configurados para: integração fora do ar, taxa de erro acima de X%, divergência financeira acima de valor definido.
- Canal de notificação definido com o cliente.

### Card 8.3 — Auditoria de acessos e ações (LGPD)
**Descrição:** Como o sistema trata dados de clientes/veículos das seguradoras, é necessário registrar quem acessou/alterou o quê.

**Critérios de aceite:**
- Log de auditoria imutável para ações sensíveis (alteração de valores, exclusão de OS, pagamentos).
- Revisão de quais dados pessoais trafegam e se há necessidade de anonimização/retenção conforme LGPD.

### Card 8.4 — Política de segurança de credenciais
**Descrição:** Definir rotação periódica de credenciais de integração e de service accounts do GCP.

**Critérios de aceite:**
- Cronograma de rotação documentado e, se possível, automatizado.

---

## Sugestão de sequenciamento (roadmap)

1. **Fase 0 — Fundação:** Epic 1 (hub, contrato único, fila) + Epic 7 (infra GCP base) + Epic 3 (gateway e auth).
2. **Fase 1 — Piloto:** escolher 1 seguradora com API mais simples e 1 sem API, para validar os dois fluxos (adapter API + RPA) de ponta a ponta, incluindo Epic 8 básico (logs/alertas).
3. **Fase 2 — Financeiro:** Epic 5 (recebíveis) e Epic 6 (pagamentos), já com dados reais vindos do piloto.
4. **Fase 3 — Escala:** replicar o padrão validado para as demais seguradoras (Epic 2, cards restantes).
5. **Fase 4 — Maturidade:** Epic 4 completo (resiliência de RPA), Epic 8 completo (auditoria/LGPD), automação de pagamento (Card 6.3).

**Ponto de atenção:** antes de estimar prazo, os cards 2.0 (spike de descoberta) de cada seguradora precisam ser feitos primeiro — é isso que vai dizer quantas integrações serão API vs RPA, e isso muda bastante o esforço total.