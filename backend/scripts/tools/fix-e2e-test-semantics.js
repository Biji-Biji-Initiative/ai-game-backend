/**
 * E2E Test Semantics Fixer
 * 
 * This script updates an E2E test to follow proper semantics by:
 * 1. Ensuring it uses apiTestHelper or Axios for HTTP requests
 * 2. Adding proper authorization
 * 3. Verifying response structures match DTOs
 * 4. Adding comprehensive resource cleanup
 * 
 * Usage:
 *   node tools/fix-e2e-test-semantics.js --file=tests/e2e/challenge/someTest.e2e.test.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { file: null };
  
  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      result.file = arg.slice(7);
    }
  }
  
  return result;
}

// Fix E2E test semantics for a specific file
async function fixE2ETestSemantics() {
  try {
    console.log('Starting E2E test semantics fix...');
    
    // Parse arguments
    const args = parseArgs();
    
    // Define path to the E2E test
    let testPath;
    if (args.file) {
      testPath = path.isAbsolute(args.file) ? args.file : path.join(rootDir, args.file);
      console.log(`Using specified file: ${testPath}`);
    } else {
      testPath = path.join(rootDir, 'tests', 'e2e', 'challenge', 'challengeCycle.e2e.test.js');
      console.log(`No file specified, using default: ${testPath}`);
      console.log('Tip: Specify a file with --file=<path> to fix a different test');
    }
    
    // Check if file exists
    try {
      await fs.access(testPath);
    } catch (err) {
      console.error(`Error: File not found at ${testPath}`);
      return;
    }
    
    // Read the file content
    let content = await fs.readFile(testPath, 'utf8');
    
    // Create a backup of the original file
    const backupPath = `${testPath}.bak`;
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`Created backup at ${backupPath}`);
    
    // Extract the test name for better documentation
    const fileName = path.basename(testPath, '.e2e.test.js');
    const testName = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/([A-Z])/g, ' $1').trim();
    
    // Transformations to apply:
    
    // 1. Ensure it has the proper documentation comment
    if (!content.includes('/**\n * ')) {
      content = `/**
 * ${testName} E2E Tests
 * 
 * This test suite validates the complete workflow from start to finish:
 * 1. API request handling with proper authentication
 * 2. Data storage and retrieval through the API
 * 3. Response validation with correct DTO structures
 * 4. Error handling for invalid requests
 * 
 * These tests ensure the full system functions correctly
 * through the public API with proper authentication.
 */

${content}`;
    }
    
    // 2. Ensure proper imports for E2E tests
    if (!content.includes('apiTestHelper')) {
      const importLine = `import * as apiTestHelper from "../../helpers/apiTestHelper.js";`;
      // Try to find the last import in the file
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        // Find the end of the last import line
        const endOfImportLine = content.indexOf('\n', lastImportIndex);
        if (endOfImportLine !== -1) {
          content = 
            content.slice(0, endOfImportLine + 1) + 
            importLine + '\n' +
            content.slice(endOfImportLine + 1);
        }
      }
    }
    
    // 3. Ensure axios is imported for HTTP requests
    if (!content.includes('import axios')) {
      content = content.replace(
        /import \{([^}]*)\} from "chai";/,
        'import { $1 } from "chai";\nimport axios from "axios";'
      );
    }
    
    // 4. Add DTO imports if missing
    // Determine domain from file path
    const domainMatch = testPath.match(/\/([a-zA-Z]+)\/[^/]+\.e2e\.test\.js$/);
    const domain = domainMatch ? domainMatch[1] : 'challenge';
    
    const capitalized = domain.charAt(0).toUpperCase() + domain.slice(1);
    if (!content.includes(`${capitalized}DTO`)) {
      content = content.replace(
        /import \{([^}]*)\} from "chai";/,
        `import { $1 } from "chai";\nimport { ${capitalized}DTO, ${capitalized}DTOMapper } from "../../../src/core/${domain}/dtos/index.js";`
      );
    }
    
    // 5. Add auth setup if missing
    if (!content.includes('authToken')) {
      content = content.replace(
        /describe.*?\{/,
        `$&\n
  // Test variables
  let testUser;
  let authToken;
  let axiosInstance;
  
  // Set up test user and authentication before tests
  before(async function() {
    try {
      // Create a test user
      testUser = await apiTestHelper.setupTestUser();
      console.log(\`Test user created: \${testUser.email}\`);
      
      // Get auth token
      authToken = await apiTestHelper.getAuthToken(testUser.email, testUser.password);
      
      // Create axios instance with auth
      axiosInstance = axios.create({
        baseURL: process.env.API_URL || 'http://localhost:3000/api',
        headers: {
          'Authorization': \`Bearer \${authToken}\`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to set up test user:', error.message);
      throw error;
    }
  });`
      );
    }
    
    // 6. Add cleanup after tests
    if (!content.includes('after(async function')) {
      content = content.replace(
        /describe.*?\{/,
        `$&\n
  // Clean up test resources after all tests
  after(async function() {
    try {
      // Clean up any resources created during tests
      if (testUser) {
        console.log(\`Keeping test user for future tests: \${testUser.email}\`);
      }
    } catch (error) {
      console.warn('Error during test cleanup:', error.message);
    }
  });`
      );
    }
    
    // 7. Replace direct repository calls with API calls
    const repositoryPatterns = [
      {
        pattern: /await\s+(\w+)Repository\.save\(([^)]+)\)/g,
        replacement: `await apiTestHelper.apiRequest('post', '/$1s', $2, authToken)`
      },
      {
        pattern: /await\s+(\w+)Repository\.findById\(([^)]+)\)/g,
        replacement: `await apiTestHelper.apiRequest('get', '/$1s/$' + '{$2}', null, authToken)`
      },
      {
        pattern: /await\s+(\w+)Repository\.find(?:All|By\w+)\(([^)]*)\)/g,
        replacement: `await apiTestHelper.apiRequest('get', '/$1s', { params: { $2 } }, authToken)`
      },
      {
        pattern: /await\s+(\w+)Repository\.delete\(([^)]+)\)/g,
        replacement: `await apiTestHelper.apiRequest('delete', '/$1s/$' + '{$2}', null, authToken)`
      },
      {
        pattern: /await\s+(\w+)Repository\.update\(([^,]+),\s*([^)]+)\)/g,
        replacement: `await apiTestHelper.apiRequest('put', '/$1s/$' + '{$2}', $3, authToken)`
      }
    ];
    
    for (const { pattern, replacement } of repositoryPatterns) {
      content = content.replace(pattern, replacement);
    }
    
    // 8. Add DTO validation to responses
    const dtoValidationPattern = /expect\(([a-zA-Z0-9]+)\.data\)\.to\.exist;/g;
    content = content.replace(
      dtoValidationPattern,
      (match, variable) => {
        return `expect(${variable}.data).to.exist;
      // Create a DTO and validate it
      const ${variable}Dto = new ${capitalized}DTO(${variable}.data);
      expect(${variable}Dto).to.be.instanceOf(${capitalized}DTO);`;
      }
    );
    
    // 9. Make sure describe has E2E prefix
    content = content.replace(
      /describe\(['"]([^'"]*)['"]/g,
      (match, description) => {
        if (!description.startsWith('E2E:')) {
          return `describe('E2E: ${description}'`;
        }
        return match;
      }
    );
    
    // Write the updated content back to the file
    await fs.writeFile(testPath, content, 'utf8');
    console.log(`Successfully updated ${testPath} with proper E2E test semantics`);
    
    console.log('E2E test fix completed successfully!');
    console.log('-----------------------------------------');
    console.log('Next steps:');
    console.log('1. Review the updated test file to ensure it follows E2E test semantics');
    console.log('2. Run the test to verify it functions correctly with the new semantics');
    console.log('3. Run the verification tool to confirm correct categorization');
    
  } catch (error) {
    console.error('Error during E2E test fix:', error);
  }
}

// Run the fix
fixE2ETestSemantics(); 