
CREATE TABLE cached_users (
  user_id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for updated_at to help with cleanup queries
CREATE INDEX cached_users_updated_at_idx ON cached_users(updated_at);
