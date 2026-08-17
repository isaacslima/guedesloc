CREATE TABLE IF NOT EXISTS ordens_servico (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  numero_os                 VARCHAR(100) NOT NULL,
  status                    VARCHAR(100) NOT NULL,
  dados_linha               JSON,
  criado_em                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  sincronizado_firebase_em  TIMESTAMP NULL,
  processado                TINYINT(1) DEFAULT 0,
  UNIQUE KEY uk_numero_os (numero_os)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rastreio de mudança de status: uma linha por transição (inclusive a
-- criação, com status_anterior NULL).
CREATE TABLE IF NOT EXISTS ordens_servico_historico (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero_os       VARCHAR(100) NOT NULL,
  status_anterior VARCHAR(100) NULL,
  status_novo     VARCHAR(100) NOT NULL,
  registrado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_numero_os (numero_os)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Detalhes da assistência: modal "Detalhes da assistência" aberto ao clicar
-- no id da OS na aba "novos". campos_texto/campos_ocultos são o dump
-- genérico de tudo que apareceu no modal (fallback pra tipos de serviço
-- ainda não mapeados em coluna própria).
CREATE TABLE IF NOT EXISTS detalhes_assistencia (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  numero_os         VARCHAR(100) NOT NULL,
  assistencia       VARCHAR(100) NULL,
  cliente           VARCHAR(255) NULL,
  segmento          VARCHAR(100) NULL,
  segurado          VARCHAR(255) NULL,
  contato           VARCHAR(255) NULL,
  telefone          VARCHAR(50)  NULL,
  valor_tempo       DECIMAL(10,2) NULL,
  valor_usuario     DECIMAL(10,2) NULL,
  valor_total       DECIMAL(10,2) NULL,
  tipo_acionamento  VARCHAR(50)  NULL,
  nome_servico      VARCHAR(255) NULL,
  descricao         TEXT NULL,
  data_abertura     DATETIME NULL,
  previsao_inicio   DATETIME NULL,
  previsao_fim      DATETIME NULL,
  data_aceite       DATETIME NULL,
  endereco_origem   JSON NULL,
  endereco_destino  JSON NULL,
  condicao_servico  TEXT NULL,
  resumo_problema   TEXT NULL,
  campos_texto      JSON NULL COMMENT 'harvest genérico de todo .text-box do modal (label->valor), inclui os já tipados',
  campos_ocultos    JSON NULL COMMENT 'harvest genérico de todo span[id] do modal, sem tratamento',
  criado_em         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_detalhe_numero_os (numero_os),
  CONSTRAINT fk_detalhe_numero_os FOREIGN KEY (numero_os) REFERENCES ordens_servico(numero_os) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS execucoes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  iniciado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalizado_em TIMESTAMP NULL,
  status        ENUM('em_andamento','sucesso','erro') DEFAULT 'em_andamento',
  os_coletadas  INT DEFAULT 0,
  mensagem      TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Parametrização das abas monitoradas e das colunas de cada uma, para
-- adicionar/ajustar abas sem alterar código (só inserindo/atualizando linhas).
CREATE TABLE IF NOT EXISTS aba_config (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  descricao   VARCHAR(255) NULL,
  ordem       INT NOT NULL COMMENT 'nth-child do painel da aba na tela de Ordens de Serviço',
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_aba_nome (nome),
  UNIQUE KEY uk_aba_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS aba_coluna (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  aba_id      INT NOT NULL,
  nome_campo  VARCHAR(100) NOT NULL COMMENT 'chave salva em ordens_servico.dados_linha',
  ordem       INT NOT NULL COMMENT 'posição do div filho dentro da linha (0-based)',
  clicavel    TINYINT(1) NOT NULL DEFAULT 0,
  tipo_acao   VARCHAR(100) NULL COMMENT 'tipo_acao correspondente em fila_acoes, quando clicavel = 1',
  criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_aba_campo (aba_id, nome_campo),
  UNIQUE KEY uk_aba_coluna_ordem (aba_id, ordem),
  CONSTRAINT fk_aba_coluna_aba FOREIGN KEY (aba_id) REFERENCES aba_config(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO aba_config (nome, descricao, ordem, ativo) VALUES
  ('novos', 'Novos', 1, 1),
  ('reagendados', 'Reagendados', 2, 1),
  ('em_andamento_aguardando_chegada', 'Em Andamento - Aguardando Chegar ao Local', 3, 0),
  ('em_andamento_aguardando_finalizacao', 'Em Andamento - Aguardando Finalizar', 4, 0),
  ('agendados', 'Agendados', 5, 1),
  ('cancelados', 'Cancelados', 6, 1)
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), ordem = VALUES(ordem), ativo = VALUES(ativo);

INSERT INTO aba_coluna (aba_id, nome_campo, ordem, clicavel, tipo_acao)
SELECT aba_config.id, cols.campo, cols.ordem, cols.clicavel, cols.tipo_acao
FROM aba_config
JOIN (
  SELECT 'novos' AS aba_nome, 'servico' AS campo, 0 AS ordem, 0 AS clicavel, NULL AS tipo_acao
  UNION ALL SELECT 'novos', 'status', 1, 0, NULL
  UNION ALL SELECT 'novos', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'novos', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'novos', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'novos', 'midia', 5, 0, NULL
  UNION ALL SELECT 'novos', 'aceite', 6, 1, 'aceite'

  UNION ALL SELECT 'reagendados', 'servico', 0, 0, NULL
  UNION ALL SELECT 'reagendados', 'status', 1, 0, NULL
  UNION ALL SELECT 'reagendados', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'reagendados', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'reagendados', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'reagendados', 'midia', 5, 0, NULL
  UNION ALL SELECT 'reagendados', 'aceite', 6, 1, 'aceite'

  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'servico', 0, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'status', 1, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'midia', 5, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'confirmacaoChegada', 6, 1, 'atualizar_confirmacao_chegada'
  UNION ALL SELECT 'em_andamento_aguardando_chegada', 'funcionario', 7, 1, 'ver_funcionario'

  UNION ALL SELECT 'em_andamento_aguardando_finalizacao', 'servico', 0, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_finalizacao', 'status', 1, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_finalizacao', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_finalizacao', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_finalizacao', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_finalizacao', 'midia', 5, 0, NULL
  UNION ALL SELECT 'em_andamento_aguardando_finalizacao', 'finalizar', 6, 1, 'finalizar'

  UNION ALL SELECT 'agendados', 'servico', 0, 0, NULL
  UNION ALL SELECT 'agendados', 'status', 1, 0, NULL
  UNION ALL SELECT 'agendados', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'agendados', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'agendados', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'agendados', 'midia', 5, 0, NULL
  UNION ALL SELECT 'agendados', 'confirmacaoChegada', 6, 0, NULL
  UNION ALL SELECT 'agendados', 'aceite', 7, 1, 'aceite'

  UNION ALL SELECT 'cancelados', 'servico', 0, 0, NULL
  UNION ALL SELECT 'cancelados', 'status', 1, 0, NULL
  UNION ALL SELECT 'cancelados', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'cancelados', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'cancelados', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'cancelados', 'midia', 5, 0, NULL
) cols ON cols.aba_nome = aba_config.nome
ON DUPLICATE KEY UPDATE ordem = VALUES(ordem), clicavel = VALUES(clicavel), tipo_acao = VALUES(tipo_acao);

-- Fila de ações: o "trigger manual" (ou um sistema externo) publica aqui
-- (numero_os, tipo_acao[, payload]) e a automação consome no fim de cada
-- execução (ver processarFilaAcoes em src/acoes.ts).
CREATE TABLE IF NOT EXISTS fila_acoes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero_os       VARCHAR(100) NOT NULL,
  tipo_acao       VARCHAR(100) NOT NULL,
  payload         JSON NULL,
  status          ENUM('pendente','em_execucao','concluido','erro') NOT NULL DEFAULT 'pendente',
  tentativas      INT NOT NULL DEFAULT 0,
  mensagem_erro   TEXT NULL,
  criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  iniciado_em     TIMESTAMP NULL,
  concluido_em    TIMESTAMP NULL,
  KEY idx_status (status),
  KEY idx_numero_os (numero_os)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Esse init.sql já cria o schema final diretamente (só roda em bancos novos,
-- na primeira subida do container). Registra a migração 001 como já aplicada
-- para o migrate.ts não tentar rodar o ALTER/CREATE dela (que assume o schema
-- antigo) por cima de um banco que já nasceu no formato novo.
CREATE TABLE IF NOT EXISTS schema_migrations (
  nome        VARCHAR(255) NOT NULL PRIMARY KEY,
  aplicado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO schema_migrations (nome) VALUES
  ('001_status_historico_parametrizacao.sql'),
  ('002_abas_agendados_cancelados.sql'),
  ('003_desativar_em_andamento_e_coluna_aceite_agendados.sql'),
  ('004_detalhes_assistencia.sql'),
  ('005_sincronizado_firebase.sql');
