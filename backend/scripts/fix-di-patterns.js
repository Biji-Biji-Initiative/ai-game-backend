#!/usr/bin/env node
/**
 * Fix Dependency Injection Patterns in Tests
 * 
 * This script refactors tests from using proxyquire to using proper constructor dependency injection.
 * It identifies tests using proxyquire or other problematic DI patterns and updates them to use
 * constructor injection instead.
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
const targetFile = args[0]; // Optional target file to process

// Common patterns for dependency injection issues
const diIssuePatterns = {
  proxyquire: {
    import: /import\s+proxyquire\s+from\s+['"]proxyquire['"];?/,
    noCallThru: /(const|let|var)\s+\w+\s*=\s*proxyquire\.noCallThru\(\)(?:\(\))?;?/,
    usage: /const\s+(\w+)\s*=\s*proxyquire(?:NoCallThru)?\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}\s*\);?/g
  },
  directStubbing: {
    pattern: /sinon\.stub\((\w+(?:\.\w+)*),\s*['"](\w+)['"]\)/g
  },
  instantiation: {
    pattern: /const\s+(\w+)\s*=\s*new\s+(\w+)\(\);?/g
  }
};

// Identify class name from file path
const getClassNameFromPath = (path) => {
  const parts = path.split('/');
  const filename = parts[parts.length - 1].replace(/\.(js|ts)$/, '');
  return filename.charAt(0).toUpperCase() + filename.slice(1);
};

// Extract dependency names from proxyquire usage
const extractDependencies = (proxyquireMatch) => {
  const moduleName = proxyquireMatch[1];
  const modulePath = proxyquireMatch[2];
  const dependencies = proxyquireMatch[3];
  
  // Extract dependency names and their mock names
  const depMatches = dependencies.matchAll(/['"]([^'"]+)['"]\s*:\s*(\w+)/g);
  const deps = Array.from(depMatches).map(match => ({
    path: match[1],
    mockName: match[2],
    name: match[1].split('/').pop().replace(/\.js$/, '')
  }));
  
  return { moduleName, modulePath, deps };
};

// Generate the proper DI code
const generateDICode = (content, proxyquireMatches) => {
  let modifiedContent = content;
  
  // For each proxyquire usage
  for (const match of proxyquireMatches) {
    const { moduleName, modulePath, deps } = extractDependencies(match);
    
    // Generate correct import statement
    const correctImportPath = modulePath.replace(/^\.\.\//, '../../../src/');
    const importStatement = `import { ${moduleName} } from "${correctImportPath}.js";`;
    
    // Generate constructor injection
    const constructorArgs = deps.map(dep => `${dep.name}: ${dep.mockName}`).join(',\n      ');
    const constructorCall = `const ${moduleName.charAt(0).toLowerCase() + moduleName.slice(1)} = new ${moduleName}({\n      ${constructorArgs}\n    });`;
    
    // Replace proxyquire usage with constructor injection
    modifiedContent = modifiedContent.replace(match[0], constructorCall);
    
    // Add import if it doesn't exist
    if (!modifiedContent.includes(`import { ${moduleName} }`)) {
      modifiedContent = modifiedContent.replace(
        /import .+ from .+;/,
        `$&\n${importStatement}`
      );
    }
  }
  
  // Remove proxyquire imports
  modifiedContent = modifiedContent.replace(diIssuePatterns.proxyquire.import, '');
  modifiedContent = modifiedContent.replace(diIssuePatterns.proxyquire.noCallThru, '');
  
  // Clean up double empty lines
  modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return modifiedContent;
};

// Fix direct stubbing issues
const fixDirectStubbingIssues = (content) => {
  let modifiedContent = content;
  
  // Find instances of direct stubbing
  const directStubbingMatches = Array.from(content.matchAll(diIssuePatterns.directStubbing.pattern));
  
  for (const match of directStubbingMatches) {
    const objectName = match[1];
    const methodName = match[2];
    
    // Extract the stub setup (e.g., ".returns()")
    const stubSetup = content.substring(match.index + match[0].length).match(/\.[^;]+/)?.[0] || '';
    
    // Generate stub for mock object
    const mockObjectName = `mock${objectName.charAt(0).toUpperCase() + objectName.slice(1)}`;
    const mockMethod = `${mockObjectName}.${methodName} = sinon.stub()${stubSetup};`;
    
    // Replace direct stubbing with mock object method stubbing
    modifiedContent = modifiedContent.replace(match[0] + stubSetup, mockMethod);
  }
  
  return modifiedContent;
};

// Fix empty constructor instantiation issues
const fixEmptyConstructorIssues = (content) => {
  let modifiedContent = content;
  
  // Find instances of empty constructor instantiation
  const emptyConstructorMatches = Array.from(content.matchAll(diIssuePatterns.instantiation.pattern));
  
  for (const match of emptyConstructorMatches) {
    const instanceName = match[1];
    const className = match[2];
    
    // Generate code for constructor with dependencies
    const mockNames = [];
    const lowerClassName = className.charAt(0).toLowerCase() + className.slice(1);
    
    // Look for mock objects that might be dependencies
    const mockPattern = new RegExp(`const\\s+(mock\\w+)\\s*=\\s*\\{`, 'g');
    const mockMatches = Array.from(content.matchAll(mockPattern));
    
    mockMatches.forEach(mockMatch => {
      mockNames.push(mockMatch[1]);
    });
    
    let constructorArgs = '';
    if (mockNames.length > 0) {
      constructorArgs = `{\n      ${mockNames.map(name => {
        const propName = name.replace(/^mock/, '');
        return `${propName.charAt(0).toLowerCase() + propName.slice(1)}: ${name}`;
      }).join(',\n      ')}\n    }`;
    }
    
    // Replace empty constructor instantiation with constructor with dependencies
    const replacement = `const ${instanceName} = new ${className}(${constructorArgs});`;
    modifiedContent = modifiedContent.replace(match[0], replacement);
  }
  
  return modifiedContent;
};

// Process a single file
const processFile = async (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  try {
    const fullPath = resolve(projectRoot, filePath);
    let content = readFileSync(fullPath, 'utf-8');
    let modified = false;
    
    // Check for proxyquire usage
    if (diIssuePatterns.proxyquire.import.test(content)) {
      console.log('  Found proxyquire usage');
      
      // Find proxyquire module loads
      const proxyquireMatches = Array.from(content.matchAll(diIssuePatterns.proxyquire.usage));
      
      if (proxyquireMatches.length > 0) {
        content = generateDICode(content, proxyquireMatches);
        modified = true;
        console.log(`  Refactored ${proxyquireMatches.length} proxyquire usages to constructor DI`);
      }
    }
    
    // Check for direct stubbing
    const directStubbingMatches = Array.from(content.matchAll(diIssuePatterns.directStubbing.pattern));
    if (directStubbingMatches.length > 0) {
      console.log(`  Found ${directStubbingMatches.length} instances of direct dependency stubbing`);
      content = fixDirectStubbingIssues(content);
      modified = true;
      console.log(`  Refactored direct stubbing to use mock objects`);
    }
    
    // Check for empty constructor instantiation
    const emptyConstructorMatches = Array.from(content.matchAll(diIssuePatterns.instantiation.pattern));
    if (emptyConstructorMatches.length > 0) {
      console.log(`  Found ${emptyConstructorMatches.length} instances of empty constructor instantiation`);
      content = fixEmptyConstructorIssues(content);
      modified = true;
      console.log(`  Refactored empty constructors to pass dependencies`);
    }
    
    // Save changes if modified
    if (modified) {
      writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Successfully refactored ${filePath} to use proper DI`);
      return true;
    } else {
      console.log(`ℹ️ No DI issues found in ${filePath} or couldn't automatically fix them`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
};

// Main function
const main = async () => {
  console.log('🔍 Finding tests with dependency injection issues...');
  
  // If a target file is specified, process only that file
  if (targetFile) {
    await processFile(targetFile);
    return;
  }
  
  // Process files identified by find-di-issues.js
  const testFiles = globSync([
    'tests/domain/**/*.test.js',
    'tests/unit/**/*.test.js',
    'tests/integration/**/*.test.js'
  ], { cwd: projectRoot });
  
  console.log(`Found ${testFiles.length} test files to check for DI issues`);
  
  let modifiedCount = 0;
  
  // Process each file
  for (const file of testFiles) {
    const wasModified = await processFile(file);
    if (wasModified) {
      modifiedCount++;
    }
  }
  
  console.log(`\n✅ Done! Modified ${modifiedCount} of ${testFiles.length} files.`);
  console.log(`
Next steps:
1. Review the changes to ensure they maintain the test functionality
2. Run the tests to make sure they still pass
3. Check for any remaining files that couldn't be automatically fixed
`);
};

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 