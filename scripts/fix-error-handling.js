/**
 * Fix Error Handling in Tests
 * 
 * This script fixes error handling in test files by replacing generic Error
 * with domain-specific errors. It also updates catch blocks to catch specific
 * error types and updates expect().to.throw() assertions.
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

// Domain-specific error classes indexed by domain
const domainErrors = {
  user: ['UserError', 'UserNotFoundError', 'UserUpdateError', 'UserValidationError', 'UserInvalidStateError', 'UserAuthenticationError', 'UserAuthorizationError'],
  challenge: ['ChallengeError', 'ChallengeNotFoundError', 'ChallengeValidationError', 'ChallengeProcessingError', 'ChallengeRepositoryError', 'ChallengeGenerationError'],
  personality: ['PersonalityError', 'PersonalityNotFoundError', 'PersonalityValidationError', 'PersonalityProcessingError', 'PersonalityRepositoryError'],
  focusArea: ['FocusAreaError', 'FocusAreaNotFoundError', 'FocusAreaValidationError', 'FocusAreaGenerationError', 'FocusAreaPersistenceError', 'FocusAreaAccessDeniedError'],
  evaluation: ['EvaluationError', 'EvaluationNotFoundError', 'EvaluationValidationError', 'EvaluationProcessingError', 'EvaluationRepositoryError'],
  infra: ['AppError', 'InfrastructureError', 'CacheError', 'CacheKeyNotFoundError', 'CacheInitializationError', 'CacheOperationError', 'MissingParameterError', 'ApiIntegrationError'],
  adaptive: ['AdaptiveError', 'AdaptiveNotFoundError', 'AdaptiveValidationError', 'AdaptiveProcessingError', 'AdaptiveRepositoryError'],
  ai: ['AIError', 'AINotFoundError', 'AIValidationError', 'AIProcessingError', 'AIRepositoryError', 'AIIntegrationError']
};

// Import paths for errors
const errorImportPaths = {
  user: '../../../src/core/user/errors/UserErrors.js',
  challenge: '../../../src/core/challenge/errors/ChallengeErrors.js',
  personality: '../../../src/core/personality/errors/PersonalityErrors.js',
  focusArea: '../../../src/core/focusArea/errors/focusAreaErrors.js',
  evaluation: '../../../src/core/evaluation/errors/evaluationErrors.js',
  infra: '../../../src/core/infra/errors/AppError.js',
  adaptive: '../../../src/core/adaptive/errors/adaptiveErrors.js',
  ai: '../../../src/core/ai/errors/AIErrors.js'
};

// Process command line arguments
const domains = process.argv[2] === 'all' ? 
  Object.keys(domainErrors) : 
  (process.argv[2] ? [process.argv[2]] : ['challenge']);

console.log(`🔍 Finding test files for domains: ${domains.join(', ')}...`);

// Find test files for specified domains
const testFiles = domains.flatMap(domain => {
  const files = globSync(`tests/**/${domain}/**/*.test.js`, { cwd: projectRoot });
  console.log(`Found ${files.length} tests for ${domain} domain`);
  return files;
});

// Track files modified
let filesModified = 0;

// Process each file
for (const file of testFiles) {
  const filePath = resolve(projectRoot, file);
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Determine which domain the test file is most likely related to
  let primaryDomain = null;
  for (const domain of Object.keys(domainErrors)) {
    if (file.includes(`/${domain}/`) || file.includes(`${domain}.`)) {
      primaryDomain = domain;
      break;
    }
  }
  
  // Skip file if we can't determine the domain
  if (!primaryDomain) {
    console.log(`⚠️ Skipping ${file} - could not determine domain`);
    continue;
  }
  
  console.log(`\nProcessing ${file} (Primary domain: ${primaryDomain})`);
  
  // Step 1: Check if we need to import domain-specific errors
  const hasErrors = domainErrors[primaryDomain].some(errorClass => content.includes(errorClass));
  const hasErrorImport = content.includes(`import {`) && 
                          content.includes(`} from "${errorImportPaths[primaryDomain]}"`);
  
  if (!hasErrorImport && primaryDomain in errorImportPaths) {
    console.log(`  Adding import for ${primaryDomain} domain errors`);
    
    // Add import statement for domain-specific errors
    const importStatement = `import { ${domainErrors[primaryDomain].join(', ')} } from "${errorImportPaths[primaryDomain]}";\n`;
    
    // Find where to add the import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const lastImportEnd = content.indexOf('\n', lastImportIndex) + 1;
      content = content.substring(0, lastImportEnd) + importStatement + content.substring(lastImportEnd);
      modified = true;
    }
  }
  
  // Step 2: Fix error throws - replace "throw new Error(...)" with domain-specific errors
  let updatedContent = content.replace(
    /throw new Error\(\s*[`'"](.*?)[`'"]\s*\)/g,
    (match, errorMessage) => {
      let errorType = `${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}Error`;
      
      // Try to determine more specific error type based on message content
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        errorType = `${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}NotFoundError`;
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('missing')) {
        errorType = `${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}ValidationError`;
      } else if (errorMessage.includes('repository') || errorMessage.includes('database') || errorMessage.includes('save') || errorMessage.includes('update') || errorMessage.includes('delete')) {
        errorType = `${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}RepositoryError`;
      } else if (errorMessage.includes('process') || errorMessage.includes('operation') || errorMessage.includes('failed')) {
        errorType = `${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}ProcessingError`;
      }
      
      // Make sure the error type exists in the domain
      if (!domainErrors[primaryDomain].includes(errorType)) {
        errorType = domainErrors[primaryDomain][0]; // Use the base error type
      }
      
      console.log(`  Replacing generic Error with ${errorType}: ${errorMessage}`);
      return `throw new ${errorType}(\`${errorMessage}\`)`;
    }
  );
  
  if (updatedContent !== content) {
    content = updatedContent;
    modified = true;
  }
  
  // Step 3: Fix expect().to.throw() assertions
  updatedContent = content.replace(
    /expect\((.*?)\)\.to\.throw\((Error|'Error'|"Error")\)/g,
    (match, expectArgument, errorType) => {
      const baseErrorType = `${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}Error`;
      console.log(`  Replacing expect().to.throw(Error) with expect().to.throw(${baseErrorType})`);
      return `expect(${expectArgument}).to.throw(${baseErrorType})`;
    }
  );
  
  if (updatedContent !== content) {
    content = updatedContent;
    modified = true;
  }
  
  // Step 4: Update catch blocks to use specific error types
  updatedContent = content.replace(
    /catch\s*\(\s*(?:err|error|e)\s*\)\s*{/g,
    (match) => {
      const baseErrorType = `${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}Error`;
      console.log(`  Replacing generic catch with catch(${baseErrorType})`);
      return `catch (${baseErrorType}) {`;
    }
  );
  
  if (updatedContent !== content) {
    content = updatedContent;
    modified = true;
  }
  
  // Step 5: Fix StandardErrorCodes references
  updatedContent = content.replace(
    /StandardErrorCodes\.(User|Challenge|Personality|FocusArea|Evaluation|Infra|Adaptive)/g,
    (match, domain) => {
      console.log(`  Replacing StandardErrorCodes.${domain} with DomainErrorCodes.${domain}`);
      return `DomainErrorCodes.${domain}`;
    }
  );
  
  if (updatedContent !== content) {
    // Check if we need to add DomainErrorCodes import
    if (!content.includes('import { DomainErrorCodes }')) {
      const domainErrorCodesImport = 'import { DomainErrorCodes } from "../../../src/core/infra/errors/DomainErrorCodes.js";\n';
      const lastImportIndex = updatedContent.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const lastImportEnd = updatedContent.indexOf('\n', lastImportIndex) + 1;
        updatedContent = updatedContent.substring(0, lastImportEnd) + domainErrorCodesImport + updatedContent.substring(lastImportEnd);
      }
    }
    
    // If we have both StandardErrorCodes and DomainErrorCodes, remove StandardErrorCodes
    if (updatedContent.includes('import { StandardErrorCodes }') && updatedContent.includes('import { DomainErrorCodes }')) {
      updatedContent = updatedContent.replace(/import\s*{\s*StandardErrorCodes\s*}\s*from\s*["'].*?["'];?\n/, '');
    }
    
    content = updatedContent;
    modified = true;
  }
  
  // Save the updated file if modified
  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    console.log(`✅ Updated ${file} with domain-specific errors`);
  } else {
    console.log(`ℹ️ No changes needed in ${file}`);
  }
}

console.log(`\n✅ Done! Modified ${filesModified} of ${testFiles.length} files.`);
console.log(`\nNext steps:`);
console.log(`1. Review the changes to ensure they make sense in each context`);
console.log(`2. Run the tests to make sure they pass or fail as expected`);
console.log(`3. Fix any remaining files manually as needed`);
console.log(`\nUsage:`);
console.log(`- Run for a specific domain: node scripts/fix-error-handling.js user`);
console.log(`- Run for all domains: node scripts/fix-error-handling.js all`); 