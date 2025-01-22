
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    contact_user_id TEXT,
    contact_email TEXT NOT NULL,
    invite_count INTEGER DEFAULT 1 NOT NULL,
    last_invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_owner_email_idx ON contacts(owner_user_id, contact_email);
