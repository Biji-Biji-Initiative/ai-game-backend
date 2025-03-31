-- Add example index to challenges table
CREATE INDEX IF NOT EXISTS idx_challenges_title ON challenges(title);

-- Add comment on the challenges table
COMMENT ON TABLE challenges IS 'Stores user challenges with enhanced search capabilities';
