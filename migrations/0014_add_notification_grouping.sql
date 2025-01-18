
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add group_id column
ALTER TABLE notifications 
ADD COLUMN group_id UUID DEFAULT NULL;

-- Add index on group_id for faster lookups
CREATE INDEX notifications_group_id_idx ON notifications(group_id);
