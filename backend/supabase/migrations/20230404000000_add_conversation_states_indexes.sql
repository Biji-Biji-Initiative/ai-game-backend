-- Add Additional Indexes for Conversation States

-- Add context index for faster lookups by context value
CREATE INDEX IF NOT EXISTS idx_conversation_states_context ON conversation_states(context);

-- Comment on table for documentation
COMMENT ON TABLE conversation_states IS 'Stores conversation state for the OpenAI Responses API, including previous response IDs for stateful conversations'; 