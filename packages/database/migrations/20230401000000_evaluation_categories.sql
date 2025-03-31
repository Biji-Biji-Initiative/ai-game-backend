-- Evaluation Categories Migration
-- Inserts initial data into the evaluation_categories table

-- Insert default evaluation categories if they don't exist
INSERT INTO evaluation_categories (code, name, description, is_system_defined)
VALUES
  ('clarity', 'Clarity', 'Ability to communicate ideas clearly and concisely', TRUE),
  ('structure', 'Structure', 'Organization and logical flow of ideas', TRUE),
  ('depth', 'Depth', 'Level of analysis and critical thinking demonstrated', TRUE),
  ('creativity', 'Creativity', 'Originality and innovative thinking', TRUE),
  ('technical', 'Technical Accuracy', 'Correctness of technical concepts and implementation', TRUE),
  ('reasoning', 'Reasoning', 'Logical reasoning and problem-solving approach', TRUE),
  ('presentation', 'Presentation', 'Quality of visual or verbal presentation', TRUE),
  ('implementation', 'Implementation', 'Effectiveness of code or solution implementation', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Map focus areas to evaluation categories with appropriate weights
INSERT INTO focus_area_category_mappings (focus_area, category_code, weight)
VALUES
  ('coding', 'technical', 35),
  ('coding', 'structure', 25),
  ('coding', 'implementation', 30),
  ('coding', 'creativity', 10),
  
  ('writing', 'clarity', 30),
  ('writing', 'structure', 25),
  ('writing', 'depth', 25),
  ('writing', 'creativity', 20),
  
  ('problem-solving', 'reasoning', 40),
  ('problem-solving', 'technical', 25),
  ('problem-solving', 'depth', 20),
  ('problem-solving', 'creativity', 15),
  
  ('design', 'creativity', 35),
  ('design', 'structure', 20),
  ('design', 'presentation', 25),
  ('design', 'technical', 20)
ON CONFLICT (focus_area, category_code) DO UPDATE SET
  weight = EXCLUDED.weight; 