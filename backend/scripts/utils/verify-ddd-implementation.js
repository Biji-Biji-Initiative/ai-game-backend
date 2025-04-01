#!/usr/bin/env node
'use strict';

/**
 * DDD Implementation Verification Script
 * 
 * This script analyzes the codebase to verify adherence to Domain-Driven Design patterns.
 * It checks for proper layer separation, naming conventions, and structure.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');

// Configuration
const SRC_DIR = path.resolve(__dirname, '../../src');
const CORE_DIR = path.join(SRC_DIR, 'core');
const APPLICATION_DIR = path.join(SRC_DIR, 'application');

// DDD expected patterns
const PATTERNS = {
  DOMAIN_MODELS: ['**/**/models/*.js'],
  REPOSITORIES: ['**/**/repositories/*.js'],
  SERVICES: ['**/**/services/*.js'],
  VALUE_OBJECTS: ['**/**/valueObjects/*.js'],
  FACTORIES: ['**/**/factories/*.js'],
  MAPPERS: ['**/**/mappers/*.js'],
  EVENTS: ['**/**/events/*.js'],
  ERRORS: ['**/**/errors/*.js'],
};

// Expected domain structure 
const EXPECTED_DOMAIN_FOLDERS = [
  'models',
  'repositories',
  'services',
  'valueObjects',
  'errors',
  'events',
];

/**
 * Main verification function
 */
async function verifyDDDImplementation() {
  console.log(chalk.blue.bold('=== DDD Implementation Verification ===\n'));
  
  // Verify core domains
  const domains = await getDomains();
  console.log(chalk.cyan(`Found ${domains.length} domains: ${domains.join(', ')}\n`));
  
  await verifyDomainStructure(domains);
  await verifyLayerSeparation();
  await verifyNamingConventions();
  
  console.log(chalk.blue.bold('\n=== Verification Complete ==='));
}

/**
 * Get all domains from the core directory
 */
async function getDomains() {
  const items = await fs.promises.readdir(CORE_DIR, { withFileTypes: true });
  return items
    .filter(item => item.isDirectory())
    .filter(item => !item.name.startsWith('.'))
    .filter(item => item.name !== 'common' && item.name !== 'infra')
    .map(item => item.name);
}

/**
 * Verify the structure of each domain
 */
async function verifyDomainStructure(domains) {
  console.log(chalk.cyan('Verifying domain structure...'));
  
  for (const domain of domains) {
    const domainPath = path.join(CORE_DIR, domain);
    console.log(chalk.yellow(`\nDomain: ${domain}`));
    
    // Check for expected folders
    for (const folder of EXPECTED_DOMAIN_FOLDERS) {
      const folderPath = path.join(domainPath, folder);
      const exists = fs.existsSync(folderPath);
      
      if (exists) {
        console.log(chalk.green(`  ✓ ${folder}`));
      } else {
        console.log(chalk.red(`  ✗ ${folder} (missing)`));
      }
    }
    
    // Check for unexpected folders
    const items = await fs.promises.readdir(domainPath, { withFileTypes: true });
    const unexpectedFolders = items
      .filter(item => item.isDirectory())
      .filter(item => !EXPECTED_DOMAIN_FOLDERS.includes(item.name))
      .map(item => item.name);
    
    if (unexpectedFolders.length > 0) {
      console.log(chalk.yellow(`  ! Unexpected folders: ${unexpectedFolders.join(', ')}`));
    }
  }
}

/**
 * Verify separation between layers
 */
async function verifyLayerSeparation() {
  console.log(chalk.cyan('\nVerifying layer separation...'));
  
  // Check application layer for domain imports
  const applicationFiles = await glob(`${APPLICATION_DIR}/**/*.js`);
  const domainImports = [];
  
  for (const file of applicationFiles) {
    const content = await fs.promises.readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Look for imports from domain layer
      if (line.includes('require(\'../core/') || 
          line.includes('from \'../core/') ||
          line.includes('require(\'../../core/') ||
          line.includes('from \'../../core/')) {
        
        // Skip infrastructure imports
        if (line.includes('/core/infra/') || line.includes('/core/common/')) {
          continue;
        }
        
        // Check if importing repositories or models directly
        if (line.includes('/repositories/') || line.includes('/models/')) {
          domainImports.push({
            file: path.relative(SRC_DIR, file),
            import: line.trim()
          });
        }
      }
    }
  }
  
  if (domainImports.length > 0) {
    console.log(chalk.red(`  ✗ Found ${domainImports.length} potentially problematic domain imports in application layer:`));
    domainImports.forEach(({ file, import: importLine }) => {
      console.log(chalk.red(`    - ${file}: ${importLine}`));
    });
  } else {
    console.log(chalk.green('  ✓ No problematic domain imports found in application layer'));
  }
}

/**
 * Verify naming conventions
 */
async function verifyNamingConventions() {
  console.log(chalk.cyan('\nVerifying naming conventions...'));
  
  const checks = [
    { pattern: PATTERNS.DOMAIN_MODELS, suffix: '.js', namePattern: /^[A-Z][a-zA-Z]*\.js$/, description: 'Domain models should be PascalCase' },
    { pattern: PATTERNS.REPOSITORIES, suffix: 'Repository.js', namePattern: /^[A-Z][a-zA-Z]*Repository\.js$/, description: 'Repositories should be PascalCase and end with Repository' },
    { pattern: PATTERNS.SERVICES, suffix: 'Service.js', namePattern: /^[A-Z][a-zA-Z]*Service\.js$/, description: 'Services should be PascalCase and end with Service' },
    { pattern: PATTERNS.VALUE_OBJECTS, suffix: 'VO.js', namePattern: /^[a-z][a-zA-Z]*VO\.js$/, description: 'Value Objects should be camelCase and end with VO' },
    { pattern: PATTERNS.FACTORIES, suffix: 'Factory.js', namePattern: /^[A-Z][a-zA-Z]*Factory\.js$/, description: 'Factories should be PascalCase and end with Factory' },
    { pattern: PATTERNS.MAPPERS, suffix: 'Mapper.js', namePattern: /^[A-Z][a-zA-Z]*Mapper\.js$/, description: 'Mappers should be PascalCase and end with Mapper' },
  ];
  
  for (const check of checks) {
    const files = await glob(check.pattern.map(p => path.join(CORE_DIR, p)));
    const violations = [];
    
    for (const file of files) {
      const filename = path.basename(file);
      
      if (!filename.endsWith(check.suffix) || !check.namePattern.test(filename)) {
        violations.push({
          file: path.relative(SRC_DIR, file),
          filename
        });
      }
    }
    
    if (violations.length > 0) {
      console.log(chalk.red(`  ✗ Found ${violations.length} naming convention violations for ${check.description}:`));
      violations.slice(0, 5).forEach(({ file, filename }) => {
        console.log(chalk.red(`    - ${file}`));
      });
      
      if (violations.length > 5) {
        console.log(chalk.red(`    ... and ${violations.length - 5} more`));
      }
    } else {
      console.log(chalk.green(`  ✓ All files follow naming convention: ${check.description}`));
    }
  }
}

// Run the verification
verifyDDDImplementation().catch(err => {
  console.error(chalk.red('Error running DDD verification:'), err);
  process.exit(1);
}); 