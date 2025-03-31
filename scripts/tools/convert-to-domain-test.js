/**
 * Domain Test Conversion Script
 * 
 * This script converts tests to follow proper domain test semantics by:
 * 1. Replacing real repositories with in-memory mocks
 * 2. Replacing real HTTP/API calls with mocks
 * 3. Adding Sinon for mocking and stubbing
 * 4. Ensuring Value Objects are used correctly
 * 5. Adding proper dependency injection
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Example: convert an integration test to a domain test
async function convertToDomainTest() {
  try {
    console.log('Starting domain test conversion...');
    
    // Define source and destination paths
    // Example: moving an integration test to domain
    const sourcePath = path.join(rootDir, 'tests', 'integration', 'challenge', 'challenge.model.test.js');
    const destDir = path.join(rootDir, 'tests', 'domain', 'challenge');
    const destPath = path.join(destDir, 'challenge.model.test.js');
    
    // Create directory if it doesn't exist
    try {
      await fs.mkdir(destDir, { recursive: true });
    } catch (err) {
      // Directory exists, ignore
    }
    
    // Read the file content
    let content = await fs.readFile(sourcePath, 'utf8');
    
    // Create a backup of the original file
    const backupPath = `${sourcePath}.bak`;
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`Created backup at ${backupPath}`);
    
    // Transformations to apply:
    
    // 1. Add proper domain test documentation
    content = `/**
 * Domain: Challenge Model Tests
 * 
 * This test suite validates the Challenge domain model:
 * 1. Challenge creation with proper validation rules
 * 2. Value Object handling for IDs and properties
 * 3. Domain model validation for required fields
 * 4. Challenge state transitions and business rules
 * 
 * These tests are isolated from external dependencies and use
 * in-memory repositories to focus purely on domain logic.
 */

${content.replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/m, '')}`;

    // 2. Add Sinon for mocking if not present
    if (!content.includes('import sinon')) {
      content = content.replace(
        /import \{([^}]*)\} from "chai";/,
        'import { $1 } from "chai";\nimport sinon from "sinon";'
      );
    }
    
    // 3. Replace createClient with mock repositories
    if (content.includes('createClient')) {
      // Add mock repository setup
      content = content.replace(
        /import \{ createClient \} from "@supabase\/supabase-js";/,
        '// No direct database dependencies in domain tests'
      );
      
      // Replace Supabase client initialization
      content = content.replace(
        /const supabaseClient = createClient\([^)]+\);/,
        '// Using in-memory repository instead of real Supabase\n' +
        '    const challengeData = new Map();\n'
      );
      
      // Add sandbox for mocks
      content = content.replace(
        /describe.*?\{/,
        '$&\n' +
        '  let sandbox;\n' +
        '  \n' +
        '  beforeEach(function() {\n' +
        '    sandbox = sinon.createSandbox();\n' +
        '  });\n' +
        '  \n' +
        '  afterEach(function() {\n' +
        '    sandbox.restore();\n' +
        '  });\n'
      );
      
      // Replace real repository with in-memory mock
      content = content.replace(
        /const challengeRepository = \{[\s\S]*?\};/m,
        `const challengeRepository = {
      save: async (challenge) => {
        challengeData.set(challenge.id instanceof ChallengeId ? challenge.id.value : challenge.id, challenge);
        return challenge;
      },
      findById: async (id) => {
        const idValue = id instanceof ChallengeId ? id.value : id;
        return challengeData.get(idValue) || null;
      },
      findByUserId: async (userId) => {
        const userIdValue = userId instanceof UserId ? userId.value : userId;
        return Array.from(challengeData.values())
          .filter(challenge => {
            const challengeUserId = challenge.userId instanceof UserId ? 
              challenge.userId.value : challenge.userId;
            return challengeUserId === userIdValue;
          });
      },
      delete: async (id) => {
        const idValue = id instanceof ChallengeId ? id.value : id;
        return challengeData.delete(idValue);
      }
    };`
      );
    }
    
    // 4. Replace real OpenAI client with mock
    if (content.includes('openaiClient') || content.includes('openai.responses')) {
      content = content.replace(
        /import openai from "[^"]+";/,
        '// No direct OpenAI dependency in domain tests'
      );
      
      // Add mock OpenAI client
      content = content.replace(
        /const openaiClient = .*?;/,
        `const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Mock Challenge Title",
              description: "This is a mock challenge description",
              difficulty: "medium",
              evaluation_criteria: ["criteria1", "criteria2"]
            })
          }
        }
      ]
    };
    
    const openaiClient = {
      responses: {
        create: sandbox.stub().resolves(mockOpenAIResponse)
      }
    };`
      );
    }
    
    // 5. Update test description to specify domain context
    content = content.replace(
      /describe\((['"])(.+?)(['"])/g,
      'describe($1Domain: $2$3'
    );
    
    // Write the updated content to the destination path
    await fs.writeFile(destPath, content, 'utf8');
    console.log(`Successfully wrote domain test to ${destPath}`);
    
    // Delete source file if destination is different
    if (sourcePath !== destPath) {
      await fs.unlink(sourcePath);
      console.log(`Deleted original file at ${sourcePath}`);
    }
    
    console.log('Test conversion completed successfully!');
    console.log('-----------------------------------------');
    console.log('Next steps:');
    console.log('1. Review the converted test file to ensure it follows domain test semantics');
    console.log('2. Run the test to verify it functions correctly with mocks');
    console.log('3. Run the verification tool to confirm correct categorization');
    
  } catch (error) {
    console.error('Error during test conversion:', error);
  }
}

// Run the conversion
convertToDomainTest(); 