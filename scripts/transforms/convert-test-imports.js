/**
 * jscodeshift transform script to convert relative imports in test files
 * from ../../../src/ to @/
 * 
 * Run with:
 * npx jscodeshift -t scripts/transforms/convert-test-imports.js tests/ --extensions=js --parser=babel
 */

import * as path from 'path';

/**
 * Checks if an import points to the src directory
 * @param {string} importPath - The import path to check
 * @returns {boolean} - True if the import points to src
 */
function isSrcImport(importPath) {
  return importPath.includes('../src/') || importPath.includes('../../src/') || importPath.includes('../../../src/');
}

/**
 * Converts a relative import path to an @ import
 * @param {string} importPath - The relative import path
 * @returns {string} - The @ import path
 */
function convertToAtImport(importPath) {
  // Find the src/ part in the import path
  const srcIndex = importPath.indexOf('src/');
  if (srcIndex === -1) {
    return importPath; // Not a src import
  }
  
  // Convert to @ import (replacing src/ with @/)
  return '@/' + importPath.substring(srcIndex + 4);
}

/**
 * Main transformer function
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Find all import declarations
  root
    .find(j.ImportDeclaration)
    .forEach(path => {
      const importValue = path.node.source.value;
      
      // Only transform imports that point to src/
      if (isSrcImport(importValue)) {
        const newPath = convertToAtImport(importValue);
        
        // Update if the path changed
        if (newPath !== importValue) {
          path.node.source.value = newPath;
          hasChanges = true;
        }
      }
    });

  // Also find require statements
  root
    .find(j.CallExpression, {
      callee: { name: 'require' }
    })
    .forEach(path => {
      // Only process require with string literal argument
      if (
        path.node.arguments.length === 1 &&
        path.node.arguments[0].type === 'StringLiteral'
      ) {
        const importValue = path.node.arguments[0].value;
        
        // Only transform imports that point to src/
        if (isSrcImport(importValue)) {
          const newPath = convertToAtImport(importValue);
          
          // Update if the path changed
          if (newPath !== importValue) {
            path.node.arguments[0].value = newPath;
            hasChanges = true;
          }
        }
      }
    });
  
  // Only return changed source
  return hasChanges ? root.toSource() : file.source;
} 