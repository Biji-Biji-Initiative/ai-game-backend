-- Function to auto-confirm test users
CREATE OR REPLACE FUNCTION public.auto_confirm_test_users()
    RETURNS trigger
AS $$
BEGIN
    -- Check if the email matches our test pattern
    IF NEW.email LIKE 'test%@test.com' THEN
        -- Set confirmation fields
        NEW.email_confirmed_at := NOW();
        NEW.confirmed_at := NOW();
        NEW.last_sign_in_at := NOW();
        NEW.confirmation_sent_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-confirm test users
DROP TRIGGER IF EXISTS auto_confirm_test_users ON auth.users;
CREATE TRIGGER auto_confirm_test_users
    BEFORE INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_test_users();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres, service_role; 