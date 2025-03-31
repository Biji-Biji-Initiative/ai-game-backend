-- Create the Dead Letter Queue table for storing failed events
CREATE TABLE IF NOT EXISTS event_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL,
  handler_id TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  correlation_id TEXT,
  source_id TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_dlq_event_name ON event_dead_letter_queue(event_name);
CREATE INDEX IF NOT EXISTS idx_event_dlq_status ON event_dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_event_dlq_created_at ON event_dead_letter_queue(created_at); 