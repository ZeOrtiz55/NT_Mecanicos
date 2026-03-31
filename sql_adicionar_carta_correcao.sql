-- Adicionar coluna CartaCorrecao na tabela Ordem_Servico_Tecnicos
ALTER TABLE "Ordem_Servico_Tecnicos"
ADD COLUMN IF NOT EXISTS "CartaCorrecao" TEXT DEFAULT NULL;
