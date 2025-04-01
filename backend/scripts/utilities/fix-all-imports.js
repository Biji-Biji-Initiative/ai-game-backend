#!/usr/bin/env node

/**
 * Comprehensive Import Path Fixer
 * 
 * This script:
 * 1. Finds circular dependencies using Madge
 * 2. Finds and fixes duplicate 'infra' segments in import paths
 * 3. Adds proper JS extensions to imports
 * 4. Generates a dependency graph for visualization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import madge from 'madge';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, 'src');
const MADGE_OUTPUT_DIR = path.join(__dirname, 'dependency-analysis');
const ENTRY_POINT = path.join(SRC_DIR, 'index.js');

// Create output directory
if (!fs.existsSync(MADGE_OUTPUT_DIR)) {
  fs.mkdirSync(MADGE_OUTPUT_DIR, { recursive: true });
}

// Get all JavaScript files
const getAllJsFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Recurse into subdirectories
      results = results.concat(getAllJsFiles(filePath));
    } else if (path.extname(file) === '.js') {
      results.push(filePath);
    }
  });
  
  return results;
};

// Fix all import paths in a file
const fixImportsInFile = (filePath) => {
  try {
    console.log(`Processing: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix 1: Replace 'infra/infra' with 'infra'
    if (content.includes('/infra/infra/')) {
      content = content.replace(/\/infra\/infra\//g, '/infra/');
      modified = true;
    }
    
    // Fix 2: Within infra directory, change '../infra/logging' to '../logging'
    if (filePath.includes('/core/infra/') && content.includes('../infra/logging')) {
      content = content.replace(/\.\.\/infra\/logging/g, '../logging');
      modified = true;
    }
    
    // Fix 3: Add .js extension to local imports without extensions
    const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:[^{}\s,]+))(?:\s*,\s*(?:(?:\{[^}]*\})|(?:[^{}\s,]+)))?\s+from\s+['"]([^'"]*)['"]/g;
    let match;
    let newContent = content;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      if (importPath.startsWith('.') && 
          !importPath.endsWith('.js') && 
          !importPath.endsWith('.json') &&
          !importPath.includes('node_modules')) {
        
        const newImportPath = `${importPath}.js`;
        newContent = newContent.replace(`from '${importPath}'`, `from '${newImportPath}'`);
        newContent = newContent.replace(`from "${importPath}"`, `from "${newImportPath}"`);
        modified = true;
      }
    }
    
    // Write changes back to file if modified
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  ✓ Fixed imports in ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
    return false;
  }
};

// Main function
async function main() {
  console.log('🔍 Finding all JS files in the project...');
  const jsFiles = getAllJsFiles(SRC_DIR);
  console.log(`Found ${jsFiles.length} JavaScript files.`);
  
  console.log('\n🔧 Fixing import paths in all files...');
  let fixCount = 0;
  
  jsFiles.forEach(file => {
    if (fixImportsInFile(file)) {
      fixCount++;
    }
  });
  
  console.log(`\n✅ Fixed imports in ${fixCount} files.`);
  
  try {
    console.log('\n📊 Generating dependency analysis with Madge...');
    
    // Create Madge instance
    const dependencyTree = await madge(ENTRY_POINT, {
      baseDir: __dirname,
      fileExtensions: ['js'],
      excludeRegExp: [/node_modules/],
      detectiveOptions: { es6: { mixedImports: true } }
    });
    
    // Generate SVG visualization
    await dependencyTree.image({
      fontSize: '8',
      layout: 'dot',
      imageFormat: 'svg',
      outputFilename: path.join(MADGE_OUTPUT_DIR, 'dependency-graph.svg')
    });
    console.log(`Generated dependency graph at: ${path.join(MADGE_OUTPUT_DIR, 'dependency-graph.svg')}`);
    
    // Find circular dependencies
    const circularDeps = dependencyTree.circular();
    if (circularDeps.length > 0) {
      console.log(`\n⚠️ Found ${circularDeps.length} circular dependencies:`);
      circularDeps.forEach((cycle, i) => {
        console.log(`  Cycle ${i + 1}: ${cycle.join(' → ')} → ${cycle[0]}`);
      });
      
      // Save circular dependencies to file
      fs.writeFileSync(
        path.join(MADGE_OUTPUT_DIR, 'circular-dependencies.json'),
        JSON.stringify(circularDeps, null, 2)
      );
    } else {
      console.log('\n✅ No circular dependencies found!');
    }
  } catch (error) {
    console.error('Error during Madge analysis:', error.message);
  }
  
  console.log('\n🚀 Import path fixing complete! Try running your app now.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 