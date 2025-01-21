
CREATE TABLE IF NOT EXISTS cached_users (
    user_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    image_url TEXT,
    color TEXT NOT NULL DEFAULT '#F24822',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS cached_users_updated_at_idx ON cached_users(updated_at);
