export type FaseStatus = 'concluida' | 'em_andamento' | 'planejada'

export interface PendenciaRoadmap {
  item: string
  motivo: string
  proximoPasso: string
}

export interface FaseRoadmap {
  numero: number
  nome: string
  resumo: string
  status: FaseStatus
  /** Roteiro pra qualquer pessoa validar o que já foi entregue nessa fase — espelha a seção "Como testar" do backlog/fase-N-*.md correspondente. */
  comoTestar?: string[]
  /** Cards marcados "❌ Bloqueado" no backlog/fase-N-*.md correspondente — o que falta e o próximo passo pra desbloquear. */
  pendencias?: PendenciaRoadmap[]
}

/**
 * Espelha, em linguagem simples pro cliente, o roadmap técnico detalhado em
 * Backlog.md / backlog/fase-N-*.md — sem entrar em Epic/Card. Atualizar o
 * progresso aqui é uma edição manual (deploy), feita junto com a atualização
 * dos arquivos de backlog quando uma fase avança.
 */
export const roadmap: FaseRoadmap[] = [
  {
    numero: 0,
    nome: 'Fundação',
    resumo: 'Base técnica: conexão com as seguradoras, fila de eventos e portal único de dados.',
    status: 'em_andamento',
  },
  {
    numero: 1,
    nome: 'Piloto de Integração',
    resumo: 'Primeira seguradora integrada de ponta a ponta (Tempo Assist), validando o recebimento automático de OS.',
    status: 'em_andamento',
  },
  {
    numero: 2,
    nome: 'Unificação do Modelo de OS & Criação Assistida',
    resumo: 'Toda OS — vinda de seguradora ou criada manualmente — passa a viver num único lugar, com criação assistida por texto ou PDF colado.',
    status: 'em_andamento',
    comoTestar: [
      'Abra "Ordens de Serviço" no menu — confira que aparecem OS com badge de origem "Tempo Assist" (vindas da integração).',
      'No resumo do topo, confira que o número de "integradas" bate com o que está sincronizado da Tempo Assist.',
      'Use o filtro "Todas as origens" para ver só "Manual" ou só "Integrada (seguradora)".',
      'Clique em "Detalhes" numa OS integrada e confira se cliente, endereço, serviço, valor e datas batem com o portal da seguradora.',
      'Clique em "+ Nova OS", crie uma OS manual, e confira que ela aparece com badge "Manual" e pode ser editada/excluída.',
      'Abra o Dashboard (tela inicial) e confira que o total de "Ordens de Serviço" bate com o total da tela de OS.',
      'Preencha um telefone em "Telefone de teste (WhatsApp)" e clique "WhatsApp" numa OS integrada — deve abrir o WhatsApp com uma mensagem pronta. Isso ainda é só um protótipo de teste, a integração real vem na Fase 4.',
      'Fora do escopo por enquanto: kanban visual, distribuição pra prestador, WhatsApp automático de verdade, criação de OS colando texto/PDF.',
    ],
    pendencias: [
      {
        item: 'Criação de OS colando texto (e-mail, WhatsApp copiado etc.)',
        motivo: 'Depende de escolher um provedor de IA/LLM pra extrair os campos do texto — nenhuma credencial está configurada no projeto hoje.',
        proximoPasso: 'Decidir qual provedor usar e onde o endpoint de extração vai viver (no Gateway ou num serviço à parte); depois disso o card sai do bloqueio.',
      },
      {
        item: 'Importação de OS em lote via PDF',
        motivo: 'Usa a mesma extração de texto do item acima, aplicada a PDF — mesma dependência.',
        proximoPasso: 'Resolver a pendência de cima primeiro; a leitura de PDF entra na sequência, sem decisão nova de provedor.',
      },
    ],
  },
  {
    numero: 3,
    nome: 'Prestadores, Cobertura e Distribuição',
    resumo: 'Cadastro de prestadores por cidade e prioridade, com tela de distribuição das OS.',
    status: 'em_andamento',
    comoTestar: [
      'Em "Prestadores", cadastre um prestador com situação "Ativo" e ao menos uma cidade em "Cidades atendidas".',
      'Reordene duas cidades atendidas com os botões ▲/▼ e confira que a prioridade (#1, #2...) muda junto.',
      'Abra "Distribuição" — a aba "Aguardando distribuição" deve listar as OS sem prestador.',
      'Escolha um prestador e clique "Atribuir" — a OS deve sumir dessa aba e aparecer em "Aguardando confirmação".',
      'Na aba "Aguardando confirmação", teste "Confirmar aceite" (a OS sai da lista) e "Recusou, redistribuir" (a OS volta pra "Aguardando distribuição").',
      'Fora do escopo por enquanto: distribuição automática de verdade e confirmação por WhatsApp — hoje é tudo manual.',
    ],
    pendencias: [
      {
        item: 'Importar contatos de prestador direto da agenda do Google (Card 10.5)',
        motivo: 'Hoje os contatos de prestador do cliente ficam concentrados na agenda pessoal do Gmail dele, fora da plataforma. Buscar isso automaticamente exige autorização OAuth do Google (People API) — não existe projeto Google Cloud nem credencial configurada pra isso ainda.',
        proximoPasso: 'Criar/reaproveitar um projeto Google Cloud, habilitar a People API, configurar a autorização OAuth (conectando a conta Google de quem administra os prestadores hoje) e construir a tela de revisão que deixa escolher quais contatos da agenda viram prestadores de verdade antes de importar. Etapa combinada: só a importação (Google → plataforma) por enquanto — o caminho inverso (todo prestador novo virar contato no Gmail automaticamente) fica planejado como próximo passo, depois que a importação estiver funcionando.',
      },
    ],
  },
  {
    numero: 4,
    nome: 'Comunicação com Prestadores (WhatsApp)',
    resumo: 'Envio e recebimento de mensagens reais pelo WhatsApp, direto com os prestadores.',
    status: 'em_andamento',
    comoTestar: [
      'Cadastre um prestador em "Prestadores" com telefone válido (dígitos com DDD e país, ex.: 5511999998888).',
      'Em "Distribuição", atribua esse prestador a uma OS "Aguardando distribuição".',
      'Abra "WhatsApp" — selecione a OS no composer do topo, escolha "Distribuição" e clique "Enviar mensagem". Com a Z-API configurada de verdade, aparece "Enviado." e a mensagem chega no WhatsApp do prestador; sem credencial configurada, aparece "Enviado (simulado...)".',
      'A resposta do prestador (responder 1 = aceita, 2 = recusa) já foi validada com resposta real pelo WhatsApp — o backend está publicado (Cloud Run) e o webhook da Z-API aponta pra ele, então a resposta chega e aparece na inbox de verdade, sem precisar simular por requisição técnica.',
      'Fora do escopo por enquanto: filtros e busca na inbox, transferência de atendimento entre pessoas do time.',
    ],
    pendencias: [
      {
        item: 'Conta Z-API de produção (do cliente) ainda não configurada',
        motivo: 'O envio e recebimento reais já foram testados e confirmados de ponta a ponta (backend publicado no Cloud Run, webhook cadastrado na Z-API), mas usando uma conta Z-API de teste pessoal — o link que o cliente passou não bateu com nenhuma instância acessível na sessão de teste (Instance ID/Token diferentes), então backend aponta pra essa conta de teste, não pra produção.',
        proximoPasso: 'Confirmar com o cliente a conta/instância Z-API certa (painel dele, ou reenviar o link + o Client-Token de segurança da conta de lá) e trocar ZAPI_INSTANCE_ID/ZAPI_TOKEN/ZAPI_CLIENT_TOKEN no Cloud Run (e recadastrar a URL do webhook nessa conta) antes de mandar mensagem real pra prestador de verdade.',
      },
      {
        item: 'Transferência de atendimento entre pessoas do time ("Atendido por"/"Transferir")',
        motivo: 'Não implementado nesta rodada, pra não estourar o escopo da fase — a inbox mostra as conversas, mas não tem atribuição de quem está atendendo.',
        proximoPasso: 'Adicionar campo de atendimento na conversa quando essa necessidade aparecer no uso real (equipe crescendo, mais de uma pessoa respondendo ao mesmo tempo).',
      },
    ],
  },
  {
    numero: 5,
    nome: 'Kanban Operacional Completo & Central de Automações',
    resumo: 'Painel visual com todas as etapas da OS e regras automáticas de distribuição e confirmação.',
    status: 'em_andamento',
    comoTestar: [
      'Abra "Central de OS" no menu — veja o quadro com as etapas da OS em colunas (Aguardando distribuição, Distribuindo, Confirmada, etc.).',
      'Use os botões de filtro rápido (Minha atenção, Hoje, Amanhã, Próximos 2 dias) e clique nos indicadores (Sem prestador, Entregas de hoje, Pendências, Retirada vencendo) pra filtrar.',
      'Clique em "Mover para..." num cartão, escolha a nova etapa e preencha o motivo (obrigatório) — confirme e veja o cartão mudar de coluna.',
      'Alterne entre os modos Kanban / Lista / Agenda — os filtros aplicados continuam ativos.',
      'Clique em "Exportar CSV" pra baixar uma planilha só com as OS filtradas na tela.',
      'Abra "Automações" no menu — cada regra (Distribuição, Confirmação do dia, Confirmação de entrega, Foto da entrega, Retirada) tem um seletor de Modo (Desligada/Teste/Produção) e Autonomia (Manual/Automática).',
      'Deixe em "Teste", ajuste os tempos desejados, salve, e clique "▶ Rodar 1 tick agora" — confira na tabela "Fila de automações" o que a regra faria, sem mandar nada de verdade.',
      'Marque "Pausar todas as automações" a qualquer momento pra travar tudo de uma vez.',
      'Fora do escopo por enquanto: rotina de backup automático dos dados, fila de ações futuras com cancelamento manual (hoje o motor reavalia tudo a cada rodada, não agenda pra depois).',
    ],
    pendencias: [
      {
        item: 'Rotina de backup dos dados operacionais (Card 9.10)',
        motivo: 'A exportação de OS filtradas em CSV está pronta, mas uma rotina de backup de verdade (cópia periódica de segurança dos dados) ainda não foi implementada.',
        proximoPasso: 'Definir onde o backup vai rodar (ex.: export automático agendado do Firestore pra um bucket) e a frequência desejada — depende de decisão de infraestrutura, não é só código.',
      },
      {
        item: 'Fila real de "Automações pendentes" com cancelamento manual (Card 12.8)',
        motivo: 'O motor de automações roda por rodadas (a cada 1 minuto, reavaliando tudo), não como uma fila de ações futuras agendadas — hoje a tela "Fila de automações" é um histórico do que já rodou, não uma lista do que ainda vai rodar. Por isso não existe um botão "cancelar" (não há o que cancelar).',
        proximoPasso: 'Se precisar de agendamento de verdade (ex.: "essa cobrança vai sair às 14h de amanhã, dá pra cancelar antes"), isso exige um serviço de fila/agendador (como o Cloud Tasks do Google) — infraestrutura ainda não contratada.',
      },
    ],
  },
  {
    numero: 6,
    nome: 'Visões Operacionais Especializadas',
    resumo: 'Telas dedicadas de entregas, retiradas e pendências.',
    status: 'em_andamento',
    comoTestar: [
      'Abra "Entregas" no menu lateral — confira as abas Agendadas / Entregas de hoje / Entregues.',
      'Numa OS da aba Agendadas, clique "Confirmar entrega agora" e veja ela sumir dali e aparecer em Entregues.',
      'Abra "Retiradas" — veja as abas Atrasadas / Vence hoje / No prazo / Retiradas hoje (só aparecem OS já confirmadas como entregues).',
      'No topo, clique "Editar prazo padrão" pra mudar o prazo global de retirada (em dias) e salve.',
      'Numa OS da lista, clique no valor do "Prazo" pra abrir uma exceção só pra ela — a OS pode mudar de aba na hora.',
      'Clique "Confirmar retirada agora" numa OS — ela finaliza e passa a aparecer em "Retiradas hoje".',
      'Abra "Pendências" — veja as abas Pendências, Excedentes (retiradas atrasadas), Canceladas e "Com motivo registrado" (histórico completo de tudo que já mudou de etapa com um motivo anotado).',
      'Volte pra "Central de OS" e confira que o indicador "Retirada vencendo" bate com a soma de Atrasadas + Vence hoje da tela de Retiradas — é o mesmo cálculo.',
    ],
    pendencias: [
      {
        item: 'Prazo de retirada por regra legal de município (Card 13.2)',
        motivo: 'Hoje o prazo de retirada é um único valor padrão global, com exceção manual por OS quando necessário — não existe uma tabela de regras automáticas por cidade/seguradora.',
        proximoPasso: 'Se surgir a necessidade real (municípios com prazos legais diferentes), criar um cadastro de regras por cidade e aplicar automaticamente na hora de calcular o prazo de cada OS, em vez do valor global + exceção manual.',
      },
    ],
  },
  {
    numero: 7,
    nome: 'Financeiro',
    resumo: 'Controle de valores a receber das seguradoras e a pagar aos prestadores.',
    status: 'em_andamento',
    comoTestar: [
      'Abra "Tabela de Preços" no menu — cadastre um valor pra uma seguradora + tipo de serviço, e teste "Reajustar" nele: o valor antigo vai pro histórico, sem ser apagado.',
      'Abra "Recebíveis" — toda OS com etapa "Finalizada" aparece aqui com o valor esperado (calculado pela Tabela de Preços). Clique "Registrar valor confirmado" pra comparar com o que a seguradora realmente pagou — bateu vira "Conciliado", diferente vira "Divergente".',
      'Use os filtros de seguradora/status/período em Recebíveis e confira os totalizadores no topo (faturado, recebido, pendente, divergente).',
      'Em "Prestadores", edite um prestador e defina a "Regra de repasse" (valor fixo ou percentual).',
      'Abra "Repasses" — toda OS finalizada com prestador vira um repasse calculado pela regra dele. Selecione os pendentes de um prestador e clique "Gerar lote".',
      'Na aba "Lotes e histórico", exporte o CSV do lote ou clique "Marcar como pago" (com link de comprovante opcional) — o lote e os repasses dele passam pra "Pago".',
    ],
    pendencias: [
      {
        item: 'Relatório financeiro agendado (envio mensal automático — Card 5.4)',
        motivo: 'A geração de relatório por seguradora sob demanda (exportar CSV a qualquer momento) já funciona. O envio automático periódico (ex.: todo dia 1º, mandar por e-mail pro financeiro do cliente) exige um serviço de agendamento — mesma infraestrutura que falta pra fila real de automações (Fase 5).',
        proximoPasso: 'Quando o agendador (Cloud Scheduler/Cloud Tasks) for provisionado, encaixar esse relatório junto — reaproveita a mesma agregação que já existe, só falta o gatilho automático.',
      },
      {
        item: 'Exportação de lote de pagamento em formato bancário (CNAB — Card 6.2)',
        motivo: 'A geração de lote e a exportação em CSV pra pagamento manual já funcionam. O formato CNAB (o padrão que os bancos usam pra pagamento em lote automático) depende de qual banco a Guedesloc usa pra isso — não há essa decisão nem credencial configurada ainda.',
        proximoPasso: 'Definir o banco e o layout CNAB (240 ou 400) a usar; depois é um formato de exportação adicional, sem mudar o fluxo de geração de lote que já existe.',
      },
    ],
  },
  {
    numero: 8,
    nome: 'Governança, Acesso e Relatórios',
    resumo: 'Perfis de usuário, histórico de ações e relatórios gerenciais.',
    status: 'em_andamento',
    comoTestar: [
      'Abra "Usuários e Permissões" — o primeiro login já aparece como Super Admin automaticamente. Clique "+ Novo usuário" e crie um com perfil "Leitura", anote a senha temporária mostrada.',
      'Faça login com esse novo usuário — repare que a barra lateral mostra só as telas básicas. Tentar digitar a URL de uma tela restrita direto redireciona de volta.',
      'No Dashboard, veja o quadro "Equipe agora" — mostra quem está logado nos últimos 2 minutos.',
      'Abra "Auditoria" — veja os logins e ações registradas, use a busca.',
      'Abra "Relatório Mensal" — ajuste o período e veja os totais por seguradora/cidade/prestador.',
      'Abra "Conferência de OS", cole números de OS (um por linha) e veja quais já estão cadastrados.',
      'Abra "Arquivo" — veja as OS finalizadas/canceladas, pesquisável.',
      'Abra "Configurações" (só Super Admin) — dados da conta, atalhos, e a Zona de Perigo (com confirmação por frase digitada antes de qualquer exclusão).',
    ],
    pendencias: [
      {
        item: 'Regras de segurança do Firestore não publicadas (afeta a proteção anti-autopromoção do Card 14.1)',
        motivo: 'O arquivo firestore.rules já tem a regra que restringe quem pode mudar o perfil de um usuário (só Super Admin), mas ela não pôde ser publicada nesta sessão — o Firebase CLI está logado numa conta Google sem acesso ao projeto do sistema, e a credencial do backend não tem a permissão específica de administrar regras (só de ler/escrever dado). Na prática, hoje ainda vale a regra mais antiga e permissiva pra qualquer usuário autenticado — sem diferença observável no uso normal do sistema, mas é uma proteção de segurança que existe só no código, não em produção.',
        proximoPasso: 'Alguém com acesso de dono/editor ao projeto no Firebase Console precisa rodar `firebase login` com a conta certa (ou publicar as regras direto pela aba "Regras" do Firestore no Console) pra essa proteção passar a valer de verdade.',
      },
    ],
  },
  {
    numero: 9,
    nome: 'Escala',
    resumo: 'Repetição do processo validado para as demais seguradoras parceiras.',
    status: 'planejada',
    pendencias: [
      {
        item: 'Integração com as 4 próximas seguradoras (Mawdy Brasil, Maxpar Assistências, Porto Seguro, Tokio Marine)',
        motivo: 'Diferente da Tempo Assist (Fase 1), não existe hoje nenhum contato comercial/técnico, contrato, acesso a portal ou documentação de API com nenhuma dessas 4 seguradoras — não dá pra começar a integração sem alguém do lado de cada seguradora responder perguntas básicas (existe API? qual autenticação?).',
        proximoPasso: 'Iniciar contato comercial com cada seguradora (geralmente pelo time de relacionamento com prestadores dela) perguntando por integração via API ou portal de prestadores. Assim que houver contato/acesso com qualquer uma delas, essa seguradora específica pode avançar sem esperar as outras três — mesmo processo de descoberta usado com a Tempo Assist.',
      },
    ],
  },
  {
    numero: 10,
    nome: 'Maturidade',
    resumo: 'Robustez operacional, pagamentos automáticos e conformidade com a LGPD.',
    status: 'em_andamento',
    comoTestar: [
      'Resiliência do RPA não tem tela — é um comportamento interno do worker que roda a integração com a Tempo Assist: se o portal falhar ou demorar, ele tenta de novo automaticamente (2-3 vezes) antes de desistir, em vez de simplesmente quebrar.',
      'Em "Tabela de Preços", cadastre ou reajuste um preço — depois abra "Auditoria" e confira a entrada "Alteração de valor", com o valor anterior e o novo.',
      'Em "Repasses", marque um lote como pago — confira em Auditoria a entrada "Pagamento aprovado".',
      'Em "Configurações > Zona de Perigo", apague uma OS de teste — confira em Auditoria a entrada "Exclusão de OS".',
    ],
    pendencias: [
      {
        item: 'Armazenamento de evidências do RPA e de fotos do WhatsApp (Card 4.4)',
        motivo: 'O produto de armazenamento de arquivos do Firebase (Cloud Storage) ainda não foi ativado no projeto — confirmado nesta sessão numa tentativa real de gravação, que retornou "bucket não existe".',
        proximoPasso: 'Ativar o Cloud Storage no Console do Firebase (Storage > Get Started, poucos cliques, sem custo em uso baixo). Depois disso, dá pra guardar prints do RPA quando ele falha, e (gap adicional descoberto neste levantamento) começar a processar fotos de entrega enviadas pelos prestadores no WhatsApp — hoje o sistema só lê o texto das mensagens recebidas, imagens são ignoradas.',
      },
      {
        item: 'Pagamento automático via PIX/banco (Card 6.3)',
        motivo: 'Mesma pendência já registrada na Fase 7: nenhum banco ou plataforma de pagamento foi escolhido, sem credencial de API bancária. O fluxo manual (gerar lote, exportar, pagar fora do sistema, marcar como pago) já funciona — falta só a automação de disparar o PIX direto pelo sistema.',
        proximoPasso: 'Escolher um banco ou plataforma de pagamento em lote (ex.: um banco com API PIX, ou uma plataforma como Iugu/Asaas/Celcoin) e abrir a conta/credenciamento. A partir daí é directo de conectar, seguindo o mesmo padrão já usado pra WhatsApp.',
      },
      {
        item: 'Política de retenção/anonimização de dados pessoais (LGPD, Card 8.3)',
        motivo: 'É uma decisão legal/de negócio (prazo de guarda dos dados, o que precisa ser anonimizado e quando) — não uma decisão técnica que deva ser tomada sem vocês (idealmente com apoio jurídico). O mecanismo técnico de log de auditoria (quem fez o quê, quando, em ações sensíveis) já está pronto e funcionando.',
        proximoPasso: 'Definir com apoio jurídico a política de retenção/anonimização; depois disso, aplicar como regra técnica (ex.: anonimizar dados de cliente de OS com mais de X anos) é um trabalho direto de implementar em cima do que já existe.',
      },
      {
        item: 'Rotação automática de credenciais via Secret Manager (Card 8.4)',
        motivo: 'O cronograma de rotação já está documentado (quais credenciais existem, com que frequência trocar, como trocar cada uma). A automação via Secret Manager do Google Cloud depende de migrar as credenciais dos arquivos .env atuais pra lá — um projeto de infraestrutura à parte, não uma mudança de código do produto.',
        proximoPasso: 'Quando a prioridade de infraestrutura permitir, migrar as credenciais listadas no `backlog/fase-10-maturidade.md` pro Secret Manager e configurar rotação automática nativa dele.',
      },
    ],
  },
]
