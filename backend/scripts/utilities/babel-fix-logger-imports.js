import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import { glob } from 'glob';

// ES modules fixes
const traverse = _traverse.default;
const generate = _generate.default;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all JS files
const files = glob.sync('src/**/*.js');

let fixCount = 0;
const fixedFiles = [];

console.log(`Processing ${files.length} JavaScript files...`);

files.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    
    // Parse the file
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
    
    let fileModified = false;
    let fileFixCount = 0;
    
    // Traverse and fix import paths
    traverse(ast, {
      ImportDeclaration(nodePath) {
        const importPath = nodePath.node.source.value;
        let newPath = importPath;
        let pathChanged = false;
        
        // Fix the core/logging paths that should be core/infra/logging
        if ((importPath.includes('/logging/logger.js') || importPath.includes('/logging/domainLogger.js')) && 
            !importPath.includes('/infra/logging/')) {
            
          // Calculate the correct relative path based on the file location
          const fileDir = path.dirname(file);
          const relativeToCore = path.relative(fileDir, path.join(__dirname, 'src/core'));
          
          // Figure out if we need to go up one more level
          if (importPath.startsWith('../logging/')) {
            // We're already at the core level
            newPath = importPath.replace('../logging/', '../infra/logging/');
          } else if (importPath.startsWith('../../logging/')) {
            // We're one level below core, typically in a domain folder
            newPath = importPath.replace('../../logging/', '../../infra/logging/');
          } else if (importPath.startsWith('../../../logging/')) {
            // We're two levels below core
            newPath = importPath.replace('../../../logging/', '../../../infra/logging/');
          }
          
          pathChanged = true;
          fileFixCount++;
        }
        
        // Update the import path if changed
        if (pathChanged) {
          nodePath.node.source.value = newPath;
          fileModified = true;
          console.log(`  - Fixed in ${file}: ${importPath} → ${newPath}`);
        }
      }
    });
    
    // Only write back if changes were made
    if (fileModified) {
      const output = generate(ast, {}, code);
      fs.writeFileSync(file, output.code);
      fixCount += fileFixCount;
      fixedFiles.push(file);
    }
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
  }
});

console.log(`\nCompleted! Fixed ${fixCount} logger imports across ${fixedFiles.length} files.`);
if (fixedFiles.length > 0) {
  console.log('\nFixed files:');
  fixedFiles.forEach(file => console.log(` - ${file}`));
} 