-- Update Focus Areas Schema
-- These changes add additional fields to the focus_areas table

-- No need to modify the description constraint as it was already handled in the initial schema

-- Add indexes for the new fields for better query performance
CREATE INDEX IF NOT EXISTS idx_focus_areas_relevance_score ON focus_areas(relevance_score);
CREATE INDEX IF NOT EXISTS idx_focus_areas_is_selected ON focus_areas(is_selected);
CREATE INDEX IF NOT EXISTS idx_focus_areas_ai_generated ON focus_areas(ai_generated);

-- Insert some sample focus areas
INSERT INTO focus_areas (code, name, description, related_areas, prerequisites, is_active, display_order)
VALUES
  ('web_development', 'Web Development', 'Building and maintaining websites and web applications', ARRAY['frontend', 'backend', 'ui_design'], ARRAY['html', 'css', 'javascript'], TRUE, 10),
  ('data_science', 'Data Science', 'Extracting insights and knowledge from structured and unstructured data', ARRAY['machine_learning', 'statistics', 'data_analysis'], ARRAY['python', 'statistics'], TRUE, 20),
  ('mobile_development', 'Mobile App Development', 'Creating applications for mobile devices', ARRAY['android', 'ios', 'ui_design'], ARRAY['programming_basics'], TRUE, 30),
  ('devops', 'DevOps Engineering', 'Combining software development and IT operations', ARRAY['cloud', 'automation', 'ci_cd'], ARRAY['linux', 'networking'], TRUE, 40),
  ('cybersecurity', 'Cybersecurity', 'Protecting systems, networks, and programs from digital attacks', ARRAY['network_security', 'app_security', 'cryptography'], ARRAY['networking', 'operating_systems'], TRUE, 50)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  related_areas = EXCLUDED.related_areas,
  prerequisites = EXCLUDED.prerequisites,
  display_order = EXCLUDED.display_order; 