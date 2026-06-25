-- Schema Supabase para o StellarCare

-- 1. Habilitar a extensão pgcrypto para gen_random_uuid() (se não estiver ativada)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabela usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  matricula TEXT NOT NULL UNIQUE,
  cargo TEXT NOT NULL CHECK (cargo IN ('ENF', 'TE', 'AE')),
  email TEXT NOT NULL UNIQUE,
  biometria_hash TEXT,
  stellar_wallet_address TEXT UNIQUE,
  stellar_wallet_secret TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT matricula_formato CHECK (matricula ~ '^\d{6}-(ENF|TE|AE)$')
);

CREATE INDEX idx_usuarios_matricula ON usuarios (matricula);
CREATE INDEX idx_usuarios_cargo ON usuarios (cargo);
CREATE INDEX idx_usuarios_ativo ON usuarios (ativo);

-- 3. Tabela pacientes
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_ficticio TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('M', 'F', 'O')),
  numero_leito TEXT NOT NULL,
  setor TEXT NOT NULL DEFAULT 'Internação Clínica',
  diagnostico_principal TEXT NOT NULL,
  data_internacao DATE NOT NULL,
  medico_responsavel TEXT NOT NULL,
  convenio TEXT,
  alergias TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'internado' 
    CHECK (status IN ('internado', 'alta', 'transferido', 'obito')),
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Como é apenas uma simulação, se não existir usuarios, podemos precisar de um DEFAULT fixo ou permitir NULL (mas o requerimento é REFERENCES)
-- Criamos os indices
CREATE INDEX idx_pacientes_leito ON pacientes (numero_leito);
CREATE INDEX idx_pacientes_status ON pacientes (status);

-- 4. Habilitar RLS nas tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

-- 5. Usuários só veem seus próprios dados ou admins veem todos
CREATE POLICY "usuarios_proprios" ON usuarios
  FOR SELECT USING (auth.uid() = id OR cargo = 'ENF');

-- 6. Pacientes visíveis para todos usuários ativos autenticados
CREATE POLICY "pacientes_leitura" ON pacientes
  FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Apenas ENF e TE podem cadastrar pacientes  
CREATE POLICY "pacientes_insercao" ON pacientes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND cargo IN ('ENF', 'TE')
      AND ativo = true
    )
  );
