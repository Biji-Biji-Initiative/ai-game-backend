/**
 * Fix CommonJS to ESM Conversion
 * 
 * This script detects and converts CommonJS require() statements to ES module
 * import statements in test files. It also fixes other CommonJS patterns
 * like module.exports to export statements.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, relative, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');

console.log('🔍 Finding files with CommonJS syntax...');

// Find all JavaScript test files
const files = globSync('tests/**/*.js', { cwd: projectRoot });

let totalFiles = 0;
let fixedFiles = 0;

// Process each file
for (const file of files) {
  totalFiles++;
  const filePath = resolve(projectRoot, file);
  const content = readFileSync(filePath, 'utf-8');

  // Skip if file already has 'import' statements and no 'require' statements
  if (content.includes('import ') && !content.includes('require(')) {
    continue;
  }

  console.log(`Checking ${file}...`);
  
  // Convert require statements to import statements
  let updatedContent = content;

  // Convert simple require statements: const x = require('y')
  updatedContent = updatedContent.replace(
    /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
    (match, varName, modulePath) => {
      // Add .js extension for local relative imports if they don't have an extension
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        if (!extname(modulePath)) {
          modulePath = `${modulePath}.js`;
        }
      }
      return `import ${varName} from "${modulePath}";`;
    }
  );

  // Convert destructured require statements: const { a, b } = require('y')
  updatedContent = updatedContent.replace(
    /const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
    (match, imports, modulePath) => {
      // Clean up the imports
      const cleanImports = imports.split(',').map(i => i.trim()).join(', ');
      
      // Add .js extension for local relative imports
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        if (!extname(modulePath)) {
          modulePath = `${modulePath}.js`;
        }
      }
      
      return `import { ${cleanImports} } from "${modulePath}";`;
    }
  );

  // Convert require statements with object property access: const x = require('y').z
  updatedContent = updatedContent.replace(
    /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)\.(\w+);?/g,
    (match, varName, modulePath, propName) => {
      // Add .js extension for local relative imports
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        if (!extname(modulePath)) {
          modulePath = `${modulePath}.js`;
        }
      }
      
      return `import { ${propName} as ${varName} } from "${modulePath}";`;
    }
  );

  // Convert module.exports to export default or named exports
  if (updatedContent.includes('module.exports')) {
    // Simple module.exports = something
    updatedContent = updatedContent.replace(
      /module\.exports\s*=\s*([^;]+);?/g,
      (match, exportValue) => {
        return `export default ${exportValue};`;
      }
    );
    
    // Object module.exports = { a, b, c }
    updatedContent = updatedContent.replace(
      /module\.exports\s*=\s*\{([^}]+)\};?/g,
      (match, exports) => {
        // If the exports are simple name: value pairs where name === value, 
        // convert to named exports
        const exportPairs = exports.split(',').map(e => e.trim());
        const simpleExports = exportPairs.filter(e => {
          const [name, value] = e.split(':').map(p => p.trim());
          return !value || name === value;
        });
        
        if (simpleExports.length === exportPairs.length) {
          // All exports are simple, convert to named exports
          const namedExports = exportPairs.map(e => {
            if (e.includes(':')) {
              const [name] = e.split(':').map(p => p.trim());
              return name;
            }
            return e;
          }).join(', ');
          
          return `export { ${namedExports} };`;
        } else {
          // Some complex exports, keep as default export
          return `export default { ${exports} };`;
        }
      }
    );
  }

  // If content was updated, write it back to the file
  if (updatedContent !== content) {
    writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`✅ Converted ${file} to ES modules`);
    fixedFiles++;
  }
}

console.log(`\n✅ Done! Converted ${fixedFiles} of ${totalFiles} files to ES modules.`); 