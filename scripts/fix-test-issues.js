#!/usr/bin/env node

/**
 * ESM Test Conversion Script
 * 
 * This script helps convert Mocha+CommonJS tests to Jest+ESM format:
 * 1. Adds Jest imports
 * 2. Converts assertion syntax from Jest to Chai
 * 3. Fixes import paths by adding .js extensions
 * 4. Updates @/ imports to relative paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Get all test files
const getTestFiles = (dir) => {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(getTestFiles(filePath));
    } else if (file.endsWith('.test.js')) {
      results.push(filePath);
    }
  }
  
  return results;
};

// Main fixes
const fixFile = (filePath) => {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file needs processing
  const needsJestImport = !content.includes("import { jest } from '@jest/globals'");
  const hasJestExpect = content.includes("expect(") && 
                        (content.includes("toBe(") || 
                         content.includes("toEqual(") || 
                         content.includes("toHaveBeenCalled"));
  const hasDuplicateJestImports = (content.match(/import\s+{\s*jest\s*}/g) || []).length > 1;
  
  // 1. Add Jest imports if needed
  if (needsJestImport) {
    content = `import { jest } from '@jest/globals';\n${content}`;
  }
  
  // 2. Add Chai import and fix duplicate imports
  if (hasDuplicateJestImports) {
    // Remove all Jest imports
    content = content.replace(/import\s+{\s*jest\s*}\s+from\s+['"]@jest\/globals['"];\n/g, '');
    // Add back once at the top
    content = `import { jest } from '@jest/globals';\n${content}`;
  }
  
  // 3. Fix import paths
  content = content.replace(/from\s+['"]([^'"]+)['"]/g, (match, importPath) => {
    // Skip external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      return match;
    }
    
    // Fix @/ imports
    if (importPath.startsWith('@/')) {
      const relativePath = path.relative(
        path.dirname(filePath),
        path.join(rootDir, 'src', importPath.slice(2))
      );
      
      return `from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}${!relativePath.endsWith('.js') ? '.js' : ''}'`;
    }
    
    // Fix double .js extensions
    if (importPath.endsWith('.js.js')) {
      return `from '${importPath.substring(0, importPath.length - 3)}'`;
    }
    
    // Add .js to relative imports if missing
    if (importPath.startsWith('.') && !importPath.endsWith('.js')) {
      return `from '${importPath}.js'`;
    }
    
    return match;
  });
  
  // Fix mocks in Jest syntax
  content = content.replace(/jest\.mock\(['"]([^'"]+)['"]/, (match, mockPath) => {
    // Fix double .js extensions in mocks
    if (mockPath.endsWith('.js.js')) {
      return `jest.mock('${mockPath.substring(0, mockPath.length - 3)}'`;
    }
    
    // Add .js to mock paths if missing
    if (!mockPath.endsWith('.js') && !mockPath.includes('node_modules')) {
      return `jest.mock('${mockPath}.js'`;
    }
    
    return match;
  });
  
  // 4. Convert assertion syntax from Jest to Chai
  if (hasJestExpect) {
    // Convert basic assertions
    content = content
      .replace(/expect\(([^)]+)\)\.toBe\(([^)]+)\)/g, 'expect($1).to.equal($2)')
      .replace(/expect\(([^)]+)\)\.toEqual\(([^)]+)\)/g, 'expect($1).to.deep.equal($2)')
      .replace(/expect\(([^)]+)\)\.toHaveBeenCalled\(\)/g, 'expect($1).to.have.been.called')
      .replace(/expect\(([^)]+)\)\.toHaveBeenCalledWith\(([^)]+)\)/g, 'expect($1).to.have.been.calledWith($2)')
      .replace(/expect\(([^)]+)\)\.toBeDefined\(\)/g, 'expect($1).to.exist')
      .replace(/expect\(([^)]+)\)\.toBeUndefined\(\)/g, 'expect($1).to.not.exist')
      .replace(/expect\(([^)]+)\)\.toContain\(([^)]+)\)/g, 'expect($1).to.contain($2)')
      .replace(/expect\(([^)]+)\)\.toBeInstanceOf\(([^)]+)\)/g, 'expect($1).to.be.instanceOf($2)')
      .replace(/expect\(([^)]+)\)\.toMatch\(([^)]+)\)/g, 'expect($1).to.match($2)')
      .replace(/expect\(([^)]+)\)\.toThrow\(\)/g, 'expect($1).to.throw()')
      .replace(/expect\(([^)]+)\)\.not\.toThrow\(\)/g, 'expect($1).to.not.throw()');
      
    // Convert fail to expect.fail
    content = content.replace(/fail\((['"][^'"]+['"])\)/g, 'expect.fail($1)');
  }
  
  // 5. Fix import from local test-helpers
  content = content.replace(/from\s+['"]\.\/test-helpers\/setup\.js['"]/g, 
    `from "${path.relative(path.dirname(filePath), path.join(rootDir, 'tests', 'test-helpers', 'setup.js'))}"`);
  
  // Write changes back
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${filePath}`);
};

const main = () => {
  console.log('🔍 Finding test files...');
  const testFiles = getTestFiles(path.join(rootDir, 'tests'));
  console.log(`Found ${testFiles.length} test files`);
  
  for (const file of testFiles) {
    try {
      fixFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }
  
  console.log('✅ All done!');
};

main(); 