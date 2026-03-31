-- Adiciona campo para registrar justificativa quando uma requisição é desvinculada de uma OS
-- e campo para registrar quem desvinculou
ALTER TABLE "Requisicao" ADD COLUMN IF NOT EXISTS desvinculado_justificativa TEXT DEFAULT NULL;
ALTER TABLE "Requisicao" ADD COLUMN IF NOT EXISTS desvinculado_por TEXT DEFAULT NULL;
ALTER TABLE "Requisicao" ADD COLUMN IF NOT EXISTS desvinculado_em TIMESTAMPTZ DEFAULT NULL;
