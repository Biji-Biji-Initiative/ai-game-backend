/**
 * Fix Integration Tests
 * 
 * This script fixes common issues with integration tests:
 * 1. Converts Mocha hooks to Jest equivalents
 * 2. Fixes import paths for setup.js
 * 3. Resolves duplicate class declarations
 * 4. Adds missing .js extensions to imports
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');

console.log('🔍 Finding integration test files...');

// Find integration test files
const testFiles = globSync('tests/integration/**/*.test.js', { cwd: projectRoot });
console.log(`Found ${testFiles.length} integration test files`);

// Track files modified
let filesModified = 0;

// Process each file
for (const file of testFiles) {
  const filePath = resolve(projectRoot, file);
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  console.log(`\nProcessing ${file}`);
  
  // Step 1: Convert Mocha hooks to Jest equivalents
  let updatedContent = content
    // Convert before to beforeAll
    .replace(/\bbefore\s*\(/g, (match) => {
      console.log('  Converting before() to beforeAll()');
      return 'beforeAll(';
    })
    // Convert after to afterAll
    .replace(/\bafter\s*\(/g, (match) => {
      console.log('  Converting after() to afterAll()');
      return 'afterAll(';
    });
  
  if (updatedContent !== content) {
    content = updatedContent;
    modified = true;
  }
  
  // Step 2: Fix import paths for setup.js
  updatedContent = content.replace(
    /from\s+['"]\.{1,2}\/setup\.js['"]/g,
    (match) => {
      console.log('  Fixing import path for setup.js');
      
      // Calculate the relative path from the test file to tests/integration/setup.js
      const testDir = dirname(file);
      const setupPath = relative(testDir, 'tests/integration').replace(/\\/g, '/');
      
      // If we're already in the integration directory, use './setup.js'
      // Otherwise, use the relative path
      const newPath = testDir === 'tests/integration' ? 
        './setup.js' : 
        `${setupPath}/setup.js`;
      
      return `from "${newPath}"`;
    }
  );
  
  if (updatedContent !== content) {
    content = updatedContent;
    modified = true;
  }
  
  // Step 3: Add .js extensions to imports
  updatedContent = content.replace(
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g,
    (match, importPath) => {
      // Skip if it's a package import or already has .js extension
      if (importPath.startsWith('@/') || 
          importPath.includes('node_modules') || 
          importPath.endsWith('.js') || 
          !importPath.includes('/')) {
        return match;
      }
      
      console.log(`  Adding .js extension to import: ${importPath}`);
      return match.replace(`"${importPath}"`, `"${importPath}.js"`);
    }
  );
  
  if (updatedContent !== content) {
    content = updatedContent;
    modified = true;
  }
  
  // Step 4: Fix duplicate class declarations
  // To fix this properly, we need to identify duplicates and convert to named exports
  // This is a simple detection - manual fixes may be needed
  const duplicateClassRegex = /class\s+(\w+)/g;
  const classNames = [];
  let match;
  
  while ((match = duplicateClassRegex.exec(content)) !== null) {
    const className = match[1];
    if (classNames.includes(className)) {
      console.log(`  ⚠️ WARNING: Potential duplicate class declaration found: ${className}`);
      console.log(`    You may need to manually fix this by converting to named imports/exports`);
    } else {
      classNames.push(className);
    }
  }
  
  // Step 5: Add missing Jest imports
  if (!content.includes('import { jest }') && content.includes('jest.')) {
    console.log('  Adding missing Jest import');
    const jestImport = "import { jest } from '@jest/globals';\n";
    
    // Find where to add the import
    const firstImportIndex = content.indexOf('import ');
    if (firstImportIndex !== -1) {
      updatedContent = content.substring(0, firstImportIndex) + jestImport + content.substring(firstImportIndex);
      content = updatedContent;
      modified = true;
    }
  }
  
  // Save the updated file if modified
  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    console.log(`✅ Updated ${file}`);
  } else {
    console.log(`ℹ️ No changes needed in ${file}`);
  }
}

console.log(`\n✅ Done! Modified ${filesModified} of ${testFiles.length} files.`);
console.log(`\nNext steps:`);
console.log(`1. Create a Jest setup file for integration tests: tests/integration/jest.setup.js`);
console.log(`2. Manually fix any duplicate class declarations`);
console.log(`3. Update import paths for any remaining broken imports`);
console.log(`4. Run the integration tests to check your progress: npm run test:integration`); 