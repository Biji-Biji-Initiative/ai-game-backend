#!/usr/bin/env node

/**
 * ESM Migration Plan
 * 
 * This script helps analyze and migrate the codebase from CommonJS to ES Modules.
 * 
 * Usage:
 *   node scripts/utils/esm-migration-plan.js analyze
 *   node scripts/utils/esm-migration-plan.js migrate [file]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('glob');

// Configuration
const SRC_DIR = path.resolve(__dirname, '../../src');
const CONFIG_FILE = path.resolve(__dirname, '../../.esm-migration.json');

/**
 * Analyze the codebase for CommonJS vs ESM usage
 */
function analyzeCodebase() {
  console.log('Analyzing codebase...');
  
  // Count CommonJS statements
  const requireCount = parseInt(execSync('grep -r "require(" ./src | wc -l').toString().trim());
  const moduleExportsCount = parseInt(execSync('grep -r "module.exports" ./src | wc -l').toString().trim());
  
  // Count ESM statements
  const importCount = parseInt(execSync('grep -r "import " ./src | wc -l').toString().trim());
  const exportCount = parseInt(execSync('grep -r "export " ./src | wc -l').toString().trim());
  
  console.log('\n=== Codebase Analysis ===');
  console.log(`CommonJS usage: ${requireCount + moduleExportsCount} statements`);
  console.log(`- require statements: ${requireCount}`);
  console.log(`- module.exports statements: ${moduleExportsCount}`);
  console.log(`\nES Modules usage: ${importCount + exportCount} statements`);
  console.log(`- import statements: ${importCount}`);
  console.log(`- export statements: ${exportCount}`);
  
  const files = glob.sync(`${SRC_DIR}/**/*.js`);
  console.log(`\nTotal JavaScript files: ${files.length}`);
  
  // Identify files with CommonJS
  const filesWithRequire = execSync(`grep -l "require(" ${SRC_DIR}/**/*.js`).toString().trim().split('\n');
  const filesWithModuleExports = execSync(`grep -l "module.exports" ${SRC_DIR}/**/*.js`).toString().trim().split('\n');
  
  // Identify files with ESM
  const filesWithImport = execSync(`grep -l "import " ${SRC_DIR}/**/*.js`).toString().trim().split('\n');
  const filesWithExport = execSync(`grep -l "export " ${SRC_DIR}/**/*.js`).toString().trim().split('\n');
  
  // Create a unique set of files
  const commonJSFiles = [...new Set([...filesWithRequire, ...filesWithModuleExports])];
  const esmFiles = [...new Set([...filesWithImport, ...filesWithExport])];
  
  // Save the analysis to a config file
  const config = {
    analyzed: new Date().toISOString(),
    totalFiles: files.length,
    commonJS: {
      files: commonJSFiles,
      count: commonJSFiles.length
    },
    esm: {
      files: esmFiles,
      count: esmFiles.length
    },
    mixed: {
      files: commonJSFiles.filter(file => esmFiles.includes(file)),
      count: commonJSFiles.filter(file => esmFiles.includes(file)).length
    },
    migrated: []
  };
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  console.log(`\nMigration candidates: ${config.commonJS.count} files`);
  console.log(`Already using ESM: ${config.esm.count} files`);
  console.log(`Mixed usage: ${config.mixed.count} files`);
  console.log(`\nAnalysis saved to ${CONFIG_FILE}`);
  
  // Analysis for dependencies
  const packageJson = require('../../package.json');
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  console.log('\n=== Dependency Analysis ===');
  console.log('These packages might need special attention during migration:');
  const keyPackages = [
    'express', 'openai', '@supabase/supabase-js', 'winston', 'jest', 'mocha'
  ];
  
  for (const pkg of keyPackages) {
    console.log(`- ${pkg}: ${dependencies[pkg]}`);
  }
}

/**
 * Migrate a single file from CommonJS to ESM
 * @param {string} filePath - The file to migrate
 */
function migrateFile(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }
  
  console.log(`Migrating file: ${resolvedPath}`);
  
  const content = fs.readFileSync(resolvedPath, 'utf8');
  let newContent = content;
  
  // Handle 'use strict' directive (not needed in ESM)
  newContent = newContent.replace(/['"]use strict['"];?\n?/g, '');
  
  // Convert require statements to import statements
  const requireRegex = /const\s+([{}\s\w,]+)\s+=\s+require\(['"]([^'"]+)['"]\);?/g;
  newContent = newContent.replace(requireRegex, (match, importItems, importPath) => {
    // Check if it's destructuring require
    if (importItems.includes('{')) {
      // Handle destructuring imports
      return `import ${importItems} from '${importPath}';`;
    } else {
      // Handle regular imports
      return `import ${importItems} from '${importPath}';`;
    }
  });
  
  // Convert module.exports to export default or named exports
  newContent = newContent.replace(/module\.exports\s+=\s+(\w+);?/g, 'export default $1;');
  newContent = newContent.replace(/module\.exports\s+=\s+{/g, 'export {');
  newContent = newContent.replace(/module\.exports\s+=\s+(\w+);?/g, 'export default $1;');
  
  // Handle class exports
  newContent = newContent.replace(
    /module\.exports\s+=\s+class\s+(\w+)/g, 
    'export default class $1'
  );
  
  // Handle function exports
  newContent = newContent.replace(
    /module\.exports\s+=\s+function\s+(\w+)/g, 
    'export default function $1'
  );
  
  // Save the changes to a new file
  const dir = path.dirname(resolvedPath);
  const ext = path.extname(resolvedPath);
  const base = path.basename(resolvedPath, ext);
  const newFilePath = path.join(dir, `${base}.mjs`);
  
  fs.writeFileSync(newFilePath, newContent);
  console.log(`Migrated file saved to: ${newFilePath}`);
  
  // Update the config file to track migrated files
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    config.migrated.push({
      original: resolvedPath,
      migrated: newFilePath,
      date: new Date().toISOString()
    });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
}

/**
 * Main function
 */
function main() {
  const command = process.argv[2];
  
  if (command === 'analyze') {
    analyzeCodebase();
  } else if (command === 'migrate') {
    const filePath = process.argv[3];
    if (!filePath) {
      console.error('Please provide a file path to migrate');
      process.exit(1);
    }
    migrateFile(filePath);
  } else {
    console.log('Usage:');
    console.log('  node scripts/utils/esm-migration-plan.js analyze');
    console.log('  node scripts/utils/esm-migration-plan.js migrate [file]');
  }
}

main(); 