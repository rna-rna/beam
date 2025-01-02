
DO $$ BEGIN
    -- Create stars table if it doesn't exist
    CREATE TABLE IF NOT EXISTS stars (
        id SERIAL PRIMARY KEY,
        image_id INTEGER NOT NULL REFERENCES images(id),
        user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT stars_image_user_idx UNIQUE(image_id, user_id)
    );

    -- Create index for user_id
    CREATE INDEX IF NOT EXISTS stars_user_id_idx ON stars(user_id);

END $$;
