-- Migration: Add refresh_tokens table
-- Description: Creates a table to store and track refresh tokens

-- Create refresh_tokens table for tracking JWT refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by TEXT,
    ip_address TEXT,
    user_agent TEXT
);

-- Add indexes for efficient queries
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Add RLS policies for refresh_tokens table
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own refresh tokens
CREATE POLICY "Users can view their own refresh tokens" 
ON refresh_tokens 
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Only service roles can insert, update, or delete tokens
CREATE POLICY "Service roles can manage refresh tokens" 
ON refresh_tokens 
FOR ALL
USING (auth.role() = 'service_role');

-- Add comments for database documentation
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT authentication';
COMMENT ON COLUMN refresh_tokens.id IS 'Unique identifier for the refresh token record';
COMMENT ON COLUMN refresh_tokens.user_id IS 'Reference to the user this token belongs to';
COMMENT ON COLUMN refresh_tokens.token IS 'The actual refresh token (hashed)';
COMMENT ON COLUMN refresh_tokens.created_at IS 'When the token was created';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'When the token expires';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Whether the token has been revoked';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When the token was revoked, if applicable';
COMMENT ON COLUMN refresh_tokens.replaced_by IS 'Reference to the token that replaced this one (token rotation)';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address where the token was issued';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'Browser/device information where the token was issued'; 