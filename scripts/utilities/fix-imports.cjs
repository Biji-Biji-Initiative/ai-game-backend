/**
 * jscodeshift transform to fix ES Module import paths
 * Run with: npx jscodeshift -t fix-imports.cjs --extensions=js src/
 */

module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let hasModifications = false;

  // Fix common path issues
  root.find(j.ImportDeclaration).forEach(path => {
    const importPath = path.node.source.value;
    let newPath = importPath;

    // Fix missing .js extensions for local imports
    if (importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('/')) {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.jsx') && !importPath.endsWith('.json')) {
        newPath = `${importPath}.js`;
        hasModifications = true;
      }
    }

    // Fix duplicate core segment in paths
    if (importPath.includes('/core/core/')) {
      newPath = importPath.replace('/core/core/', '/core/');
      hasModifications = true;
    }

    // Fix incorrect logging path (src/core/logging/logger -> src/core/infra/logging/logger.js)
    if (importPath.includes('/logging/logger') && !importPath.includes('/infra/logging/logger')) {
      newPath = importPath.replace('/logging/logger', '/infra/logging/logger.js');
      hasModifications = true; 
    }

    // Fix incorrect errors path
    if (importPath.includes('/errors/ChallengeErrors') && 
        !importPath.endsWith('.js') && 
        !importPath.includes('/core/challenge/errors/ChallengeErrors')) {
      // Repositories in config folder should use ../../errors/ChallengeErrors.js
      if (fileInfo.path.includes('/repositories/config/')) {
        newPath = '../../errors/ChallengeErrors.js';
        hasModifications = true;
      } else if (fileInfo.path.includes('/repositories/')) {
        // Repositories in root should use ../errors/ChallengeErrors.js
        newPath = '../errors/ChallengeErrors.js';
        hasModifications = true;
      }
    }

    // Update the import path if it was modified
    if (newPath !== importPath) {
      path.node.source.value = newPath;
    }
  });

  return hasModifications ? root.toSource() : fileInfo.source;
}; 