
-- Add new columns to notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_id VARCHAR,
  ADD COLUMN IF NOT EXISTS gallery_id INTEGER REFERENCES galleries(id),
  ADD COLUMN IF NOT EXISTS grouped_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS needs_email BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS notifications_gallery_id_idx ON notifications(gallery_id);
