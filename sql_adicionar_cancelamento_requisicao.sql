-- ============================================
-- Adicionar campos de cancelamento na mecanico_requisicoes
-- Técnico solicita cancelamento → Admin aprova/recusa
-- ============================================

ALTER TABLE mecanico_requisicoes
  ADD COLUMN IF NOT EXISTS cancelamento_solicitado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelamento_justificativa TEXT,
  ADD COLUMN IF NOT EXISTS cancelamento_status TEXT DEFAULT NULL; -- NULL, 'pendente', 'aprovado', 'recusado'
