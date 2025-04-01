/**
 * Fix Common ESM-Related Issues in Tests
 * 
 * This script addresses several common issues that occur when migrating tests to ES modules:
 * 1. Missing .js extensions in local import paths
 * 2. Missing "type": "module" in package.json
 * 3. Properly handling __dirname and __filename replacements
 * 4. Ensuring proper import order and format
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, relative, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');

console.log('🔍 Finding test files with potential ESM issues...');

// Check if package.json has "type": "module"
function ensurePackageJsonHasModuleType() {
  const packageJsonPath = resolve(projectRoot, 'package.json');
  
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.type !== 'module') {
      console.log('⚠️ package.json does not have "type": "module" set');
      packageJson.type = 'module';
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Added "type": "module" to package.json');
    } else {
      console.log('✅ package.json already has "type": "module" set');
    }
  } else {
    console.log('❌ package.json not found');
  }
}

// Add .js extensions to local import paths
function fixMissingExtensions(files) {
  let fixedFiles = 0;
  
  for (const file of files) {
    const filePath = resolve(projectRoot, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Only process files that use ESM imports
    if (!content.includes('import ')) {
      continue;
    }
    
    // Fix import statements missing .js extension for local paths
    const updatedContent = content.replace(
      /import\s+(?:(?:{[^}]*})|(?:[^{}\s;]+))\s+from\s+['"]([^'"]*)['"]/g,
      (match, importPath) => {
        if ((importPath.startsWith('./') || importPath.startsWith('../')) && 
            !importPath.endsWith('.js') && 
            !importPath.endsWith('/') && 
            !importPath.includes('?') && 
            !extname(importPath)) {
          return match.replace(importPath, `${importPath}.js`);
        }
        return match;
      }
    );
    
    if (updatedContent !== content) {
      writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✅ Fixed missing .js extensions in ${file}`);
      fixedFiles++;
    }
  }
  
  return fixedFiles;
}

// Fix __dirname and __filename usage
function fixDirnameAndFilename(files) {
  let fixedFiles = 0;
  
  for (const file of files) {
    const filePath = resolve(projectRoot, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Skip if the file doesn't use __dirname or __filename
    if (!content.includes('__dirname') && !content.includes('__filename')) {
      continue;
    }
    
    // Check if import statements for fileURLToPath and dirname are present
    let updatedContent = content;
    const hasFileURLToPath = content.includes('fileURLToPath');
    const hasDirname = content.includes('import { dirname ');
    const hasPath = content.includes('import path from');
    
    // Add missing imports
    let imports = [];
    if (!hasFileURLToPath && !hasDirname) {
      imports.push("import { fileURLToPath } from 'url';");
      imports.push("import { dirname } from 'path';");
    } else if (!hasFileURLToPath) {
      imports.push("import { fileURLToPath } from 'url';");
    } else if (!hasDirname) {
      imports.push("import { dirname } from 'path';");
    }
    
    if (imports.length > 0) {
      // Add imports after existing import statements
      const lastImportIndex = content.lastIndexOf('import ');
      let lastImportEndIndex = -1;
      
      if (lastImportIndex !== -1) {
        lastImportEndIndex = content.indexOf(';', lastImportIndex) + 1;
        const importStatements = imports.join('\n') + '\n';
        updatedContent = content.substring(0, lastImportEndIndex) + 
                          '\n' + importStatements + 
                          content.substring(lastImportEndIndex);
      } else {
        // No existing imports, add at the top of the file
        updatedContent = imports.join('\n') + '\n\n' + content;
      }
    }
    
    // Add ESM equivalents for __dirname and __filename if they don't exist
    if (!updatedContent.includes('const __filename =') && 
        !updatedContent.includes('const __dirname =')) {
      
      const dirnameSetup = `
// ESM equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`;
      
      // Insert after imports
      const lastImportIndex = updatedContent.lastIndexOf('import ');
      let insertIndex = 0;
      
      if (lastImportIndex !== -1) {
        insertIndex = updatedContent.indexOf(';', lastImportIndex) + 1;
        updatedContent = updatedContent.substring(0, insertIndex) + 
                          '\n' + dirnameSetup + 
                          updatedContent.substring(insertIndex);
      } else {
        // No imports, add at the top
        updatedContent = dirnameSetup + '\n' + updatedContent;
      }
    }
    
    if (updatedContent !== content) {
      writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✅ Fixed __dirname and __filename usage in ${file}`);
      fixedFiles++;
    }
  }
  
  return fixedFiles;
}

// Handle dynamic imports
function fixDynamicImports(files) {
  let fixedFiles = 0;
  
  for (const file of files) {
    const filePath = resolve(projectRoot, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Check for potential dynamic imports (require statements used dynamically)
    if (!content.includes('require(') || !content.match(/require\(\s*[^'"]/)) {
      continue;
    }
    
    // Replace dynamic requires with dynamic imports
    const updatedContent = content.replace(
      /(?:const|let|var)?\s*([a-zA-Z0-9_]+)\s*=\s*require\(\s*([^'"]\S+)\s*\)/g,
      (match, varName, pathVar) => {
        return `const ${varName} = await import(${pathVar})`;
      }
    );
    
    if (updatedContent !== content) {
      writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✅ Fixed dynamic imports in ${file}`);
      fixedFiles++;
    }
  }
  
  return fixedFiles;
}

// Main function
async function main() {
  // Ensure package.json has "type": "module"
  ensurePackageJsonHasModuleType();
  
  // Find all test JavaScript files
  const testFiles = globSync('tests/**/*.js', { cwd: projectRoot });
  console.log(`Found ${testFiles.length} test files to check.`);
  
  // Fix issues
  const fixedExtensions = fixMissingExtensions(testFiles);
  const fixedDirname = fixDirnameAndFilename(testFiles);
  const fixedDynamicImports = fixDynamicImports(testFiles);
  
  console.log('\n✅ ESM fixes complete:');
  console.log(`- Fixed missing extensions in ${fixedExtensions} files`);
  console.log(`- Fixed __dirname and __filename in ${fixedDirname} files`);
  console.log(`- Fixed dynamic imports in ${fixedDynamicImports} files`);
  console.log(`- Total files fixed: ${fixedExtensions + fixedDirname + fixedDynamicImports}`);
}

// Run the main function
main(); 