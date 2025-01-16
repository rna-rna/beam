
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'galleries' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE galleries ADD COLUMN deleted_at TIMESTAMP;
    END IF;
END $$;
