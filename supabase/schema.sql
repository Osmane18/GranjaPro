-- NutriEscola — Schema completo
-- Execute este SQL no Supabase SQL Editor (projeto NutriEscola)

-- ============================================================
-- EXTENSÕES
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: escolas
-- ============================================================
create table if not exists escolas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  endereco text,
  diretor text,
  telefone text,
  total_alunos integer,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: user_profiles
-- ============================================================
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'merendeira', -- admin | nutricionista | diretor | merendeira
  escola_id uuid references escolas(id),
  escola_nome text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: alunos
-- ============================================================
create table if not exists alunos (
  id uuid primary key default uuid_generate_v4(),
  escola_id uuid references escolas(id) on delete cascade,
  nome text not null,
  turma text,
  turno text, -- Manhã | Tarde | Integral | Noite
  data_nascimento date,
  restricoes text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: cardapios
-- ============================================================
create table if not exists cardapios (
  id uuid primary key default uuid_generate_v4(),
  escola_id uuid references escolas(id) on delete cascade,
  data date not null,
  refeicao text not null, -- Desjejum | Lanche da Manhã | Almoço | Lanche da Tarde | Jantar
  itens text[] default '{}',
  created_at timestamptz default now(),
  unique(escola_id, data, refeicao)
);

-- ============================================================
-- TABELA: confirmacoes_refeicao
-- ============================================================
create table if not exists confirmacoes_refeicao (
  id uuid primary key default uuid_generate_v4(),
  escola_id uuid references escolas(id) on delete cascade,
  data date not null,
  refeicao text not null,
  qtd_prevista integer,
  qtd_servida integer not null,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(escola_id, data, refeicao)
);

-- ============================================================
-- TABELA: sobras_perdas
-- ============================================================
create table if not exists sobras_perdas (
  id uuid primary key default uuid_generate_v4(),
  escola_id uuid references escolas(id) on delete cascade,
  data date not null,
  refeicao text not null,
  item text not null,
  quantidade numeric not null,
  motivo text, -- Sobra | Perda | Vencimento | Não entregue
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: estoque
-- ============================================================
create table if not exists estoque (
  id uuid primary key default uuid_generate_v4(),
  escola_id uuid references escolas(id) on delete cascade,
  nome text not null,
  categoria text,
  quantidade numeric not null default 0,
  unidade text default 'kg',
  minimo numeric,
  validade date,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table escolas enable row level security;
alter table user_profiles enable row level security;
alter table alunos enable row level security;
alter table cardapios enable row level security;
alter table confirmacoes_refeicao enable row level security;
alter table sobras_perdas enable row level security;
alter table estoque enable row level security;

-- Políticas: usuários autenticados têm acesso total (controle de role é feito no frontend)
create policy "acesso_autenticado" on escolas for all using (auth.role() = 'authenticated');
create policy "acesso_autenticado" on user_profiles for all using (auth.role() = 'authenticated');
create policy "acesso_autenticado" on alunos for all using (auth.role() = 'authenticated');
create policy "acesso_autenticado" on cardapios for all using (auth.role() = 'authenticated');
create policy "acesso_autenticado" on confirmacoes_refeicao for all using (auth.role() = 'authenticated');
create policy "acesso_autenticado" on sobras_perdas for all using (auth.role() = 'authenticated');
create policy "acesso_autenticado" on estoque for all using (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGER: criar perfil ao cadastrar usuário
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'merendeira'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- DADOS INICIAIS (opcional — remova se não quiser)
-- ============================================================
-- Após criar o primeiro usuário pelo painel do Supabase,
-- execute este UPDATE para torná-lo admin:
-- UPDATE user_profiles SET role = 'admin' WHERE id = 'SEU_USER_ID_AQUI';
