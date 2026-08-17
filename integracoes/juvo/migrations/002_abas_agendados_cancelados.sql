-- Duas novas abas: Agendados (nth-child 5) e Cancelados (nth-child 6).
--
-- Agendados: mesma estrutura base + confirmacaoChegada, mas essa coluna
-- aparece desabilitada (não clicável) nessa aba — diferente de
-- em_andamento_aguardando_chegada, onde é uma ação real. Por isso
-- clicavel = 0 aqui mesmo sendo o mesmo nome de campo.
--
-- Cancelados: estrutura incerta (não há nenhum cancelado no momento para
-- inspecionar; pode ou não ter 'aceite'). Cadastrado só com as colunas base;
-- o dump automático de HTML (processarAba em src/scraper.ts, quando o painel
-- está vazio) e o aviso de "esperava N colunas, encontrou M" no console vão
-- sinalizar se essa suposição estiver errada assim que houver um item real.
INSERT INTO aba_config (nome, descricao, ordem) VALUES
  ('agendados', 'Agendados', 5),
  ('cancelados', 'Cancelados', 6)
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), ordem = VALUES(ordem);

INSERT INTO aba_coluna (aba_id, nome_campo, ordem, clicavel, tipo_acao)
SELECT aba_config.id, cols.campo, cols.ordem, cols.clicavel, cols.tipo_acao
FROM aba_config
JOIN (
  SELECT 'agendados' AS aba_nome, 'servico' AS campo, 0 AS ordem, 0 AS clicavel, NULL AS tipo_acao
  UNION ALL SELECT 'agendados', 'status', 1, 0, NULL
  UNION ALL SELECT 'agendados', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'agendados', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'agendados', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'agendados', 'midia', 5, 0, NULL
  UNION ALL SELECT 'agendados', 'confirmacaoChegada', 6, 0, NULL

  UNION ALL SELECT 'cancelados', 'servico', 0, 0, NULL
  UNION ALL SELECT 'cancelados', 'status', 1, 0, NULL
  UNION ALL SELECT 'cancelados', 'tempo', 2, 0, NULL
  UNION ALL SELECT 'cancelados', 'etapa', 3, 0, NULL
  UNION ALL SELECT 'cancelados', 'tipo', 4, 0, NULL
  UNION ALL SELECT 'cancelados', 'midia', 5, 0, NULL
) cols ON cols.aba_nome = aba_config.nome
ON DUPLICATE KEY UPDATE ordem = VALUES(ordem), clicavel = VALUES(clicavel), tipo_acao = VALUES(tipo_acao);
