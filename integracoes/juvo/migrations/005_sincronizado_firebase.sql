-- Marcador de auditoria de quando a OS foi enviada com sucesso (ou já
-- reconhecida como duplicata) pro Gateway/Firestore. Não é a fonte da
-- integridade — isso vem do Firestore usar o idempotencyKey como ID do
-- documento (reenvio só sobrescreve, nunca duplica) — só ajuda a saber, sem
-- reconsultar o Gateway, o que já foi tentado enviar.
ALTER TABLE ordens_servico
  ADD COLUMN sincronizado_firebase_em TIMESTAMP NULL AFTER atualizado_em;
