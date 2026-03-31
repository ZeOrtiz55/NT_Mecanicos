-- ============================================
-- TABELA: solicitacao_agendamento
-- Técnico solicita agendamento → Admin aprova/recusa
-- ============================================

CREATE TABLE IF NOT EXISTS solicitacao_agendamento (
  id BIGSERIAL PRIMARY KEY,
  tecnico_nome TEXT NOT NULL,
  cliente TEXT NOT NULL,
  descricao TEXT,
  data_sugerida TEXT NOT NULL,
  turno TEXT NOT NULL DEFAULT 'manha',
  urgencia TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por status
CREATE INDEX IF NOT EXISTS idx_solic_agend_status ON solicitacao_agendamento (status);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE solicitacao_agendamento;
