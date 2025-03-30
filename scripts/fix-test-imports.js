#!/usr/bin/env node
/**
 * Script to fix import paths in test files after consolidation
 * This will:
 * 1. Scan all test files
 * 2. Update relative imports to use proper paths
 * 3. Deduplicate imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Function to find all test files
function findTestFiles() {
  console.log('Finding all test files...');
  const files = glob.sync('tests/**/*.test.{js,jsx,ts,tsx}', {
    cwd: projectRoot,
    ignore: ['**/node_modules/**']
  });
  console.log(`Found ${files.length} test files.`);
  return files;
}

// Regular expressions for imports
const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+[^;]+|[^;{]*)\s+from\s+['"]([^'"]+)['"]/g;
const requireRegex = /(?:const|let|var)\s+(?:{[^}]*}|[^\s=]+)\s+=\s+require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// Function to parse imports from a file
function parseImports(content) {
  const imports = [];
  
  // Find ES6 imports
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      type: 'import',
      path: match[1],
      full: match[0],
      range: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  
  // Find CommonJS requires
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push({
      type: 'require',
      path: match[1],
      full: match[0],
      range: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  
  return imports;
}

// Function to check if an import path needs updating
function shouldUpdatePath(importPath) {
  // Only update relative paths
  return importPath.startsWith('.') || importPath.startsWith('../../');
}

// Function to fix a specific import path based on the file location
function fixImportPath(importPath, filePath) {
  // Skip non-relative paths (npm packages, etc.)
  if (!shouldUpdatePath(importPath)) {
    return importPath;
  }
  
  try {
    const fileDir = path.dirname(filePath);
    const absoluteImportPath = path.resolve(path.join(projectRoot, fileDir), importPath);
    
    // Check if this is pointing to a source file
    const isSourceImport = absoluteImportPath.includes('/src/');
    
    // For source imports, ensure they come from the src directory properly
    if (isSourceImport) {
      // Convert to a path relative to the project root
      const relativeToRoot = path.relative(projectRoot, absoluteImportPath);
      
      // For source imports, we want to keep them as relative to src
      return relativeToRoot;
    }
    
    // For test imports, create a path relative to the current file
    const relativeToFile = path.relative(
      path.join(projectRoot, fileDir),
      absoluteImportPath
    );
    
    // Ensure path starts with ./ or ../
    return relativeToFile.startsWith('.') ? relativeToFile : `./${relativeToFile}`;
  } catch (error) {
    console.error(`Error fixing import path '${importPath}' in '${filePath}':`, error.message);
    return importPath; // Return original path if we can't fix it
  }
}

// Function to fix imports in a single file
function fixFileImports(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  try {
    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Parse imports
    const imports = parseImports(content);
    
    if (imports.length === 0) {
      return { filePath, updated: false };
    }
    
    // Track if any imports were updated
    let updated = false;
    let newContent = content;
    
    // Process imports in reverse order to avoid position shifts
    const sortedImports = [...imports].sort((a, b) => b.range.start - a.range.start);
    
    for (const importObj of sortedImports) {
      const oldPath = importObj.path;
      const newPath = fixImportPath(oldPath, filePath);
      
      if (oldPath !== newPath) {
        // Replace the import path in the content
        const replacement = importObj.full.replace(
          new RegExp(`from\\s+['"]${escapeRegExp(oldPath)}['"]`),
          `from '${newPath}'`
        ).replace(
          new RegExp(`require\\s*\\(\\s*['"]${escapeRegExp(oldPath)}['"]\\s*\\)`),
          `require('${newPath}')`
        );
        
        newContent = 
          newContent.substring(0, importObj.range.start) +
          replacement +
          newContent.substring(importObj.range.end);
          
        updated = true;
      }
    }
    
    // If imports were updated, write the file
    if (updated) {
      fs.writeFileSync(fullPath, newContent);
    }
    
    return { filePath, updated };
  } catch (error) {
    console.error(`Error processing file '${filePath}':`, error.message);
    return { filePath, updated: false, error: error.message };
  }
}

// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Function to deduplicate imports in a file
function deduplicateImports(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  try {
    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Parse imports
    const imports = parseImports(content);
    
    if (imports.length <= 1) {
      return { filePath, updated: false };
    }
    
    // Group imports by path
    const importsByPath = {};
    for (const imp of imports) {
      if (!importsByPath[imp.path]) {
        importsByPath[imp.path] = [];
      }
      importsByPath[imp.path].push(imp);
    }
    
    // Find duplicate paths
    const duplicatePaths = Object.keys(importsByPath).filter(
      path => importsByPath[path].length > 1
    );
    
    if (duplicatePaths.length === 0) {
      return { filePath, updated: false };
    }
    
    // Process duplicate imports
    let newContent = content;
    let offset = 0;
    
    for (const importPath of duplicatePaths) {
      // Sort imports in reverse order to handle offsets correctly
      const duplicates = importsByPath[importPath].sort(
        (a, b) => b.range.start - a.range.start
      );
      
      // Keep the first import and remove the rest
      for (let i = 0; i < duplicates.length - 1; i++) {
        const imp = duplicates[i];
        const start = imp.range.start + offset;
        const end = imp.range.end + offset;
        
        // Remove the import
        newContent = newContent.substring(0, start) + newContent.substring(end);
        offset -= (end - start);
      }
    }
    
    // Write the updated content
    fs.writeFileSync(fullPath, newContent);
    
    return { filePath, updated: true };
  } catch (error) {
    console.error(`Error deduplicating imports in '${filePath}':`, error.message);
    return { filePath, updated: false, error: error.message };
  }
}

// Main function to fix all test file imports
async function fixTestImports() {
  console.log('Starting import path fixes for test files...');
  
  // Find all test files
  const testFiles = findTestFiles();
  
  // First pass: Fix import paths
  console.log('\nFixing import paths...');
  let updatedCount = 0;
  
  for (const file of testFiles) {
    const result = fixFileImports(file);
    if (result.updated) {
      console.log(`  Updated: ${file}`);
      updatedCount++;
    }
  }
  
  console.log(`\nImport paths updated in ${updatedCount} files.`);
  
  // Second pass: Deduplicate imports
  console.log('\nDeduplicating imports...');
  let deduplicatedCount = 0;
  
  for (const file of testFiles) {
    const result = deduplicateImports(file);
    if (result.updated) {
      console.log(`  Deduplicated: ${file}`);
      deduplicatedCount++;
    }
  }
  
  console.log(`\nDuplicate imports removed in ${deduplicatedCount} files.`);
  console.log('\nImport path fixing complete!');
}

// Run the import fixer
fixTestImports().catch(error => console.error('Import fixing failed:', error)); 