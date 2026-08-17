-- Restringe a coleta a novos/reagendados/agendados/cancelados. As duas abas
-- "Em Andamento" (aguardando_chegada, aguardando_finalizacao) ficam de fora:
-- volume alto (1000+ linhas, tabela sem paginação de verdade — carregarTodasAsLinhas
-- teve que rolar a área até o fim pra achar tudo) e não fazem falta pro
-- acompanhamento atual. Reativar depois é só voltar ativo = 1 aqui.
UPDATE aba_config SET ativo = 0
WHERE nome IN ('em_andamento_aguardando_chegada', 'em_andamento_aguardando_finalizacao');

-- A tabela de 'agendados' tem 8 colunas de verdade, não 7: sobra uma coluna
-- 'aceite' depois de confirmacaoChegada, vazia quando o tipo é "Aceite
-- automático" (confirmado com dado real — ver aviso de mismatch no console).
INSERT INTO aba_coluna (aba_id, nome_campo, ordem, clicavel, tipo_acao)
SELECT id, 'aceite', 7, 1, 'aceite' FROM aba_config WHERE nome = 'agendados'
ON DUPLICATE KEY UPDATE ordem = VALUES(ordem), clicavel = VALUES(clicavel), tipo_acao = VALUES(tipo_acao);
