
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        user_id TEXT,
        role TEXT CHECK(role IN ('Edit', 'Comment', 'View')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT invites_gallery_email_unique UNIQUE(gallery_id, email)
    );

    -- Add index on user_id
    CREATE INDEX IF NOT EXISTS invites_user_id_idx ON invites(user_id);

END $$;
