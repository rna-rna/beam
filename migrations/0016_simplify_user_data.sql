
DO $$ BEGIN
    -- Remove user name and image columns from comments
    ALTER TABLE comments 
    DROP COLUMN IF EXISTS user_name,
    DROP COLUMN IF EXISTS user_image_url;

    -- Ensure FK relationship with cached_users
    ALTER TABLE comments
    ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES cached_users(user_id);

    ALTER TABLE stars
    ADD CONSTRAINT stars_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES cached_users(user_id);
END $$;
