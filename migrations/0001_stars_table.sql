
DO $$ BEGIN
    -- Drop starred column from images table
    ALTER TABLE IF EXISTS images DROP COLUMN IF EXISTS starred;

    -- Create stars table
    CREATE TABLE IF NOT EXISTS stars (
        id SERIAL PRIMARY KEY,
        image_id INTEGER NOT NULL REFERENCES images(id),
        user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT stars_image_user_idx UNIQUE(image_id, user_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS stars_user_id_idx ON stars(user_id);

END $$;
