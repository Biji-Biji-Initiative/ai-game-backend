/**
 * Create Supabase Tables for Evaluation System
 * 
 * This script creates the necessary tables in Supabase for storing evaluations,
 * evaluation categories, and focus area mappings.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials are required in .env file');
  process.exit(1);
}

// Initialize Supabase client with admin privileges
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

/**
 * Create the evaluations table with all fields needed by our Evaluation model
 */
async function createEvaluationsTable() {
  console.log('Creating evaluations table...');
  
  const { error } = await supabase.rpc('create_evaluations_table', {
    sql: `
    CREATE TABLE IF NOT EXISTS public.evaluations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      score_percent INTEGER,
      category_scores JSONB,
      relevant_scores JSONB,
      overall_feedback TEXT,
      strengths TEXT[] DEFAULT '{}',
      strength_analysis JSONB,
      areas_for_improvement TEXT[] DEFAULT '{}',
      improvement_plans JSONB,
      next_steps TEXT,
      recommended_resources JSONB,
      recommended_challenges JSONB,
      user_context JSONB,
      challenge_context JSONB,
      growth_metrics JSONB,
      response_id TEXT,
      thread_id TEXT,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Create index for faster queries by user_id
    CREATE INDEX IF NOT EXISTS evaluations_user_id_idx ON public.evaluations (user_id);
    
    -- Create index for faster queries by challenge_id
    CREATE INDEX IF NOT EXISTS evaluations_challenge_id_idx ON public.evaluations (challenge_id);
    `
  });
  
  if (error) {
    console.error('Error creating evaluations table:', error);
    return false;
  }
  
  console.log('✅ Evaluations table created successfully!');
  return true;
}

/**
 * Create the evaluation_categories table
 */
async function createEvaluationCategoriesTable() {
  console.log('Creating evaluation_categories table...');
  
  const { error } = await supabase.rpc('create_evaluation_categories_table', {
    sql: `
    CREATE TABLE IF NOT EXISTS public.evaluation_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      rubric TEXT,
      weight INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Create index for faster lookups by key
    CREATE INDEX IF NOT EXISTS evaluation_categories_key_idx ON public.evaluation_categories (key);
    `
  });
  
  if (error) {
    console.error('Error creating evaluation_categories table:', error);
    return false;
  }
  
  console.log('✅ Evaluation categories table created successfully!');
  return true;
}

/**
 * Create the focus_area_category_mappings table
 */
async function createFocusAreaCategoryMappingsTable() {
  console.log('Creating focus_area_category_mappings table...');
  
  const { error } = await supabase.rpc('create_focus_area_mappings_table', {
    sql: `
    CREATE TABLE IF NOT EXISTS public.focus_area_category_mappings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      focus_area TEXT NOT NULL,
      category_key TEXT NOT NULL,
      weight INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      FOREIGN KEY (category_key) REFERENCES public.evaluation_categories(key) ON DELETE CASCADE,
      UNIQUE(focus_area, category_key)
    );
    
    -- Create index for faster lookups by focus_area
    CREATE INDEX IF NOT EXISTS focus_area_mappings_focus_area_idx ON public.focus_area_category_mappings (focus_area);
    `
  });
  
  if (error) {
    console.error('Error creating focus_area_category_mappings table:', error);
    return false;
  }
  
  console.log('✅ Focus area category mappings table created successfully!');
  return true;
}

/**
 * Insert default evaluation categories
 */
async function insertDefaultCategories() {
  console.log('Inserting default evaluation categories...');
  
  const defaultCategories = [
    {
      key: 'ethical_reasoning',
      name: 'Ethical Reasoning',
      description: 'Ability to identify and analyze ethical principles and implications',
      weight: 10
    },
    {
      key: 'comprehensiveness',
      name: 'Comprehensiveness',
      description: 'Thorough consideration of multiple perspectives and implications',
      weight: 10
    },
    {
      key: 'clarity',
      name: 'Clarity',
      description: 'Clear and structured presentation of ideas',
      weight: 10
    },
    {
      key: 'practical_application',
      name: 'Practical Application',
      description: 'Ability to apply concepts to real-world situations',
      weight: 10
    },
    {
      key: 'critical_thinking',
      name: 'Critical Thinking',
      description: 'Ability to analyze, evaluate, and form judgments',
      weight: 10
    }
  ];
  
  const { error } = await supabase
    .from('evaluation_categories')
    .upsert(defaultCategories, { onConflict: 'key' });
  
  if (error) {
    console.error('Error inserting default categories:', error);
    return false;
  }
  
  console.log('✅ Default categories inserted successfully!');
  return true;
}

/**
 * Insert default focus area mappings
 */
async function insertDefaultMappings() {
  console.log('Inserting default focus area mappings...');
  
  const defaultMappings = [
    { focus_area: 'AI Ethics', category_key: 'ethical_reasoning', weight: 3 },
    { focus_area: 'AI Ethics', category_key: 'comprehensiveness', weight: 2 },
    { focus_area: 'AI Ethics', category_key: 'critical_thinking', weight: 2 },
    
    { focus_area: 'Critical Thinking', category_key: 'critical_thinking', weight: 3 },
    { focus_area: 'Critical Thinking', category_key: 'comprehensiveness', weight: 2 },
    { focus_area: 'Critical Thinking', category_key: 'clarity', weight: 2 },
    
    { focus_area: 'Problem Solving', category_key: 'practical_application', weight: 3 },
    { focus_area: 'Problem Solving', category_key: 'critical_thinking', weight: 2 },
    { focus_area: 'Problem Solving', category_key: 'clarity', weight: 1 }
  ];
  
  const { error } = await supabase
    .from('focus_area_category_mappings')
    .upsert(defaultMappings, { onConflict: ['focus_area', 'category_key'] });
  
  if (error) {
    console.error('Error inserting default mappings:', error);
    return false;
  }
  
  console.log('✅ Default focus area mappings inserted successfully!');
  return true;
}

/**
 * Run the complete setup process
 */
async function setupTables() {
  console.log('Starting Supabase table setup for evaluation system...');
  
  try {
    const tablesCreated = await Promise.all([
      createEvaluationsTable(),
      createEvaluationCategoriesTable(),
      createFocusAreaCategoryMappingsTable()
    ]);
    
    if (tablesCreated.some(result => !result)) {
      console.error('❌ Failed to create some tables.');
      process.exit(1);
    }
    
    // Insert default data
    const dataInserted = await Promise.all([
      insertDefaultCategories(),
      insertDefaultMappings()
    ]);
    
    if (dataInserted.some(result => !result)) {
      console.error('❌ Failed to insert some default data.');
      process.exit(1);
    }
    
    console.log('\n✅ SETUP COMPLETED SUCCESSFULLY! ✅');
    console.log('The Supabase database is now configured for the evaluation system.');
    
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    process.exit(1);
  }
}

// Run the setup
setupTables(); 