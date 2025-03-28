-- Add conversation states table for persistent OpenAI state management
CREATE TABLE IF NOT EXISTS conversation_states (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  context VARCHAR(255) NOT NULL, 
  last_response_id VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_conversation_states_user_id ON conversation_states(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_context ON conversation_states(context);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_states_user_context ON conversation_states(user_id, context);

-- Add comment
COMMENT ON TABLE conversation_states IS 'Stores conversation state for the OpenAI Responses API, including previous_response_id for stateful conversations'; 