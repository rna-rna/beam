
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    data JSONB NOT NULL,
    is_seen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries on user_id and is_seen
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_user_seen_idx ON notifications(user_id, is_seen);
