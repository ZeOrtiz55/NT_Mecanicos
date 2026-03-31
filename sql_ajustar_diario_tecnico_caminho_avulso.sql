-- Permitir id_ordem nulo (caminho avulso, sem OS)
ALTER TABLE "Diario_Tecnico" ALTER COLUMN id_ordem DROP NOT NULL;

-- Adicionar coluna descricao se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Diario_Tecnico' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE "Diario_Tecnico" ADD COLUMN descricao TEXT;
  END IF;
END $$;
