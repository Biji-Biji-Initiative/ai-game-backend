// Import resolver for @ syntax and workspace dependencies
import { resolve as pathResolve, dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = pathResolve(__dirname);
const rootDir = pathResolve(__dirname, '../../../');
const rootNodeModules = pathResolve(rootDir, 'node_modules');
const DEBUG = process.env.DEBUG_RESOLVER === 'true';

function debug(...args) {
  if (DEBUG) {
    console.log('[ImportResolver]', ...args);
  }
}

// Check if running in the context of a test file
debug('Root directory:', rootDir);
debug('Base directory:', baseDir);
debug('Root node_modules:', rootNodeModules);

/**
 * Try to resolve a file with various extensions (.js, .mjs, etc.)
 * @param {string} filepath - Base filepath to try
 * @returns {string|null} - Resolved filepath or null if not found
 */
function tryExtensions(filepath) {
  const extensions = ['.js', '.mjs', '.cjs', '.json'];

  // First check if path exists as is
  if (existsSync(filepath)) {
    return filepath;
  }

  // Don't add extensions if we already have one
  if (extname(filepath)) {
    return null;
  }

  // Try with each extension
  for (const ext of extensions) {
    const pathWithExt = `${filepath}${ext}`;
    if (existsSync(pathWithExt)) {
      debug('Found with extension:', pathWithExt);
      return pathWithExt;
    }
  }

  // Try index file in directory
  for (const ext of extensions) {
    const indexPath = join(filepath, `index${ext}`);
    if (existsSync(indexPath)) {
      debug('Found index file:', indexPath);
      return indexPath;
    }
  }

  return null;
}

/**
 * Custom resolver for handling import/export statements
 */
export function resolve(specifier, context, nextResolve) {
  debug('Resolving:', specifier);

  // Handle @ path alias with more robust resolution
  if (specifier.startsWith('@/')) {
    const relativePath = specifier.replace('@/', '');
    const absolutePath = join(baseDir, relativePath);
    debug('Resolving @/ alias:', relativePath, 'to absolute path:', absolutePath);

    const resolvedPath = tryExtensions(absolutePath);
    if (resolvedPath) {
      debug('Successfully resolved @/ path:', resolvedPath);
      return nextResolve(resolvedPath, context);
    }

    debug('Failed to resolve @/ path:', absolutePath);
  }

  // Handle workspace dependencies (@ai-fight-club/*)
  if (specifier.startsWith('@ai-fight-club/')) {
    const parts = specifier.split('/');
    const packageName = parts[1];
    const packagePath = pathResolve(rootDir, 'packages', packageName);
    const packageJsonPath = join(packagePath, 'package.json');

    try {
      debug('Looking for workspace package:', packagePath);

      // If the import has more parts (e.g., @ai-fight-club/shared/utils)
      if (parts.length > 2) {
        const subPath = parts.slice(2).join('/');
        const resolvedSubPath = join(packagePath, 'src', subPath);
        debug('Resolving subpath within workspace:', resolvedSubPath);

        const resolvedPath = tryExtensions(resolvedSubPath);
        if (resolvedPath) {
          debug('Successfully resolved workspace subpath:', resolvedPath);
          return nextResolve(resolvedPath, context);
        }
      }

      // Try to use the main field from package.json
      if (existsSync(packageJsonPath)) {
        // Use synchronous file reading instead of await
        const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
        const pkg = JSON.parse(packageJsonContent);

        const mainField = pkg.type === 'module' ? pkg.module || pkg.main : pkg.main;
        if (mainField) {
          const mainPath = join(packagePath, mainField);
          debug('Trying package.json main field:', mainPath);

          if (existsSync(mainPath)) {
            debug('Found main entry point:', mainPath);
            return nextResolve(mainPath, context);
          }
        }
      }

      // Fall back to src/index.js
      const indexPath = join(packagePath, 'src', 'index.js');
      if (existsSync(indexPath)) {
        debug('Falling back to src/index.js:', indexPath);
        return nextResolve(indexPath, context);
      }
    } catch (error) {
      debug('Error resolving workspace package:', error.message);
    }
  }

  // Try to resolve from root node_modules for external dependencies
  try {
    // First try normal resolution
    debug('Trying normal resolution for:', specifier);
    return nextResolve(specifier, context);
  } catch (error) {
    debug('Normal resolution failed:', error.message);

    // Check if it's a node module
    const nodeModulePath = join(rootNodeModules, specifier);
    debug('Trying root node_modules:', nodeModulePath);

    if (existsSync(nodeModulePath)) {
      debug('Found in root node_modules:', nodeModulePath);
      return nextResolve(nodeModulePath, context);
    }

    // Try with package.json
    const pkgPath = join(rootNodeModules, specifier, 'package.json');
    if (existsSync(pkgPath)) {
      debug('Found package.json in root node_modules:', pkgPath);
      const pkgDir = join(rootNodeModules, specifier);
      return nextResolve(pkgDir, context);
    }

    // If all resolution attempts fail, throw the original error
    debug('All resolution attempts failed for:', specifier);
    throw error;
  }
}
