/**
 * Fix Source Import Paths
 * 
 * This script fixes import paths in source and test files that use @/core and @/config
 * module aliases, replacing them with proper relative imports for ES module compatibility.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');
const srcRoot = resolve(projectRoot, 'src');

console.log('🔍 Finding files with module alias imports...');

// Find all JavaScript files in the src and tests directories
const srcFiles = globSync('src/**/*.js', { cwd: projectRoot });
const testFiles = globSync('tests/**/*.js', { cwd: projectRoot });
const files = [...srcFiles, ...testFiles];

let totalFiles = 0;
let fixedFiles = 0;

// Function to fix a specific module alias pattern
function fixModuleAlias(content, fileDir, pattern, targetDir) {
  return content.replace(
    new RegExp(`import\\s+([^;]+?)\\s+from\\s+["']${pattern}/(.*?)["'];?`, 'g'),
    (match, importedItems, importPath) => {
      // Calculate relative path from the file to the target directory
      const relativePath = relative(fileDir, resolve(srcRoot, targetDir));
      
      // Make sure the path starts with ./ or ../
      const formattedPath = relativePath.startsWith('.') 
        ? `${relativePath}/${importPath}` 
        : `./${relativePath}/${importPath}`;
      
      // Ensure .js extension
      const pathWithExtension = formattedPath.endsWith('.js') 
        ? formattedPath 
        : `${formattedPath}.js`;
      
      return `import ${importedItems} from "${pathWithExtension}";`;
    }
  );
}

// Process each file
for (const file of files) {
  totalFiles++;
  const filePath = resolve(projectRoot, file);
  const content = readFileSync(filePath, 'utf-8');

  // Check if the file contains module alias imports
  if (!content.includes('@/core') && !content.includes('@/config')) {
    continue;
  }

  // Get the directory of the file relative to the src directory
  const fileDir = dirname(filePath);
  
  // Replace module alias imports with relative paths
  let updatedContent = content;
  
  // Fix @/core imports
  if (content.includes('@/core')) {
    updatedContent = fixModuleAlias(updatedContent, fileDir, '@/core', 'core');
  }
  
  // Fix @/config imports
  if (content.includes('@/config')) {
    updatedContent = fixModuleAlias(updatedContent, fileDir, '@/config', 'config');
  }

  // If content was updated, write it back to the file
  if (updatedContent !== content) {
    writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`✅ Fixed imports in ${file}`);
    fixedFiles++;
  }
}

console.log(`\n✅ Done! Fixed imports in ${fixedFiles} of ${totalFiles} files.`); 