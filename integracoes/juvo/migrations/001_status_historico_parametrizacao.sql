-- Migração para bancos criados com o init.sql antigo (div_origem, sem status,
-- sem historico, sem parametrização de abas/colunas, sem fila de ações).
-- Em bancos novos (init.sql atual), esse schema já nasce pronto e essa
-- migração é registrada como aplicada automaticamente — ver final do arquivo.

-- 1) ordens_servico: introduz status parametrizável + timestamps de rastreio
ALTER TABLE ordens_servico
  ADD COLUMN status VARCHAR(100) NULL AFTER numero_os,
  ADD COLUMN atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER coletado_em;

UPDATE ordens_servico SET status = COALESCE(div_origem, 'desconhecido') WHERE status IS NULL;

ALTER TABLE ordens_servico
  MODIFY COLUMN status VARCHAR(100) NOT NULL,
  CHANGE COLUMN coletado_em criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  DROP COLUMN div_origem;

-- 2) Rastreio de mudança de status: uma linha por transição (status_anterior
-- NULL na criação do registro).
CREATE TABLE IF NOT EXISTS ordens_servico_historico (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero_os       VARCHAR(100) NOT NULL,
  status_anterior VARCHAR(100) NULL,
  status_novo     VARCHAR(100) NOT NULL,
  registrado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_numero_os (numero_os)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Parametrização das abas monitoradas e das colunas de cada uma, para
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

-- Seed com as 4 abas já mapeadas e suas colunas.
INSERT INTO aba_config (nome, descricao, ordem) VALUES
  ('novos', 'Novos', 1),
  ('reagendados', 'Reagendados', 2),
  ('em_andamento_aguardando_chegada', 'Em Andamento - Aguardando Chegar ao Local', 3),
  ('em_andamento_aguardando_finalizacao', 'Em Andamento - Aguardando Finalizar', 4)
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), ordem = VALUES(ordem);

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
) cols ON cols.aba_nome = aba_config.nome
ON DUPLICATE KEY UPDATE ordem = VALUES(ordem), clicavel = VALUES(clicavel), tipo_acao = VALUES(tipo_acao);

-- 4) Fila de ações: o "trigger manual" (ou um sistema externo) publica aqui
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
