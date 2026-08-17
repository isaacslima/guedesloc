-- Detalhes da assistência: modal "Detalhes da assistência" aberto ao clicar
-- no id da OS na aba "novos" (por enquanto só essa aba). Guarda campos bem
-- entendidos como coluna tipada (cliente, valores, agendamento, endereço) e
-- dois campos JSON de fallback com o dump genérico de tudo que apareceu no
-- modal (campos_texto = todo .text-box label->valor, campos_ocultos = todo
-- span[id] oculto) — outros tipos de serviço além de "Fornecimento de
-- Caçamba" provavelmente têm campos diferentes, e esses dois JSON garantem
-- que nada se perde mesmo sem coluna própria pra eles.
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
