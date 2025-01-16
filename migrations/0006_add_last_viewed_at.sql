
ALTER TABLE galleries
ADD COLUMN last_viewed_at TIMESTAMP,
ADD COLUMN folder_id INTEGER REFERENCES folders(id),
ADD INDEX galleries_folder_id_idx (folder_id);
