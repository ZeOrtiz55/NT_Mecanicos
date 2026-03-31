-- ============================================
-- Adicionar coluna 'role' na tabela mecanico_usuarios
-- Valores: 'tecnico' ou 'admin'
-- ============================================

ALTER TABLE mecanico_usuarios
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'tecnico';

-- Pode deletar a tabela mecanico_admins se criou antes
-- DROP TABLE IF EXISTS mecanico_admins;
