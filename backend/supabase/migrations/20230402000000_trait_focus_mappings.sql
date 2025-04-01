-- Trait to Focus Area Mappings Migration

-- Insert trait to challenge type mappings
INSERT INTO trait_challenge_mappings (trait_code, trait_name, challenge_type_code)
VALUES
  ('openness', 'Openness to Experience', 'creative_writing'),
  ('conscientiousness', 'Conscientiousness', 'code_review'),
  ('extraversion', 'Extraversion', 'presentation'),
  ('agreeableness', 'Agreeableness', 'team_evaluation'),
  ('neuroticism', 'Neuroticism', 'stress_simulation'),
  ('analytical', 'Analytical Thinking', 'problem_solving'),
  ('critical', 'Critical Thinking', 'analysis'),
  ('creative', 'Creative Thinking', 'design'),
  ('logical', 'Logical Reasoning', 'algorithm'),
  ('verbal', 'Verbal Reasoning', 'communication'),
  ('numerical', 'Numerical Reasoning', 'data_analysis'),
  ('abstract', 'Abstract Reasoning', 'pattern_recognition')
ON CONFLICT (trait_code) DO UPDATE SET
  trait_name = EXCLUDED.trait_name,
  challenge_type_code = EXCLUDED.challenge_type_code;

-- Insert focus area to challenge type mappings
INSERT INTO focus_area_challenge_mappings (focus_area, challenge_type_code)
VALUES
  ('coding', 'code_implementation'),
  ('algorithm', 'algorithm'),
  ('debugging', 'debugging'),
  ('data_analysis', 'data_analysis'),
  ('design', 'design'),
  ('communication', 'communication'),
  ('problem_solving', 'problem_solving'),
  ('creative_writing', 'creative_writing'),
  ('technical_writing', 'documentation'),
  ('project_planning', 'planning')
ON CONFLICT (focus_area) DO UPDATE SET
  challenge_type_code = EXCLUDED.challenge_type_code; 