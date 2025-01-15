
DO $$ 
BEGIN
    -- First, create a temporary table to store orphaned comment IDs
    CREATE TEMP TABLE orphaned_comments AS
    SELECT id 
    FROM comments 
    WHERE image_id NOT IN (SELECT id FROM images);

    -- Log the number of orphaned comments found
    RAISE NOTICE 'Found % orphaned comments', (SELECT COUNT(*) FROM orphaned_comments);

    -- Delete the orphaned comments
    DELETE FROM comments 
    WHERE id IN (SELECT id FROM orphaned_comments);

    -- Drop the temporary table
    DROP TABLE orphaned_comments;

    -- Ensure the foreign key constraint is in place
    ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_image_id_fkey,
    ADD CONSTRAINT comments_image_id_fkey 
    FOREIGN KEY (image_id) 
    REFERENCES images(id) 
    ON DELETE CASCADE;

END $$;
