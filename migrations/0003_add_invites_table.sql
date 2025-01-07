
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        user_id TEXT,
        role VARCHAR(20) CHECK(role IN ('Editor', 'Comment', 'View')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT invites_gallery_email_unique UNIQUE(gallery_id, email)
    );

    CREATE INDEX IF NOT EXISTS idx_invites_gallery ON invites(gallery_id);
    CREATE INDEX IF NOT EXISTS idx_invites_user_id ON invites(user_id);

END $$;
