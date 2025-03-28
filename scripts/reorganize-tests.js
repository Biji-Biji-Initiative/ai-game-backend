#!/usr/bin/env node
/**
 * Test Reorganization Script
 * 
 * This script helps move test files to the correct folders based on their purpose.
 * It analyzes test files and suggests where they should be moved.
 * 
 * Usage:
 *   node scripts/reorganize-tests.js [options] [file-pattern]
 * 
 * Examples:
 *   node scripts/reorganize-tests.js                    # Analyze all test files
 *   node scripts/reorganize-tests.js --move             # Move files to suggested folders
 *   node scripts/reorganize-tests.js tests/legacy/*.js  # Analyze specific tests
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

// Configuration
const autoMove = process.argv.includes('--move');
const filePattern = process.argv.find(arg => !arg.startsWith('-') && arg !== process.argv[0] && arg !== process.argv[1]) || 'tests/**/*.test.js';

// Patterns to identify test types
const patterns = {
  domain: {
    pattern: /repository\..*mock|findById|findAll|save|delete|inMemory|domainService/i,
    targetDir: 'tests/domain'
  },
  integration: {
    pattern: /integration|workflow|coordinatorService|multiple services/i,
    targetDir: 'tests/integration'
  },
  openai: {
    pattern: /OpenAI|APICall|sendMessage|sendJsonMessage|completion/i,
    targetDir: 'tests/external/openai'
  },
  openaiDirect: {
    pattern: /OpenAI.*direct|direct.*OpenAI|direct API call/i,
    targetDir: 'tests/external/openai/direct'
  },
  openaiResponses: {
    pattern: /responses-api|OpenAI Responses|ResponsesAPI/i,
    targetDir: 'tests/external/openai/responses-api'
  },
  supabase: {
    pattern: /Supabase|SupabaseClient|database.*direct|direct.*database/i,
    targetDir: 'tests/external/supabase'
  },
  e2e: {
    pattern: /e2e|end-to-end|api\.post|api\.get|request\(/i,
    targetDir: 'tests/e2e'
  },
  unit: {
    pattern: /utils|helper|formatter|parser|validator/i,
    targetDir: 'tests/unit'
  },
  application: {
    pattern: /coordinator.*integrated|application layer|application service/i,
    targetDir: 'tests/application'
  }
};

// Subdirectory mapping by feature
const featurePatterns = {
  challenge: {
    pattern: /Challenge|challenge/i,
    subdir: 'challenge'
  },
  focusArea: {
    pattern: /focusArea|focus area|FocusArea/i,
    subdir: 'focusArea'
  },
  evaluation: {
    pattern: /evaluation|evaluate|Evaluation/i,
    subdir: 'evaluation'
  },
  user: {
    pattern: /user|User|profile|Profile/i,
    subdir: 'user'
  },
  personality: {
    pattern: /personality|Personality|trait|Trait/i,
    subdir: 'personality'
  },
  prompt: {
    pattern: /prompt|Prompt/i,
    subdir: 'prompt'
  }
};

// Analyze a file to determine its category
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const currentDir = path.dirname(filePath);
  
  // Determine test type
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [type, { pattern, targetDir }] of Object.entries(patterns)) {
    const matches = content.match(pattern);
    const score = matches ? matches.length : 0;
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { type, targetDir };
    }
  }
  
  // If no clear match, check filename patterns
  if (!bestMatch && (fileName.includes('direct') || fileName.includes('Direct'))) {
    bestMatch = { type: 'openaiDirect', targetDir: patterns.openaiDirect.targetDir };
  } else if (!bestMatch && (fileName.includes('responses-api') || fileName.includes('ResponsesAPI'))) {
    bestMatch = { type: 'openaiResponses', targetDir: patterns.openaiResponses.targetDir };
  }
  
  // Determine feature subdirectory
  let featureMatch = null;
  let featureScore = 0;
  
  for (const [feature, { pattern, subdir }] of Object.entries(featurePatterns)) {
    const matches = (content + fileName).match(pattern);
    const score = matches ? matches.length : 0;
    
    if (score > featureScore) {
      featureScore = score;
      featureMatch = { feature, subdir };
    }
  }
  
  // Generate target path
  let targetPath = '';
  if (bestMatch && featureMatch) {
    // Don't use subdir for external tests that are already organized
    if ((bestMatch.type === 'openaiDirect' || bestMatch.type === 'openaiResponses') && targetDir === currentDir) {
      targetPath = currentDir;
    } else {
      targetPath = path.join(bestMatch.targetDir, featureMatch.subdir);
    }
  } else if (bestMatch) {
    targetPath = bestMatch.targetDir;
  } else {
    targetPath = path.join('tests/unknown', path.basename(currentDir));
  }
  
  return {
    path: filePath,
    currentDir,
    fileName,
    targetPath,
    category: bestMatch ? bestMatch.type : 'unknown',
    feature: featureMatch ? featureMatch.feature : 'unknown',
    shouldMove: targetPath !== currentDir
  };
}

// Move a file to its target path
function moveFile(analysis) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(analysis.targetPath)) {
    fs.mkdirSync(analysis.targetPath, { recursive: true });
  }
  
  const targetFile = path.join(analysis.targetPath, analysis.fileName);
  
  // Don't overwrite existing files
  if (fs.existsSync(targetFile)) {
    console.log(chalk.yellow(`  Target file already exists: ${targetFile}`));
    
    // Create a new name with a suffix
    const ext = path.extname(analysis.fileName);
    const baseName = path.basename(analysis.fileName, ext);
    const newFileName = `${baseName}.migrated${ext}`;
    const newTargetFile = path.join(analysis.targetPath, newFileName);
    
    console.log(chalk.yellow(`  Renaming to: ${newFileName}`));
    fs.copyFileSync(analysis.path, newTargetFile);
  } else {
    // Move the file
    fs.copyFileSync(analysis.path, targetFile);
  }
  
  return targetFile;
}

// Main function
async function main() {
  console.log(chalk.blue('=== Test Reorganization Tool ==='));
  console.log(chalk.cyan(`Mode: ${autoMove ? 'Move' : 'Analyze'}`));
  console.log(chalk.cyan(`Pattern: ${filePattern}`));
  console.log(chalk.cyan('--------------------------------'));
  
  // Find all test files
  const files = glob.sync(filePattern);
  console.log(`Found ${files.length} test files to analyze.`);
  
  const filesToMove = [];
  
  // Process each file
  for (const file of files) {
    const analysis = analyzeFile(file);
    
    if (analysis.shouldMove) {
      filesToMove.push(analysis);
      
      console.log(chalk.yellow(`\nSuggested move for ${analysis.path}:`));
      console.log(`  Category: ${chalk.cyan(analysis.category)}`);
      console.log(`  Feature: ${chalk.cyan(analysis.feature)}`);
      console.log(`  Target: ${chalk.green(path.join(analysis.targetPath, analysis.fileName))}`);
    }
  }
  
  console.log(chalk.cyan('\n--------------------------------'));
  console.log(`Suggested moves: ${filesToMove.length}`);
  
  if (autoMove && filesToMove.length > 0) {
    console.log(chalk.green('\nMoving files...'));
    
    for (const analysis of filesToMove) {
      try {
        const targetFile = moveFile(analysis);
        console.log(`${chalk.green('✔')} Moved ${analysis.path} to ${targetFile}`);
      } catch (error) {
        console.error(`${chalk.red('✘')} Failed to move ${analysis.path}: ${error.message}`);
      }
    }
  } else if (filesToMove.length > 0) {
    console.log(chalk.green('\nRun with --move to move files to suggested locations:'));
    console.log(chalk.green(`node scripts/reorganize-tests.js --move ${filePattern}`));
  }
}

main().catch(console.error); 