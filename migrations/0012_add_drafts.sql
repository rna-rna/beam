
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true NOT NULL;
