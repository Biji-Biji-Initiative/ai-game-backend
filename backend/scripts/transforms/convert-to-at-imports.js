/**
 * jscodeshift transform script to convert relative path imports (../) to absolute path imports (@/)
 * 
 * Run with:
 * npx jscodeshift -t scripts/transforms/convert-to-at-imports.js src/ --extensions=js,jsx --parser=babel
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Determines if a path is within the src directory
 * @param {string} filePath - The absolute path of the file
 * @returns {boolean} - True if the file is within src
 */
function isInSrc(filePath) {
  const normalizedPath = path.normalize(filePath);
  return normalizedPath.includes('/src/');
}

/**
 * Resolves a relative import to an absolute path
 * @param {string} importPath - The relative import path
 * @param {string} filePath - The file containing the import
 * @returns {string} - The resolved absolute path
 */
function resolveImportPath(importPath, filePath) {
  // Normalize path by replacing double slashes with single slash
  const normalizedImportPath = importPath.replace('//', '/');
  
  // Get the directory of the current file
  const fileDir = path.dirname(filePath);
  
  // Resolve the relative path against the file directory
  const absolutePath = path.resolve(fileDir, normalizedImportPath);
  
  // Get the project root (directory containing src)
  const srcIndex = absolutePath.indexOf('/src/');
  if (srcIndex === -1) {
    return importPath; // Not in src, keep unchanged
  }
  
  // Extract the path from src/ onwards and transform to @/
  const relativePath = absolutePath.substring(srcIndex + 5); // +5 to skip '/src/'
  return `@/${relativePath}`;
}

/**
 * Main transformer function
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Skip non-src files
  if (!isInSrc(file.path)) {
    return file.source;
  }

  // Find all import declarations
  root
    .find(j.ImportDeclaration)
    .forEach(path => {
      const importValue = path.node.source.value;
      
      // Only transform relative imports (starting with ../ or ./)
      if (importValue.startsWith('../') || importValue.startsWith('./')) {
        const newPath = resolveImportPath(importValue, file.path);
        
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
        
        // Only transform relative imports
        if (importValue.startsWith('../') || importValue.startsWith('./')) {
          const newPath = resolveImportPath(importValue, file.path);
          
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