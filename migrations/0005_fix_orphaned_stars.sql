
DO $$ 
BEGIN
    -- First, create a temporary table to store orphaned star IDs
    CREATE TEMP TABLE orphaned_stars AS
    SELECT id 
    FROM stars 
    WHERE image_id NOT IN (SELECT id FROM images);

    -- Log the number of orphaned stars found
    RAISE NOTICE 'Found % orphaned stars', (SELECT COUNT(*) FROM orphaned_stars);

    -- Delete the orphaned stars
    DELETE FROM stars 
    WHERE id IN (SELECT id FROM orphaned_stars);

    -- Drop the temporary table
    DROP TABLE orphaned_stars;

    -- Ensure the foreign key constraint is in place with cascade delete
    ALTER TABLE stars
    DROP CONSTRAINT IF EXISTS stars_image_id_fkey,
    ADD CONSTRAINT stars_image_id_fkey 
    FOREIGN KEY (image_id) 
    REFERENCES images(id) 
    ON DELETE CASCADE;

END $$;
