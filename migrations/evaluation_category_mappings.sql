-- Migration to create evaluation category mapping tables
-- This enables dynamic focus area to evaluation category mappings

-- Create table for evaluation categories (similar to challenge_types)
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_system_defined BOOLEAN DEFAULT FALSE
);

-- Create table for focus area to evaluation category mappings
CREATE TABLE IF NOT EXISTS focus_area_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area TEXT NOT NULL,
  category_code TEXT NOT NULL REFERENCES evaluation_categories(code) ON DELETE CASCADE,
  weight INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default evaluation categories
INSERT INTO evaluation_categories (code, name, description, is_system_defined)
VALUES
  -- Common categories
  ('accuracy', 'Accuracy', 'Evaluate factual correctness, depth of knowledge, and absence of misconceptions', TRUE),
  ('clarity', 'Clarity', 'Assess organization, clarity of expression, and logical flow of ideas', TRUE),
  ('reasoning', 'Reasoning', 'Evaluate logical connections, critical thinking, and soundness of arguments', TRUE),
  ('creativity', 'Creativity', 'Judge originality of ideas, innovative thinking, and novel approaches', TRUE),
  
  -- Specialized categories
  ('critical_thinking', 'Critical Thinking', 'Assess depth of analysis, consideration of alternatives, and avoidance of cognitive biases', TRUE),
  ('insight', 'Insight', 'Evaluate the presence of meaningful, non-obvious observations and connections', TRUE),
  ('problem_solving', 'Problem Solving', 'Judge the effectiveness of solutions, considering constraints and trade-offs', TRUE),
  ('application', 'Application', 'Assess how well concepts are applied to specific situations or problems', TRUE),
  ('communication', 'Communication', 'Evaluate clarity, precision, and effectiveness of communication', TRUE),
  ('thoroughness', 'Thoroughness', 'Judge comprehensiveness of research, addressing all relevant aspects', TRUE),
  ('methodology', 'Methodology', 'Evaluate appropriateness and rigor of methods used', TRUE),
  ('critical_analysis', 'Critical Analysis', 'Assess ability to evaluate sources, identify biases, and synthesize information', TRUE),
  ('presentation', 'Presentation', 'Judge organization, clarity, and effective use of evidence', TRUE),
  ('originality', 'Originality', 'Evaluate uniqueness and novelty of ideas and approach', TRUE),
  ('effectiveness', 'Effectiveness', 'Assess how well the response achieves its intended purpose', TRUE),
  ('elaboration', 'Elaboration', 'Evaluate depth, detail, and development of ideas', TRUE),
  ('relevance', 'Relevance', 'Judge how well the response addresses the challenge requirements', TRUE),
  ('technical_accuracy', 'Technical Accuracy', 'Evaluate technical correctness and precision', TRUE),
  ('implementation', 'Implementation', 'Assess the quality and effectiveness of implementation details', TRUE),
  ('explanation', 'Explanation', 'Evaluate clarity and completeness of explanations for technical choices', TRUE),
  ('best_practices', 'Best Practices', 'Judge adherence to established standards and best practices', TRUE),
  
  -- Ethics-focused categories
  ('ethical_reasoning', 'Ethical Reasoning', 'Evaluate depth and nuance of ethical analysis and reasoning', TRUE),
  ('comprehensiveness', 'Comprehensiveness', 'Assess coverage of relevant ethical dimensions and perspectives', TRUE),
  ('practical_application', 'Practical Application', 'Judge how well ethical principles are applied to concrete situations', TRUE),
  
  -- AI literacy categories
  ('conceptual_understanding', 'Conceptual Understanding', 'Evaluate understanding of core AI concepts and principles', TRUE),
  ('critical_perspective', 'Critical Perspective', 'Assess ability to critically evaluate AI technologies and claims', TRUE),
  
  -- Impact categories
  ('impact_analysis', 'Impact Analysis', 'Evaluate depth and breadth of impact analysis across domains', TRUE),
  ('stakeholder_consideration', 'Stakeholder Consideration', 'Assess identification and consideration of affected stakeholders', TRUE),
  ('systemic_thinking', 'Systemic Thinking', 'Evaluate understanding of complex systemic interactions and dynamics', TRUE),
  ('practical_insight', 'Practical Insight', 'Judge the practicality and applicability of insights about AI\'s impact', TRUE)
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- Insert default focus area to category mappings
INSERT INTO focus_area_category_mappings (focus_area, category_code, weight)
VALUES
  -- AI Ethics mappings
  ('AI Ethics', 'ethical_reasoning', 40),
  ('AI Ethics', 'stakeholder_consideration', 30),
  ('AI Ethics', 'comprehensiveness', 30),
  
  -- AI Impact mappings
  ('AI Impact', 'impact_analysis', 35),
  ('AI Impact', 'systemic_thinking', 35),
  ('AI Impact', 'practical_insight', 30),
  ('AI Impact on Society', 'impact_analysis', 35),
  ('AI Impact on Society', 'systemic_thinking', 35),
  ('AI Impact on Society', 'practical_insight', 30),
  
  -- AI Literacy mappings
  ('AI Literacy', 'conceptual_understanding', 35),
  ('AI Literacy', 'application', 35),
  ('AI Literacy', 'critical_perspective', 30),
  
  -- Critical Thinking mappings
  ('Critical Thinking', 'critical_thinking', 40),
  ('Critical Thinking', 'reasoning', 30),
  ('Critical Thinking', 'analysis', 30),
  
  -- Communication mappings
  ('Communication', 'clarity', 35),
  ('Communication', 'communication', 35),
  ('Communication', 'presentation', 30),
  
  -- Problem Solving mappings
  ('Problem Solving', 'problem_solving', 40),
  ('Problem Solving', 'application', 30),
  ('Problem Solving', 'effectiveness', 30),
  
  -- Research mappings
  ('Research', 'thoroughness', 35),
  ('Research', 'methodology', 35),
  ('Research', 'critical_analysis', 30),
  
  -- Technical Skills mappings
  ('Technical Skills', 'technical_accuracy', 40),
  ('Technical Skills', 'implementation', 30),
  ('Technical Skills', 'best_practices', 30);

-- Add indexes for performance
CREATE INDEX idx_focus_area_category_mappings_focus_area ON focus_area_category_mappings (focus_area);
CREATE INDEX idx_focus_area_category_mappings_category_code ON focus_area_category_mappings (category_code);

-- Add RLS policies for security
ALTER TABLE evaluation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_area_category_mappings ENABLE ROW LEVEL SECURITY;

-- Everyone can view evaluation categories
CREATE POLICY evaluation_categories_select_policy ON evaluation_categories
  FOR SELECT USING (true);

-- Everyone can view focus area category mappings
CREATE POLICY focus_area_category_mappings_select_policy ON focus_area_category_mappings
  FOR SELECT USING (true);

-- Only authenticated users can modify mappings
CREATE POLICY evaluation_categories_modify_policy ON evaluation_categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY focus_area_category_mappings_modify_policy ON focus_area_category_mappings
  FOR ALL USING (auth.role() = 'authenticated'); 