/**
 * View Evaluations Script
 * 
 * A simple utility to fetch and display evaluations from the database.
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

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// Get command line arguments
const args = process.argv.slice(2);
const limit = args[0] ? parseInt(args[0]) : 5;
const userId = args[1] || null;

/**
 * Fetch evaluations from the database
 */
async function fetchEvaluations() {
  console.log(`Fetching ${limit} most recent evaluations${userId ? ` for user ${userId}` : ''}...\n`);
  
  let query = supabase
    .from('evaluations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching evaluations:', error);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.log('No evaluations found.');
    process.exit(0);
  }
  
  return data;
}

/**
 * Display evaluation in a readable format
 */
function displayEvaluation(evaluation, index) {
  console.log(`\n===== EVALUATION ${index + 1} =====`);
  console.log(`ID: ${evaluation.id}`);
  console.log(`User ID: ${evaluation.user_id}`);
  console.log(`Challenge: ${evaluation.challenge_context?.title || evaluation.challenge_id}`);
  console.log(`Created: ${new Date(evaluation.created_at).toLocaleString()}`);
  
  console.log(`\nSCORE: ${evaluation.score}/100 (${getPerformanceLevel(evaluation.score)})`);
  
  console.log('\nCATEGORY SCORES:');
  Object.entries(evaluation.category_scores || {}).forEach(([category, score]) => {
    console.log(`- ${category}: ${score}`);
  });
  
  console.log('\nSTRENGTHS:');
  if (evaluation.strengths && evaluation.strengths.length > 0) {
    evaluation.strengths.forEach((strength, i) => {
      console.log(`${i + 1}. ${strength}`);
    });
  } else {
    console.log('None listed');
  }
  
  console.log('\nAREAS FOR IMPROVEMENT:');
  if (evaluation.areas_for_improvement && evaluation.areas_for_improvement.length > 0) {
    evaluation.areas_for_improvement.forEach((area, i) => {
      console.log(`${i + 1}. ${area}`);
    });
  } else {
    console.log('None listed');
  }
  
  console.log('\nFEEDBACK:');
  console.log(evaluation.overall_feedback || 'No feedback provided');
  
  console.log('\n---------------------------\n');
}

/**
 * Get performance level based on score
 */
function getPerformanceLevel(score) {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'very good';
  if (score >= 70) return 'good';
  if (score >= 60) return 'satisfactory';
  if (score >= 50) return 'needs improvement';
  return 'unsatisfactory';
}

/**
 * Main function
 */
async function main() {
  try {
    const evaluations = await fetchEvaluations();
    console.log(`Found ${evaluations.length} evaluations.\n`);
    
    evaluations.forEach((evaluation, index) => {
      displayEvaluation(evaluation, index);
    });
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main(); 