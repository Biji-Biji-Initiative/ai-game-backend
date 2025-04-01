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
        
        // Fix duplicate infra segments
        if (importPath.includes('/infra/infra/')) {
          newPath = importPath.replace('/infra/infra/', '/infra/');
          pathChanged = true;
          fileFixCount++;
        }
        
        // Fix the specific case of '../infra/logging'
        if (importPath.includes('../infra/logging')) {
          newPath = importPath.replace('../infra/logging', '../logging');
          pathChanged = true;
          fileFixCount++;
        }
        
        // Add .js extensions if missing for relative paths
        if ((importPath.startsWith('./') || importPath.startsWith('../')) && 
            !importPath.endsWith('.js') && 
            !importPath.endsWith('.json') &&
            !importPath.includes('node_modules')) {
          newPath = `${newPath}.js`;
          pathChanged = true;
          fileFixCount++;
        }
        
        // Fix double .js extension
        if (newPath.endsWith('.js.js')) {
          newPath = newPath.replace('.js.js', '.js');
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

console.log(`\nCompleted! Fixed ${fixCount} imports across ${fixedFiles.length} files.`);
if (fixedFiles.length > 0) {
  console.log('\nFixed files:');
  fixedFiles.forEach(file => console.log(` - ${file}`));
} 