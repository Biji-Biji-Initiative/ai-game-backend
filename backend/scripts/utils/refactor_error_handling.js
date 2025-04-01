#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the domains to update
const domains = [
  'adaptive', 
  'auth', 
  'challenge', 
  'evaluation', 
  'personality', 
  'progress', 
  'userJourney'
];

// Base path to the src directory
const srcPath = path.join(process.cwd(), 'src');

// Regular expressions for matching import statements
const errorUtilImportRegex = /const\s+\{([^}]+)\}\s+=\s+require\(['"]\.\.\/(errors|\.\.\/errors)\/errorHandlingUtil['"]\);/g;
const centralizedErrorImport = `const {
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling,
  createErrorMapper
} = require('../../../core/infra/errors/centralizedErrorUtils');`;

// Regular expression for matching error handling method applications
const methodBindRegex = /this\.(\w+)\s+=\s+apply(\w+)ErrorHandling\(\s*this\.(\w+)\.bind\(this\)\s*,\s*\{[^}]+\}\s*\);/g;
const newMethodApplyFormat = 'this.$1 = apply$2ErrorHandling(this, \'$3\', \'$DOMAIN_NAME$\', $DOMAIN_NAME$$2ErrorMappings);';

/**
 * Updates imports and error handling applications in a file
 */
function updateFile(filePath, domainName) {
  console.log(`Updating file: ${filePath}`);
  
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it uses errorHandlingUtil
    if (!content.includes('errorHandlingUtil')) {
      return;
    }
    
    // First, extract the error mapper/mappings name from the file
    const domainErrorMapperMatch = content.match(/([\w]+)(Repository|Service|Controller)ErrorMapper/);
    const domainErrorMappingsMatch = content.match(/([\w]+)(Repository|Service|Controller)ErrorMappings/);
    
    // Get domain type (Repository, Service, Controller)
    const isRepository = filePath.includes('Repository');
    const isService = filePath.includes('Service');
    const isController = filePath.includes('Controller');
    const typeClassifier = isRepository ? 'Repository' : (isService ? 'Service' : 'Controller');
    
    // Get domain error class import
    const errorClassImport = `// Import domain-specific error classes
const {
  ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Error,
  ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}NotFoundError,
  ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ValidationError,
  ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ProcessingError,
} = require('../errors/${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Errors');`;
    
    // Replace errorHandlingUtil imports with centralized utilities
    content = content.replace(errorUtilImportRegex, centralizedErrorImport + '\n\n' + errorClassImport);
    
    // Check if the file already has error mapper/mappings defined
    const hasErrorMapper = content.includes(`${domainName}${typeClassifier}ErrorMapper`);
    const hasErrorMappings = content.includes(`${domainName}${typeClassifier}ErrorMappings`);
    
    // Add error mapper/mappings definition if not present
    if (isRepository && !hasErrorMapper) {
      const repoErrorMapper = `
// Create an error mapper for repositories
const ${domainName}RepositoryErrorMapper = createErrorMapper(
  {
    EntityNotFoundError: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}NotFoundError,
    ValidationError: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ValidationError,
    DatabaseError: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Error,
  },
  ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Error
);`;
      
      // Insert after the error class import
      content = content.replace(errorClassImport, errorClassImport + '\n' + repoErrorMapper);
    } else if (isService && !hasErrorMapper) {
      const serviceErrorMapper = `
// Create an error mapper for services
const ${domainName}ServiceErrorMapper = createErrorMapper(
  {
    ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}NotFoundError: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}NotFoundError,
    ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ValidationError: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ValidationError,
    ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ProcessingError: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ProcessingError,
    Error: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Error,
  },
  ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Error
);`;
      
      // Insert after the error class import
      content = content.replace(errorClassImport, errorClassImport + '\n' + serviceErrorMapper);
    } else if (isController && !hasErrorMappings) {
      const controllerErrorMappings = `
// Error mappings for controllers
const ${domainName}ControllerErrorMappings = [
  { errorClass: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}NotFoundError, statusCode: 404 },
  { errorClass: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ValidationError, statusCode: 400 },
  { errorClass: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}ProcessingError, statusCode: 500 },
  { errorClass: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Error, statusCode: 500 },
];`;
      
      // Insert after the error class import
      content = content.replace(errorClassImport, errorClassImport + '\n' + controllerErrorMappings);
    }
    
    // Replace error handling method applications
    content = content.replace(methodBindRegex, (match, methodName, handlerType, boundMethodName) => {
      return `this.${methodName} = apply${handlerType}ErrorHandling(this, '${boundMethodName}', '${domainName}', ${domainName}${handlerType}${handlerType === 'Controller' ? 'ErrorMappings' : 'ErrorMapper'});`;
    });
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

/**
 * Process all files in a domain
 */
function processDomain(domain) {
  console.log(`Processing domain: ${domain}`);
  
  const domainPath = path.join(srcPath, 'core', domain);
  
  // Find all repository, service, and controller files
  const repositories = findFiles(path.join(domainPath, 'repositories'), 'Repository.js');
  const services = findFiles(path.join(domainPath, 'services'), 'Service.js');
  const controllers = findFiles(path.join(domainPath, 'controllers'), 'Controller.js');
  
  // Update files
  [...repositories, ...services, ...controllers].forEach(file => {
    if (!file.endsWith('.original') && !file.endsWith('.bak')) {
      updateFile(file, domain);
    }
  });
  
  // Backup the domain-specific error handling utility file
  const errorUtilPath = path.join(domainPath, 'errors', 'errorHandlingUtil.js');
  if (fs.existsSync(errorUtilPath)) {
    fs.copyFileSync(errorUtilPath, `${errorUtilPath}.bak`);
    console.log(`Backed up ${errorUtilPath} to ${errorUtilPath}.bak`);
  }
}

/**
 * Find files in a directory recursively
 */
function findFiles(dir, pattern) {
  let results = [];
  
  try {
    if (!fs.existsSync(dir)) {
      return results;
    }
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        results = results.concat(findFiles(filePath, pattern));
      } else if (file.includes(pattern)) {
        results.push(filePath);
      }
    });
  } catch (error) {
    console.error(`Error finding files in ${dir}:`, error);
  }
  
  return results;
}

// Main execution
console.log('Starting error handling refactoring...');

// Process each domain
domains.forEach(processDomain);

console.log('Error handling refactoring complete!');
console.log('Next steps:');
console.log('1. Verify the changes are correct');
console.log('2. Run the tests to ensure everything works');
console.log('3. Delete the errorHandlingUtil.js files using the delete_error_utils.sh script'); 