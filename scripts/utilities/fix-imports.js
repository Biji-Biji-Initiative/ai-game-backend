#!/usr/bin/env node

/**
 * Script to remove the $0 suffix from import statements and fix the corresponding usage
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Function to walk through directory recursively
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
      fileList = walkDir(filePath, fileList);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to fix imports in a file
async function fixImports(filePath) {
  try {
    // Read file content
    const content = await readFileAsync(filePath, 'utf8');
    
    // Check if file contains $0 imports
    if (!content.includes('$0')) {
      return false;
    }
    
    // Regular expressions to match different import patterns with $0
    const importRegex = /import\s+(\w+)\$0\s+from\s+(['"].*?['"])/g;
    const destructureRegex = /const\s+\{\s*(.*?)\s*\}\s*=\s*(\w+)\$0;?/g;
    const directAssignmentRegex = /const\s+(\w+)\s*=\s*\{\s*(\w+):\s*(\w+)\$0\s*\}\.(\w+);?/g;
    
    // Fix import statements
    let newContent = content.replace(importRegex, (match, importName, source) => {
      console.log(`Fixing import in ${filePath}: ${match}`);
      return `import ${importName} from ${source}`;
    });
    
    // Fix destructure statements
    newContent = newContent.replace(destructureRegex, (match, destructured, importName) => {
      console.log(`Fixing destructure in ${filePath}: ${match}`);
      return `import { ${destructured} } from "${getModulePathFromImport(content, importName + '$0')}";`;
    });
    
    // Fix direct assignments like: const proxyquire = { noCallThru: proxyquire$0 }.noCallThru();
    newContent = newContent.replace(directAssignmentRegex, (match, constName, propName, importName, methodName) => {
      console.log(`Fixing direct assignment in ${filePath}: ${match}`);
      if (importName === constName + '$0') {
        return `const ${constName}${methodName.charAt(0).toUpperCase() + methodName.slice(1)} = ${constName}.${methodName}();`;
      }
      return match;
    });
    
    // If content was changed, write it back to the file
    if (newContent !== content) {
      await writeFileAsync(filePath, newContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Helper function to extract the module path from an import statement
function getModulePathFromImport(content, importName) {
  const regex = new RegExp(`import\\s+${importName}\\s+from\\s+(['"].*?['"])`, 'g');
  const match = regex.exec(content);
  if (match && match[1]) {
    return match[1].replace(/['"]/g, '');
  }
  return '';
}

// Main function
async function main() {
  const rootDir = process.cwd();
  console.log(`Scanning directory: ${rootDir}`);
  
  const files = walkDir(rootDir);
  console.log(`Found ${files.length} JavaScript files`);
  
  let modifiedCount = 0;
  
  for (const file of files) {
    const wasModified = await fixImports(file);
    if (wasModified) {
      modifiedCount++;
    }
  }
  
  console.log(`Done! Modified ${modifiedCount} files.`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
