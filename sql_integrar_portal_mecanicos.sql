-- =============================================
-- Integração Portal ↔ NT Mecânicos
-- Adiciona controle de papéis do app mecânicos
-- na tabela portal_permissoes (gerenciada pelo portal)
-- =============================================

-- 1. Adicionar colunas de papel mecânicos na portal_permissoes
ALTER TABLE portal_permissoes
  ADD COLUMN IF NOT EXISTS mecanico_role TEXT CHECK (mecanico_role IN ('tecnico', 'observador')),
  ADD COLUMN IF NOT EXISTS mecanico_tecnico_nome TEXT;

-- mecanico_role:
--   NULL = sem acesso ao app mecânicos
--   'tecnico' = acesso completo (criar OS, requisições, etc.)
--   'observador' = apenas visualização
-- mecanico_tecnico_nome:
--   Nome do técnico na Tecnicos_Appsheet (para filtrar OS)
--   Obrigatório quando mecanico_role = 'tecnico'

-- 2. RLS: garantir que usuários autenticados possam ler seus próprios dados
-- (pode já existir — o IF NOT EXISTS do CREATE POLICY não existe, então usamos DO block)

DO $$
BEGIN
  -- Permitir usuário ler sua própria permissão
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'portal_permissoes' AND policyname = 'Users can read own permissoes'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own permissoes" ON portal_permissoes FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  -- Permitir usuário ler seu próprio perfil do portal
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financeiro_usu' AND policyname = 'Users can read own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own profile" ON financeiro_usu FOR SELECT USING (auth.uid() = id)';
  END IF;
END $$;

-- 3. Migração: vincular técnicos existentes do mecanico_usuarios ao portal
-- (executar apenas uma vez, após criar as colunas)
-- Descomente e execute manualmente se necessário:

-- UPDATE portal_permissoes pp
-- SET mecanico_role = 'tecnico',
--     mecanico_tecnico_nome = COALESCE(mu.nome_pos, mu.tecnico_nome)
-- FROM mecanico_usuarios mu
-- JOIN financeiro_usu fu ON fu.email = mu.tecnico_email
-- WHERE pp.user_id = fu.id
--   AND mu.ativo = true
--   AND mu.role = 'tecnico';
