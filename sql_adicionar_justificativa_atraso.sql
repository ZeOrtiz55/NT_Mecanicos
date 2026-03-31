-- ============================================
-- Adicionar coluna 'JustificativaAtraso' na tabela Ordem_Servico_Tecnicos
-- Preenchida pelo técnico quando a data de início é posterior à previsão de execução
-- ============================================

ALTER TABLE "Ordem_Servico_Tecnicos"
ADD COLUMN IF NOT EXISTS "JustificativaAtraso" TEXT;
