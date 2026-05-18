ALTER TABLE skin_profiles
  ADD COLUMN IF NOT EXISTS lifestyle_questionnaire_completed_at TIMESTAMPTZ;
