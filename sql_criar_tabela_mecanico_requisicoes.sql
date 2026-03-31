-- ============================================
-- TABELA: mecanico_requisicoes
-- Requisições de peças/materiais/serviços dos técnicos
-- ============================================

CREATE TABLE IF NOT EXISTS mecanico_requisicoes (
  id BIGSERIAL PRIMARY KEY,
  id_ordem TEXT,
  tecnico_nome TEXT NOT NULL,
  material_solicitado TEXT NOT NULL,
  quantidade TEXT,
  urgencia TEXT NOT NULL DEFAULT 'normal',
  motivo TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  atualizada_pelo_tecnico BOOLEAN DEFAULT FALSE,
  data_aprovacao TIMESTAMPTZ,
  cancelamento_solicitado BOOLEAN DEFAULT FALSE,
  cancelamento_justificativa TEXT,
  cancelamento_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mec_req_tecnico ON mecanico_requisicoes (tecnico_nome);
CREATE INDEX IF NOT EXISTS idx_mec_req_status ON mecanico_requisicoes (status);
CREATE INDEX IF NOT EXISTS idx_mec_req_ordem ON mecanico_requisicoes (id_ordem);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mecanico_requisicoes;
