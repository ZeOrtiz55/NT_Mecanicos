-- Novas colunas para Ordem_Servico_Tecnicos
ALTER TABLE "Ordem_Servico_Tecnicos" ADD COLUMN IF NOT EXISTS "ServicoRealizado" TEXT;
ALTER TABLE "Ordem_Servico_Tecnicos" ADD COLUMN IF NOT EXISTS "Chassis" TEXT;
ALTER TABLE "Ordem_Servico_Tecnicos" ADD COLUMN IF NOT EXISTS "PecasInfo" TEXT;
