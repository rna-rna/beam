
-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);

-- Create gallery_folders table for many-to-many relationship
CREATE TABLE IF NOT EXISTS gallery_folders (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS gallery_folders_gallery_id_idx ON gallery_folders(gallery_id);
CREATE INDEX IF NOT EXISTS gallery_folders_folder_id_idx ON gallery_folders(folder_id);

-- Add last_viewed_at to galleries if it doesn't exist
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id);

CREATE INDEX IF NOT EXISTS galleries_folder_id_idx ON galleries(folder_id);
-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);

-- Create gallery_folders table for many-to-many relationship
CREATE TABLE IF NOT EXISTS gallery_folders (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS gallery_folders_gallery_id_idx ON gallery_folders(gallery_id);
CREATE INDEX IF NOT EXISTS gallery_folders_folder_id_idx ON gallery_folders(folder_id);

-- Add last_viewed_at to galleries if it doesn't exist
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id);

CREATE INDEX IF NOT EXISTS galleries_folder_id_idx ON galleries(folder_id);
