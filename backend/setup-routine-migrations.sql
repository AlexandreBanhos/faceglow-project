-- Script para resolveraceu base e criar tabela routine_completions
-- Execute isso no Supabase SQL Editor

-- 1. Marcar migrações antigas como já aplicadas (para evitar erro ao tentar criar tabelas que já existem)
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES 
('20260409015237_AddMissingScoreColumns', '8.0.0')
ON CONFLICT ("MigrationId") DO NOTHING;

-- 2. Criar a tabela routine_completions se não existir
CREATE TABLE IF NOT EXISTS routine_completions (
    id UUID NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL,
    completion_date DATE NOT NULL,
    morning_completed BOOLEAN DEFAULT FALSE,
    night_completed BOOLEAN DEFAULT FALSE,
    created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_routine_completions_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS ix_routine_completions_user_id ON routine_completions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_routine_completions_user_id_completion_date 
    ON routine_completions(user_id, completion_date);

-- 4. Marcar a nova migração como aplicada
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES 
('20260411212420_AddRoutineCompletions', '8.0.0')
ON CONFLICT ("MigrationId") DO NOTHING;

-- Verificar resultado
SELECT * FROM "__EFMigrationsHistory" WHERE "MigrationId" LIKE '%Routine%' OR "MigrationId" LIKE '%AddMissing%' 
ORDER BY "MigrationId";
