
DO $$ 
BEGIN
    -- First remove the NOT NULL constraint if it exists
    ALTER TABLE folders 
    ALTER COLUMN slug DROP NOT NULL;

    -- Drop unique constraint if it exists
    ALTER TABLE folders 
    DROP CONSTRAINT IF EXISTS folders_slug_key;
END $$;
