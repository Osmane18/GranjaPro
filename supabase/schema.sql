-- GranjaPro - Schema completo
-- Execute este SQL no Supabase SQL Editor

-- ============================================================
-- TABELA: galpoes
-- ============================================================
CREATE TABLE IF NOT EXISTS galpoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  capacidade INTEGER,
  localizacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE galpoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "galpoes_owner" ON galpoes USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- ============================================================
-- TABELA: lotes
-- ============================================================
CREATE TABLE IF NOT EXISTS lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  galpao_id UUID NOT NULL REFERENCES galpoes(id) ON DELETE CASCADE,
  numero_lote TEXT,
  data_entrada DATE NOT NULL,
  data_saida DATE,
  data_previsao_abate DATE,
  quantidade_pintinhos INTEGER NOT NULL,
  peso_medio_entrada NUMERIC,
  integradora TEXT DEFAULT 'Vibra',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lotes_owner" ON lotes USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- ============================================================
-- TABELA: registros_diarios
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  data_registro DATE NOT NULL,
  mortalidade INTEGER DEFAULT 0,
  peso_medio_g NUMERIC,
  temperatura_max NUMERIC,
  temperatura_min NUMERIC,
  umidade NUMERIC,
  consumo_agua_l NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE registros_diarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registros_owner" ON registros_diarios USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- ============================================================
-- TABELA: consumo_agua
-- ============================================================
CREATE TABLE IF NOT EXISTS consumo_agua (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  galpao_id UUID NOT NULL REFERENCES galpoes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  consumo_litros NUMERIC NOT NULL,
  leitura_hidrometro NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consumo_agua ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agua_owner" ON consumo_agua USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- ============================================================
-- TABELA: consumo_racao
-- ============================================================
CREATE TABLE IF NOT EXISTS consumo_racao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  galpao_id UUID NOT NULL REFERENCES galpoes(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  tipo_racao TEXT DEFAULT 'Inicial',
  quantidade_kg NUMERIC NOT NULL,
  tipo_movimento TEXT NOT NULL DEFAULT 'consumo' CHECK (tipo_movimento IN ('entrada', 'consumo')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consumo_racao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "racao_owner" ON consumo_racao USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- ============================================================
-- TABELA: ocorrencias
-- ============================================================
CREATE TABLE IF NOT EXISTS ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  galpao_id UUID REFERENCES galpoes(id) ON DELETE SET NULL,
  galpao_nome TEXT,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  gravidade TEXT NOT NULL DEFAULT 'media' CHECK (gravidade IN ('alta', 'media', 'baixa')),
  resolvida BOOLEAN DEFAULT false,
  data_resolucao DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocorrencias_owner" ON ocorrencias USING (auth.uid() = produtor_id) WITH CHECK (auth.uid() = produtor_id);

-- Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
