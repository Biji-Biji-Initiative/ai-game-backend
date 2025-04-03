-- Migration for creating admin functions that bypass RLS
-- This migration adds stored procedures for admin operations

-- Function to delete a user and all their associated data
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete in reverse order to avoid foreign key constraints

    -- Delete user's conversation states
    DELETE FROM conversation_states
    WHERE conversation_id IN (
        SELECT id FROM conversations WHERE user_id = $1
    );

    -- Delete user's conversations
    DELETE FROM conversations
    WHERE user_id = $1;

    -- Delete user's personality insights
    DELETE FROM personality_insights
    WHERE profile_id IN (
        SELECT id FROM personality_profiles WHERE user_id = $1
    );

    -- Delete user's personality profiles
    DELETE FROM personality_profiles
    WHERE user_id = $1;

    -- Delete user's evaluation records
    DELETE FROM evaluations
    WHERE user_id = $1;

    -- Delete user's progress records
    DELETE FROM user_progress
    WHERE user_id = $1;

    -- Delete user's challenges
    DELETE FROM challenges
    WHERE user_email IN (
        SELECT email FROM users WHERE id = $1
    );

    -- Finally, delete the user record
    DELETE FROM users
    WHERE id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user(UUID) IS 'Admin function to delete a user and all their associated data. Uses SECURITY DEFINER to bypass RLS.';

-- Create a stored procedure to add the admin role to a user
CREATE OR REPLACE FUNCTION add_admin_role(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = 
        CASE 
            WHEN raw_app_meta_data IS NULL THEN 
                jsonb_build_object('role', 'admin')
            ELSE 
                raw_app_meta_data || jsonb_build_object('role', 'admin')
        END
    WHERE id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_admin_role(UUID) IS 'Admin function to grant admin role to a user. Uses SECURITY DEFINER to bypass RLS.';

-- Create a stored procedure to remove the admin role from a user
CREATE OR REPLACE FUNCTION remove_admin_role(user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_meta jsonb;
BEGIN
    -- Get current metadata
    SELECT raw_app_meta_data INTO current_meta 
    FROM auth.users 
    WHERE id = $1;
    
    -- Remove role field
    IF current_meta IS NOT NULL AND current_meta ? 'role' THEN
        UPDATE auth.users
        SET raw_app_meta_data = current_meta - 'role'
        WHERE id = $1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_admin_role(UUID) IS 'Admin function to remove admin role from a user. Uses SECURITY DEFINER to bypass RLS.'; 