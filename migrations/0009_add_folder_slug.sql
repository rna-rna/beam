
-- Add slug column to folders table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE folders ALTER COLUMN slug SET NOT NULL;
ALTER TABLE folders ADD CONSTRAINT folders_slug_unique UNIQUE (slug);

-- Generate slugs for existing folders using id
UPDATE folders SET slug = CONCAT('folder-', id::text) WHERE slug IS NULL;
