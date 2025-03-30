#!/usr/bin/env node
/**
 * Fix Value Object Usage in Tests
 * 
 * This script scans test files and updates them to use proper Value Objects
 * instead of primitive IDs. It focuses on:
 * 1. Adding proper imports for Value Objects
 * 2. Converting primitive IDs to Value Objects
 * 3. Updating object creation and method parameters
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');

// Command-line arguments
const args = process.argv.slice(2);
const targetDomain = args[0] || 'user'; // Default to user domain if not specified

// Value Object import paths and definitions by domain
const valueObjectConfig = {
  user: {
    importPath: '../../../src/core/common/valueObjects/UserId.js',
    idClassName: 'UserId',
    idRegex: /['"]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|user-\w+)['"]|['"](\w+@\w+\.\w+)['"]/g,
    createMethod: 'const createUserId = (id) => new UserId(id);'
  },
  challenge: {
    importPath: '../../../src/core/common/valueObjects/ChallengeId.js',
    idClassName: 'ChallengeId',
    idRegex: /['"]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|challenge-\w+)['"]|['"](\w+-\d+-\d+)['"]/g,
    createMethod: 'const createChallengeId = (id) => new ChallengeId(id);'
  },
  focusArea: {
    importPath: '../../../src/core/common/valueObjects/FocusAreaId.js',
    idClassName: 'FocusAreaId',
    idRegex: /['"]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|focus-\w+)['"]|['"](\w+-area-\d+)['"]/g,
    createMethod: 'const createFocusAreaId = (id) => new FocusAreaId(id);'
  },
  evaluation: {
    importPath: '../../../src/core/common/valueObjects/EvaluationId.js',
    idClassName: 'EvaluationId',
    idRegex: /['"]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|evaluation-\w+)['"]|['"](\w+-eval-\d+)['"]/g,
    createMethod: 'const createEvaluationId = (id) => new EvaluationId(id);'
  },
  personality: {
    importPath: '../../../src/core/common/valueObjects/PersonalityId.js',
    idClassName: 'PersonalityId',
    idRegex: /['"]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|personality-\w+)['"]|['"](\w+-profile-\d+)['"]/g,
    createMethod: 'const createPersonalityId = (id) => new PersonalityId(id);'
  }
};

// Ensure we have a valid domain
if (!valueObjectConfig[targetDomain]) {
  console.error(`Error: Unknown domain "${targetDomain}". Valid domains are: ${Object.keys(valueObjectConfig).join(', ')}`);
  process.exit(1);
}

console.log(`🔍 Finding test files for ${targetDomain} domain...`);

// Find all test files for the target domain
const testFiles = globSync([
  `tests/domain/${targetDomain}/**/*.test.js`,
  `tests/integration/**/${targetDomain}*.test.js`,
  `tests/integration/${targetDomain}/**/*.test.js`
], { cwd: projectRoot });

console.log(`Found ${testFiles.length} test files for ${targetDomain} domain.`);

// Keep track of files modified
let filesModified = 0;

// Process each test file
for (const file of testFiles) {
  console.log(`\nProcessing ${file}...`);
  
  try {
    const filePath = resolve(projectRoot, file);
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Step 1: Check if we need to add an import for the value object
    const { importPath, idClassName, idRegex, createMethod } = valueObjectConfig[targetDomain];
    
    // Check if the file already imports the value object
    const hasImport = content.includes(`import ${idClassName} from`) || 
                     content.includes(`import { ${idClassName} } from`);
    
    // Check if the file uses primitive IDs matching our pattern
    const primitiveIdMatches = content.match(idRegex);
    
    if (primitiveIdMatches && primitiveIdMatches.length > 0 && !hasImport) {
      console.log(`  Adding import for ${idClassName}`);
      
      // Add the import statement for the value object
      let importStatement = `import ${idClassName} from "${importPath}";\n`;
      
      // Find where to add the import (after the last import statement)
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const lastImportEnd = content.indexOf('\n', lastImportIndex) + 1;
        content = content.substring(0, lastImportEnd) + importStatement + content.substring(lastImportEnd);
        modified = true;
        
        // Add a helper method for creating the ID objects
        const helperPosition = content.search(/describe\s*\(/);
        if (helperPosition !== -1) {
          const beforeDescribe = content.substring(0, helperPosition).trimEnd();
          const afterDescribe = content.substring(helperPosition);
          content = `${beforeDescribe}\n\n// Helper for creating ${idClassName} value objects\n${createMethod}\n\n${afterDescribe}`;
          modified = true;
        }
      }
    }
    
    // Step 2: Replace primitive IDs with value objects in repository methods
    if (primitiveIdMatches && primitiveIdMatches.length > 0) {
      // Common repository operations that should use value objects
      const repoOperations = [
        { 
          pattern: /(\w+)\.findById\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, repo, id) => `${repo}.findById(create${idClassName}(${id}))`
        },
        { 
          pattern: /(\w+)\.getById\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, repo, id) => `${repo}.getById(create${idClassName}(${id}))`
        },
        { 
          pattern: /(\w+)\.update\((['"][\w@\.-]+['"])/g, 
          replacement: (match, repo, id) => `${repo}.update(create${idClassName}(${id})`
        },
        { 
          pattern: /(\w+)\.delete\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, repo, id) => `${repo}.delete(create${idClassName}(${id}))`
        },
        { 
          pattern: /(\w+)\.findOne\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, repo, id) => `${repo}.findOne(create${idClassName}(${id}))`
        },
        { 
          pattern: /(\w+)\.save\(\s*\{[^}]*id\s*:\s*(['"][\w@\.-]+['"])/g, 
          replacement: (match, repo, id) => match.replace(id, `create${idClassName}(${id})`)
        }
      ];
      
      // Replace repository operations
      for (const { pattern, replacement } of repoOperations) {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
          console.log(`  Replaced repository operations to use ${idClassName}`);
        }
      }
      
      // Step 3: Replace service method calls
      const serviceOperations = [
        { 
          pattern: /(\w+Service)\.getById\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, service, id) => `${service}.getById(create${idClassName}(${id}))`
        },
        { 
          pattern: /(\w+Service)\.findById\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, service, id) => `${service}.findById(create${idClassName}(${id}))`
        },
        { 
          pattern: /(\w+Service)\.update\((['"][\w@\.-]+['"])/g, 
          replacement: (match, service, id) => `${service}.update(create${idClassName}(${id})`
        },
        { 
          pattern: /(\w+Service)\.delete\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, service, id) => `${service}.delete(create${idClassName}(${id}))`
        }
      ];
      
      // Replace service operations
      for (const { pattern, replacement } of serviceOperations) {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
          console.log(`  Replaced service operations to use ${idClassName}`);
        }
      }
      
      // Step 4: Update object property access for IDs
      // This can be trickier, so we focus on common patterns
      const propertyReplacements = [
        { 
          pattern: /expect\((\w+)\.id\)\.to\.equal\((['"][\w@\.-]+['"])\)/g, 
          replacement: (match, obj, id) => `expect(${obj}.id.value).to.equal(${id})`
        },
        { 
          pattern: /(\w+)\.id\s*===\s*(['"][\w@\.-]+['"])/g, 
          replacement: (match, obj, id) => `${obj}.id.value === ${id}`
        }
      ];
      
      // Replace property access
      for (const { pattern, replacement } of propertyReplacements) {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
          console.log(`  Updated property access for IDs to use value object methods`);
        }
      }
    }
    
    // Save the file if modified
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      filesModified++;
      console.log(`✅ Updated ${file} to use ${idClassName} value objects`);
    } else {
      console.log(`ℹ️ No changes needed for ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
}

console.log(`\n✅ Done! Modified ${filesModified} of ${testFiles.length} files.`);
console.log(`\nNext steps:`);
console.log(`1. Review the changes to ensure they maintain the test functionality`);
console.log(`2. Run the tests to make sure they still pass`);
console.log(`3. Process other domains by running the script with a domain parameter:`);
console.log(`   node scripts/fix-vo-usage.js challenge`);
console.log(`   node scripts/fix-vo-usage.js focusArea`);
console.log(`   node scripts/fix-vo-usage.js evaluation`);
console.log(`   node scripts/fix-vo-usage.js personality`); 