/**
 * Custom module resolver for @ imports
 * 
 * This module hooks into Node's module resolution system
 * to support @ imports that point to the src directory.
 */

import { resolve as resolvePath, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolvePath(__dirname);
const rootDir = resolvePath(__dirname, '..');

export function resolve(specifier, context, nextResolve) {
  // Check if the specifier starts with @/
  if (specifier.startsWith('../../../'')) {
    // Replace @ with the src directory path
    const mappedSpecifier = specifier.replace('../../../'', `${srcDir}/`);
    
    try {
      // Pass the modified specifier to the next resolver
      return nextResolve(mappedSpecifier, context);
    } catch (error) {
      // Instead of silently handling errors, throw with clear context
      throw new Error(`Failed to resolve import: ${specifier} -> ${mappedSpecifier}\nOriginal error: ${error.message}`);
    }
  }
  
  // For all other specifiers, continue with the default resolution
  return nextResolve(specifier, context);
}

console.log('@ import resolver registered successfully'); 