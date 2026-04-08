-- GranjaPro - Schema v2 (novas funcionalidades)
-- Execute este SQL no Supabase SQL Editor

-- ============================================================
-- TABELA: medicamentos (vacinas e remédios)
-- ============================================================
CREATE TABLE IF NOT EXISTS medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  galpao_id UUID REFERENCES galpoes(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'vacina' CHECK (tipo IN ('vacina', 'medicamento', 'vitamina', 'outro')),
  produto TEXT NOT NULL,
  dose TEXT,
  via_aplicacao TEXT,
  quantidade_aves INTEGER,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicamentos_owner" ON medicamentos USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- ============================================================
-- TABELA: despesas
-- ============================================================
CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  galpao_id UUID REFERENCES galpoes(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "despesas_owner" ON despesas USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- ============================================================
-- COLUNAS DE ABATE na tabela lotes (se não existirem)
-- ============================================================
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS peso_medio_abate_kg NUMERIC;
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS total_caixas INTEGER;
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS valor_recebido NUMERIC;
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS numero_aves_abatidas INTEGER;
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS whatsapp_alerta TEXT;

NOTIFY pgrst, 'reload schema';
