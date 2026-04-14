-- Migration: Add brief content columns to parcours_steps
-- Story: 6.2 — Consultation des briefs par étape — Teasing MonprojetPro One

-- 1. Add columns for brief content, assets, and One teasing message
ALTER TABLE parcours_steps
  ADD COLUMN IF NOT EXISTS brief_content TEXT,
  ADD COLUMN IF NOT EXISTS brief_assets JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS one_teasing_message TEXT;

-- 2. Migrate existing data: copy brief_template to brief_content where available
UPDATE parcours_steps
SET brief_content = brief_template
WHERE brief_template IS NOT NULL AND brief_content IS NULL;
