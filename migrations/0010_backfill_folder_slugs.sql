
-- First ensure extension for random string generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update existing rows with random slugs
UPDATE folders 
SET slug = ENCODE(GEN_RANDOM_BYTES(6), 'base64') 
WHERE slug IS NULL;

-- Make slug NOT NULL after backfill
ALTER TABLE folders
ALTER COLUMN slug SET NOT NULL;

-- Ensure unique constraint
ALTER TABLE folders
ADD CONSTRAINT folders_slug_key UNIQUE (slug);
