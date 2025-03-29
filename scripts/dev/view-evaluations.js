#!/usr/bin/env node
/**
 * View Evaluations Script
 * 
 * A simple utility to fetch and display evaluations from the database.
 * Useful for checking evaluation data during development and testing.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Try to load environment variables
const envPath = process.env.NODE_ENV === 'test' 
  ? path.join(__dirname, '../../.env.test')
  : path.join(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(chalk.green(`Loaded environment from ${path.basename(envPath)}`));
} else {
  console.warn(chalk.yellow(`Warning: Environment file ${path.basename(envPath)} not found`));
  dotenv.config(); // Try to load from default .env
}

let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (error) {
  console.error(chalk.red('Error: @supabase/supabase-js package not found. Please run npm install first.'));
  process.exit(1);
}

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(chalk.red('ERROR: Supabase credentials are required in .env file'));
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// Process command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 5,
  userId: null,
  challengeId: null,
  format: 'full',
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--user' && args[i + 1]) {
    options.userId = args[i + 1];
    i++;
  } else if (args[i] === '--challenge' && args[i + 1]) {
    options.challengeId = args[i + 1];
    i++;
  } else if (args[i] === '--format' && args[i + 1]) {
    options.format = args[i + 1]; // 'full', 'summary', or 'json'
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    displayHelp();
    process.exit(0);
  } else if (!isNaN(parseInt(args[i], 10))) {
    // Legacy support for just passing a number as the limit
    options.limit = parseInt(args[i], 10);
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(chalk.cyan('=== View Evaluations Script Help ==='));
  console.log('\nUsage: node view-evaluations.js [options]');
  console.log('\nOptions:');
  console.log('  --limit <number>       Number of evaluations to fetch (default: 5)');
  console.log('  --user <id>            Filter by user ID');
  console.log('  --challenge <id>       Filter by challenge ID');
  console.log('  --format <format>      Output format: full, summary, or json (default: full)');
  console.log('  --help, -h             Display this help message\n');
  console.log('Example:');
  console.log('  node view-evaluations.js --limit 10 --user abc-123 --format summary');
}

/**
 * Fetch evaluations from the database
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of evaluation data
 */
async function fetchEvaluations(options) {
  console.log(chalk.blue('\n=== Fetching Evaluations ==='));
  const filters = [];
  if (options.userId) {
    filters.push(`user_id=${options.userId}`);
  }
  if (options.challengeId) {
    filters.push(`challenge_id=${options.challengeId}`);
  }
  
  console.log(`Fetching ${options.limit} most recent evaluations${filters.length ? ' with filters: ' + filters.join(', ') : ''}\n`);
  
  let query = supabase
    .from('evaluations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit);
  
  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  
  if (options.challengeId) {
    query = query.eq('challenge_id', options.challengeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error(chalk.red('Error fetching evaluations:'), error.message);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.log(chalk.yellow('No evaluations found matching your criteria.'));
    process.exit(0);
  }
  
  return data;
}

/**
 * Display evaluation in a readable format
 * @param {Object} evaluation - Evaluation data
 * @param {number} index - Evaluation index
 * @param {string} format - Output format
 */
function displayEvaluation(evaluation, index, format = 'full') {
  if (format === 'json') {
    console.log(JSON.stringify(evaluation, null, 2));
    return;
  }
  
  console.log(chalk.cyan(`\n===== EVALUATION ${index + 1} =====`));
  console.log(`${chalk.bold('ID:')} ${evaluation.id}`);
  console.log(`${chalk.bold('User ID:')} ${evaluation.user_id}`);
  console.log(`${chalk.bold('Challenge:')} ${evaluation.challenge_context?.title || evaluation.challenge_id}`);
  console.log(`${chalk.bold('Created:')} ${new Date(evaluation.created_at).toLocaleString()}`);
  
  const score = evaluation.score || 0;
  let scoreColor;
  if (score >= 80) {
    scoreColor = chalk.green;
  } else if (score >= 60) {
    scoreColor = chalk.yellow;
  } else {
    scoreColor = chalk.red;
  }
  
  console.log(`\n${chalk.bold('SCORE:')} ${scoreColor(`${score}/100`)} (${getPerformanceLevel(score)})`);
  
  if (format === 'summary') {
    console.log(chalk.dim('\n---------------------------\n'));
    return;
  }
  
  // Only display these sections in full format
  console.log(chalk.bold('\nCATEGORY SCORES:'));
  if (evaluation.category_scores && Object.keys(evaluation.category_scores).length > 0) {
    Object.entries(evaluation.category_scores).forEach(([category, catScore]) => {
      let catScoreColor;
      if (catScore >= 80) {
        catScoreColor = chalk.green;
      } else if (catScore >= 60) {
        catScoreColor = chalk.yellow;
      } else {
        catScoreColor = chalk.red;
      }
      
      console.log(`- ${category}: ${catScoreColor(catScore)}`);
    });
  } else {
    console.log(chalk.dim('None available'));
  }
  
  console.log(chalk.bold('\nSTRENGTHS:'));
  if (evaluation.strengths && evaluation.strengths.length > 0) {
    evaluation.strengths.forEach((strength, i) => {
      console.log(`${i + 1}. ${strength}`);
    });
  } else {
    console.log(chalk.dim('None listed'));
  }
  
  console.log(chalk.bold('\nAREAS FOR IMPROVEMENT:'));
  if (evaluation.areas_for_improvement && evaluation.areas_for_improvement.length > 0) {
    evaluation.areas_for_improvement.forEach((area, i) => {
      console.log(`${i + 1}. ${area}`);
    });
  } else {
    console.log(chalk.dim('None listed'));
  }
  
  console.log(chalk.bold('\nFEEDBACK:'));
  console.log(evaluation.overall_feedback ? evaluation.overall_feedback : chalk.dim('No feedback provided'));
  
  console.log(chalk.dim('\n---------------------------\n'));
}

/**
 * Get performance level based on score
 * @param {number} score - Evaluation score
 * @returns {string} Performance level description
 */
function getPerformanceLevel(score) {
  if (score >= 90) {
    return 'excellent';
  }
  if (score >= 80) {
    return 'very good';
  }
  if (score >= 70) {
    return 'good';
  }
  if (score >= 60) {
    return 'satisfactory';
  }
  if (score >= 50) {
    return 'needs improvement';
  }
  return 'unsatisfactory';
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(chalk.blue('=== Evaluation Viewer ==='));
    
    const evaluations = await fetchEvaluations(options);
    console.log(chalk.green(`Found ${evaluations.length} evaluations.`));
    
    if (options.format === 'json') {
      // For JSON format, either output all as an array or individual items
      if (evaluations.length === 1) {
        console.log(JSON.stringify(evaluations[0], null, 2));
      } else {
        evaluations.forEach((evaluation, index) => {
          displayEvaluation(evaluation, index, options.format);
        });
      }
    } else {
      // For human-readable formats
      evaluations.forEach((evaluation, index) => {
        displayEvaluation(evaluation, index, options.format);
      });
    }
    
    console.log(chalk.green('Done!'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message || error);
    process.exit(1);
  }
}

// Run the script when executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('\nUnexpected error:'), error);
    process.exit(1);
  });
}

module.exports = {
  fetchEvaluations,
  displayEvaluation,
  getPerformanceLevel
}; 