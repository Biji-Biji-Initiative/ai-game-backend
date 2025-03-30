#!/usr/bin/env node

/**
 * Script to update error imports from StandardErrorCodes to DomainErrorCodes
 * This script updates imports in error-related files to use the new DomainErrorCodes
 * instead of the deprecated StandardErrorCodes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('Finding error files...');

// Find all error-related files
const errorPatterns = [
  'src/core/**/errors/*.js',
  'src/core/infra/errors/*.js',
  'tests/unit/**/*.js'
];

console.log(`Searching for files with patterns: ${errorPatterns.join(', ')}`);
const errorFiles = globSync(errorPatterns);
console.log(`Found ${errorFiles.length} files to check`);

// Patterns to find and replace
const replacements = [
  // Clean up duplicate const definitions
  {
    find: /const\s+(\w+ErrorCodes)\s*=\s*DomainErrorCodes\.[^;]+;\s*const\s+\1\s*=\s*DomainErrorCodes\.[^;]+;/g,
    replace: (match, name) => {
      console.log(`Fixing duplicate ${name} constant`);
      return `const ${name} = DomainErrorCodes.${name.replace('ErrorCodes', '')};`;
    }
  },
  // Update StandardErrorCodes import
  {
    find: /import\s+{\s*StandardErrorCodes\s*}\s+from\s+['"](.+?)\/ErrorHandler\.js['"]/g,
    replace: (match, importPath) => {
      console.log(`Found StandardErrorCodes import in path: ${importPath}`);
      return `import { DomainErrorCodes } from "${importPath}/DomainErrorCodes.js"`;
    }
  },
  // Add domain constant for DomainErrorCodes import if it doesn't exist
  {
    find: /import\s+{\s*DomainErrorCodes\s*}\s+from\s+['"](.*?)\/DomainErrorCodes\.js['"];\s*(?!const\s+\w+ErrorCodes)/g,
    replace: (match, importPath) => {
      // Extract domain name from file path
      const pathParts = importPath.split('/');
      let domain = null;
      
      for (const part of pathParts) {
        if (part === 'user') domain = 'User';
        if (part === 'personality') domain = 'Personality';
        if (part === 'challenge') domain = 'Challenge';
        if (part === 'evaluation') domain = 'Evaluation';
        if (part === 'focus') domain = 'FocusArea';
        if (part === 'auth') domain = 'Auth';
        if (part === 'progress') domain = 'Progress';
        if (part === 'adaptive') domain = 'Adaptive';
        if (part === 'openai') domain = 'OpenAI';
      }
      
      if (domain) {
        console.log(`Adding ${domain}ErrorCodes constant for path: ${importPath}`);
        return `import { DomainErrorCodes } from "${importPath}/DomainErrorCodes.js";\nconst ${domain}ErrorCodes = DomainErrorCodes.${domain}`;
      }
      
      return match;
    }
  },
  // Replace StandardErrorCodes usage with domain-specific error codes
  {
    find: /StandardErrorCodes\.(\w+)/g,
    replace: (match, errorCode) => {
      console.log(`Replacing StandardErrorCodes.${errorCode}`);
      return `DomainErrorCodes.${errorCode}`;
    }
  },
  // Clean up legacy StandardErrorCodes patterns
  {
    find: /export\s+{\s*StandardErrorCodes\s*}/g,
    replace: (match) => {
      console.log(`Removing export of StandardErrorCodes`);
      return `// StandardErrorCodes has been replaced by DomainErrorCodes`;
    }
  },
  // Fix import pattern in test files
  {
    find: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/src\/core\/(\w+)\/errors\/(\w+)Errors\.js['"]/g,
    replace: (match, imports, domain, errorType) => {
      console.log(`Fixing import pattern in test file for domain: ${domain}`);
      return `import ${errorType}Errors from '../../../src/core/${domain}/errors/${errorType}Errors.js'`;
    }
  }
];

// Special fixes for specific files
const specificFileFixes = {
  'tests/unit/personality/personality.controller.test.js': [
    {
      find: /import\s+{\s*[^}]*\s*}\s+from\s+['"][^'"]+\/PersonalityErrors\.js['"]/g,
      replace: "import personalityErrors from '../../../src/core/personality/errors/PersonalityErrors.js'"
    },
    {
      find: /const\s+\{\s*PersonalityNotFoundError\s*,\s*[^}]*\s*\}\s*=\s*[^;]+;/g,
      replace: "const { PersonalityNotFoundError } = personalityErrors;"
    }
  ],
  'tests/unit/user/user.controller.test.js': [
    {
      find: /import\s+{\s*[^}]*\s*}\s+from\s+['"][^'"]+\/UserErrors\.js['"]/g,
      replace: "import userErrors from '../../../src/core/user/errors/UserErrors.js'"
    },
    {
      find: /const\s+\{\s*UserNotFoundError\s*,\s*[^}]*\s*\}\s*=\s*[^;]+;/g,
      replace: "const { UserNotFoundError, FocusAreaError } = userErrors;"
    }
  ]
};

// Process files
let updatedFilesCount = 0;

// Check if a file contains any of the patterns
function fileContainsPatterns(content) {
  return replacements.some(({ find }) => find.test(content));
}

for (const filePath of errorFiles) {
  const absolutePath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.log(`File not found: ${absolutePath}`);
    continue;
  }
  
  try {
    let content = fs.readFileSync(absolutePath, 'utf8');
    
    // Apply specific fixes for known problematic files
    if (specificFileFixes[filePath]) {
      console.log(`Applying specific fixes for: ${filePath}`);
      specificFileFixes[filePath].forEach(({ find, replace }) => {
        content = content.replace(find, replace);
      });
      fs.writeFileSync(absolutePath, content, 'utf8');
      updatedFilesCount++;
      console.log(`Updated file with specific fixes: ${filePath}`);
      continue;
    }
    
    // Skip files that don't contain any of our patterns
    if (!fileContainsPatterns(content)) {
      continue;
    }
    
    console.log(`Found relevant patterns in: ${filePath}`);
    let originalContent = content;
    
    // Apply all replacements
    for (const { find, replace } of replacements) {
      content = content.replace(find, replace);
    }
    
    // Only write file if content changed
    if (content !== originalContent) {
      fs.writeFileSync(absolutePath, content, 'utf8');
      updatedFilesCount++;
      console.log(`Updated file: ${filePath}`);
    } else {
      console.log(`No changes needed for: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
  }
}

console.log(`Update complete. Modified ${updatedFilesCount} files.`); 