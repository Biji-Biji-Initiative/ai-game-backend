#!/usr/bin/env node

/**
 * This script directly patches the compiled Next.js vendor chunks
 * to fix the "_interop_require_default._ is not a function" error
 * 
 * Run this after compilation but before starting the server.
 */

const fs = require('fs');
const path = require('path');

// Define the pattern we're looking for in the compiled code
const PROBLEMATIC_PATTERN = "function _interopRequireDefault(obj) {";
const REPLACEMENT_FIX = `function _interopRequireDefault(obj) {
  if (!_interopRequireDefault._) {
    _interopRequireDefault._ = function(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    };
  }`;

// Paths to check for the compiled Next.js files
const POSSIBLE_PATHS = [
  // Basic vendor chunk path
  '.next/server/vendor-chunks/next.js',
  // Additional patterns to search
  '.next/server/chunks/next.js',
  '.next/server/pages/_app.js',
  '.next/server/pages/_error.js',
  '.next/server/pages/index.js',
  // Client side chunks that might use the function
  '.next/static/chunks/next.js'
];

console.log('🔍 Searching for compiled Next.js files to patch...');

// Track our progress
let patchedFiles = 0;

// Check each possible path and patch if found
for (const p of POSSIBLE_PATHS) {
  const filePath = path.resolve(p);
  if (fs.existsSync(filePath)) {
    console.log(`Found compiled file: ${p}`);
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if the file contains the problematic pattern and hasn't already been patched
      if (content.includes(PROBLEMATIC_PATTERN) && !content.includes('_interopRequireDefault._')) {
        console.log(`📝 Patching ${p}...`);
        
        // Create a backup
        fs.writeFileSync(`${filePath}.backup`, content, 'utf8');
        
        // Replace the pattern
        content = content.replace(PROBLEMATIC_PATTERN, REPLACEMENT_FIX);
        
        // Write the patched file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Successfully patched ${p}`);
        patchedFiles++;
      } else if (content.includes('_interopRequireDefault._')) {
        console.log(`✓ File ${p} is already patched.`);
      } else if (!content.includes(PROBLEMATIC_PATTERN)) {
        console.log(`⚠️ File ${p} doesn't contain the target pattern.`);
      }
    } catch (err) {
      console.error(`❌ Error patching ${p}:`, err.message);
    }
  }
}

// Search for any files in .next that might contain the pattern
function findAndPatchFiles(directory) {
  try {
    if (!fs.existsSync(directory)) return;
    
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Recursively search directories (but avoid node_modules)
        if (!itemPath.includes('node_modules')) {
          findAndPatchFiles(itemPath);
        }
      } else if (item.endsWith('.js')) {
        // Check JavaScript files
        try {
          let content = fs.readFileSync(itemPath, 'utf8');
          
          // Check if this file has the function and needs patching
          if (content.includes(PROBLEMATIC_PATTERN) && 
              !content.includes('_interopRequireDefault._') &&
              content.includes('function _interopRequireDefault')) {
            
            console.log(`📝 Found and patching additional file: ${itemPath}`);
            
            // Create a backup
            fs.writeFileSync(`${itemPath}.backup`, content, 'utf8');
            
            // Replace the pattern
            content = content.replace(PROBLEMATIC_PATTERN, REPLACEMENT_FIX);
            
            // Write the patched file
            fs.writeFileSync(itemPath, content, 'utf8');
            console.log(`✅ Successfully patched ${itemPath}`);
            patchedFiles++;
          }
        } catch (err) {
          // Silently ignore file read/write errors
        }
      }
    }
  } catch (err) {
    // Silently ignore directory access errors
  }
}

// Search all JavaScript files in .next directory
if (fs.existsSync('.next')) {
  console.log('🔍 Searching for other affected files in .next directory...');
  findAndPatchFiles('.next');
}

// Create a custom fix for the error boundary component
const ERROR_BOUNDARY_PATH = './node_modules/next/dist/client/components/error-boundary.js';
if (fs.existsSync(ERROR_BOUNDARY_PATH)) {
  console.log('📝 Adding direct fix to Next.js error boundary component...');
  try {
    const errorBoundaryContent = fs.readFileSync(ERROR_BOUNDARY_PATH, 'utf8');
    
    // Create a backup if needed
    if (!fs.existsSync(`${ERROR_BOUNDARY_PATH}.backup`)) {
      fs.writeFileSync(`${ERROR_BOUNDARY_PATH}.backup`, errorBoundaryContent, 'utf8');
    }
    
    // Add the missing function at the beginning of the file
    const patchedContent = `// PATCHED FOR INTEROP REQUIRE DEFAULT
if (typeof _interopRequireDefault !== 'undefined' && !_interopRequireDefault._) {
  _interopRequireDefault._ = function(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  };
}
${errorBoundaryContent}`;
    
    fs.writeFileSync(ERROR_BOUNDARY_PATH, patchedContent, 'utf8');
    console.log(`✅ Applied direct fix to error boundary component`);
    patchedFiles++;
  } catch (err) {
    console.error(`❌ Error patching error boundary:`, err.message);
  }
}

// Summary
console.log('\n📊 Patching summary:');
if (patchedFiles > 0) {
  console.log(`✅ Successfully patched ${patchedFiles} files.`);
  console.log('🚀 You should now be able to run the server without the _interopRequireDefault._ error.');
} else {
  console.log('⚠️ No files were patched. This could mean either:');
  console.log('   1. All files are already patched');
  console.log('   2. The compiled files were not found'); 
  console.log('   3. The pattern has changed in the current Next.js version');
}
console.log('\nFor best results, run this script after the Next.js build process but before starting the server.'); 