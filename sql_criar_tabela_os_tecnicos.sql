-- =============================================
-- TABELA: Ordem_Servico_Tecnicos
-- Preenchida pelo técnico no app mobile
-- =============================================
CREATE TABLE IF NOT EXISTS "Ordem_Servico_Tecnicos" (
  "IdOs" BIGSERIAL PRIMARY KEY,
  "NumOs" TEXT,
  "Ordem_Servico" TEXT,
  "TecResp1" TEXT,
  "TemTec" BOOLEAN DEFAULT FALSE,
  "TecResp2" TEXT,
  "Motivo" TEXT,
  "TipoServico" TEXT,
  "TipoRev" TEXT,
  "Projeto" TEXT,
  "DataInicio" TEXT,
  "DataFinal" TEXT,
  "InicioHora" TEXT,
  "FinalHora" TEXT,
  "InicioKm" TEXT,
  "FinalKm" TEXT,
  "AdicionarData2" BOOLEAN DEFAULT FALSE,
  "DataInicio2" TEXT,
  "InicioHora2" TEXT,
  "FinalHora2" TEXT,
  "InicioKm2" TEXT,
  "FinalKm2" TEXT,
  "AdicionarData3" BOOLEAN DEFAULT FALSE,
  "DataInicio3" TEXT,
  "InicioHora3" TEXT,
  "FinaHora3" TEXT,
  "InicioKm3" TEXT,
  "FinalKm3" TEXT,
  "TotalHora" TEXT,
  "TotalKm" TEXT,
  "Horimetro" TEXT,
  "Garantia" BOOLEAN DEFAULT FALSE,
  "FotoHorimetro" TEXT,
  "FotoChassis" TEXT,
  "FotoFrente" TEXT,
  "FotoDireita" TEXT,
  "FotoEsquerda" TEXT,
  "FotoTraseira" TEXT,
  "FotoVolante" TEXT,
  "TratorLocal1" TEXT,
  "TratorLocal2" TEXT,
  "FotoFalha1" TEXT,
  "FotoFalha2" TEXT,
  "FotoFalha3" TEXT,
  "FotoFalha4" TEXT,
  "FotoPecaNova1" TEXT,
  "FotoPecaNova2" TEXT,
  "FotoPecaInstalada1" TEXT,
  "FotoPecaInstalada2" TEXT,
  "NumPlaca" TEXT,
  "Data" TEXT,
  "Status" TEXT DEFAULT 'rascunho',
  "NomResp" TEXT,
  "AssCliente" TEXT,
  "AssTecnico" TEXT,
  "pdf_criado" BOOLEAN DEFAULT FALSE
);

-- Index para busca por OS
CREATE INDEX IF NOT EXISTS idx_os_tecnicos_ordem ON "Ordem_Servico_Tecnicos" ("Ordem_Servico");

-- Habilitar RLS (desabilitado para anon poder inserir durante dev)
-- ALTER TABLE "Ordem_Servico_Tecnicos" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir tudo para anon" ON "Ordem_Servico_Tecnicos" FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE "Ordem_Servico_Tecnicos";
