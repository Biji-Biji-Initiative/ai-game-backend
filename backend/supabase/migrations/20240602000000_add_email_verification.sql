-- Add email verification fields to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_token_expires TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_is_email_verified ON users(is_email_verified);

-- Add comment to explain the purpose of these fields
COMMENT ON COLUMN users.email_verification_token IS 'Hashed token used for email verification';
COMMENT ON COLUMN users.email_verification_token_expires IS 'Expiration timestamp for the email verification token';
COMMENT ON COLUMN users.is_email_verified IS 'Flag indicating whether the user''s email has been verified';

-- Update RLS policies to ensure only authenticated users can access their own verification data
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);

-- Only allow updates to verification fields by authenticated users (for their own record) or the service role
CREATE POLICY "Users can update their own verification status" ON users 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id); 