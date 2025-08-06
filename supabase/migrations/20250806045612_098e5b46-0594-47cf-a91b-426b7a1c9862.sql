-- Delete the user romneath.song@gmail.com from auth.users
-- This will cascade to all auth-related tables

-- First, let's confirm the user exists and get their details
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user details
    SELECT id, email, created_at INTO user_record
    FROM auth.users 
    WHERE email = 'romneath.song@gmail.com';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'User romneath.song@gmail.com not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user: ID=%, Email=%, Created=%', user_record.id, user_record.email, user_record.created_at;
    
    -- Delete the user (this will cascade to related auth tables)
    DELETE FROM auth.users WHERE id = user_record.id;
    
    RAISE NOTICE 'Successfully deleted user romneath.song@gmail.com';
END $$;