#!/usr/bin/env node

/**
 * Test Directory Setup Script
 * 
 * Creates the standardized test directory structure for our project
 * based on domain-driven design principles.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Root directory
const rootDir = path.resolve(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

// Define the directory structure
const dirs = [
  // Domain tests
  'tests/domains/challenge',
  'tests/domains/focusArea',
  'tests/domains/evaluation',
  'tests/domains/prompt',
  
  // Integration tests
  'tests/integration',
  
  // External integration tests
  'tests/external/openai',
  'tests/external/supabase',
  
  // End-to-end tests
  'tests/e2e',
  
  // Shared utilities
  'tests/shared/utils',
  'tests/shared/common',
  
  // Real API tests
  'tests/real-api/challenge',
  'tests/real-api/focusArea',
  'tests/real-api/evaluation',
  'tests/real-api/openai',
  'tests/real-api/integration',
  
  // Logs directory
  'tests/logs'
];

// Create the directories
for (const dir of dirs) {
  const fullPath = path.join(rootDir, dir);
  
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
  
  // Create a README.md in each directory to explain its purpose
  const readmePath = path.join(fullPath, 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    let content = '';
    
    // Customize the README content based on the directory
    if (dir.includes('domains')) {
      const domain = dir.split('/').pop();
      content = `# ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Tests\n\nTests for the ${domain} domain logic, including models, repositories, and services.\n\n## Test Files\n\n- \`${domain.charAt(0).toUpperCase() + domain.slice(1)}.test.js\` - Tests for the ${domain} model\n- \`${domain}Repository.test.js\` - Tests for the ${domain} repository\n- \`${domain}Service.test.js\` - Tests for the ${domain} services\n`;
    } else if (dir.includes('integration')) {
      content = `# Integration Tests\n\nTests that validate how different domains work together.\n\n## Focus Areas\n\n- Cross-domain event handling\n- Workflow validation\n- Domain interaction\n`;
    } else if (dir.includes('external')) {
      const externalSystem = dir.split('/').pop();
      content = `# ${externalSystem.charAt(0).toUpperCase() + externalSystem.slice(1)} Integration Tests\n\nTests for integration with ${externalSystem}.\n\n## Test Approach\n\n- Test the adapter/client for ${externalSystem}\n- Test error handling and retries\n- Use real API for key scenarios, mocks for edge cases\n`;
    } else if (dir.includes('e2e')) {
      content = `# End-to-End Tests\n\nTests that validate complete workflows from API to data storage.\n\n## Key Workflows\n\n- Challenge generation and completion\n- Focus area recommendation\n- User progression\n`;
    } else if (dir.includes('real-api')) {
      const apiArea = dir.split('/').pop();
      content = `# Real API Tests - ${apiArea.charAt(0).toUpperCase() + apiArea.slice(1)}\n\nTests that use real external APIs for ${apiArea} functionality.\n\n## Requirements\n\n- Valid API keys in the .env file\n- Internet connection\n- May incur API usage costs\n`;
    } else if (dir.includes('shared')) {
      const sharedArea = dir.split('/').pop();
      content = `# Shared ${sharedArea.charAt(0).toUpperCase() + sharedArea.slice(1)} Tests\n\nTests for shared ${sharedArea} used across multiple domains.\n`;
    } else if (dir.includes('logs')) {
      content = `# Test Logs\n\nThis directory contains logs generated during test runs.\n\n## Log Files\n\n- \`test-run-[timestamp].log\` - Logs from specific test runs\n- \`api-responses-[timestamp].json\` - API responses from real API tests\n`;
    }
    
    if (content) {
      fs.writeFileSync(readmePath, content);
      console.log(`Created README: ${readmePath}`);
    }
  }
}

// Create a test helpers directory and factory file
const helpersDir = path.join(testsDir, 'helpers');
if (!fs.existsSync(helpersDir)) {
  fs.mkdirSync(helpersDir, { recursive: true });
  console.log(`Created directory: tests/helpers`);
  
  // Create a factory file for generating test data
  const factoryPath = path.join(helpersDir, 'testFactory.js');
  const factoryContent = `/**
 * Test Factory
 * 
 * Provides factory functions for creating test objects
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Creates a test user with optional overrides
 */
function createTestUser(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test User',
    email: \`test-\${Date.now()}@example.com\`,
    professionalTitle: 'Software Engineer',
    location: 'San Francisco, CA',
    personality_traits: ['curious', 'analytical'],
    ai_attitudes: ['optimistic', 'pragmatic'],
    ...overrides
  };
}

/**
 * Creates a test challenge with optional overrides
 */
function createTestChallenge(overrides = {}) {
  return {
    id: uuidv4(),
    title: 'Test Challenge',
    content: 'This is a test challenge',
    difficulty: 'medium',
    type: 'scenario',
    focusArea: 'effective-communication',
    userId: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Creates a test focus area with optional overrides
 */
function createTestFocusArea(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Focus Area',
    description: 'This is a test focus area for testing',
    userId: uuidv4(),
    priority: 1,
    metadata: {},
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Creates a test evaluation with optional overrides
 */
function createTestEvaluation(overrides = {}) {
  return {
    id: uuidv4(),
    challengeId: uuidv4(),
    userId: uuidv4(),
    score: 75,
    feedback: 'This is test feedback',
    strengths: ['clarity', 'structure'],
    weaknesses: ['brevity'],
    createdAt: new Date(),
    ...overrides
  };
}

module.exports = {
  createTestUser,
  createTestChallenge,
  createTestFocusArea,
  createTestEvaluation
};
`;
  
  fs.writeFileSync(factoryPath, factoryContent);
  console.log(`Created factory file: ${factoryPath}`);
  
  // Create a test setup file
  const setupPath = path.join(helpersDir, 'testSetup.js');
  const setupContent = `/**
 * Test Setup
 * 
 * Provides utility functions for setting up and tearing down test environments
 */

const sinon = require('sinon');
const fs = require('fs');
const path = require('path');

// Store created stubs so we can restore them
const stubs = [];

/**
 * Sets up a test environment with either real or stubbed dependencies
 */
function setup(options = {}) {
  const {
    useRealOpenAI = false,
    useRealSupabase = false,
    mockTime = true
  } = options;
  
  // Mock time if requested
  if (mockTime) {
    const now = new Date();
    const clock = sinon.useFakeTimers(now.getTime());
    stubs.push({ type: 'clock', restore: () => clock.restore() });
  }
  
  // Setup logging for test run
  setupTestLogging();
}

/**
 * Sets up logging for the test run
 */
function setupTestLogging() {
  const logDir = path.join(__dirname, '..', 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Create a log file for this test run
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logDir, \`test-run-\${timestamp}.log\`);
  
  // TODO: Set up a test-specific logger if needed
}

/**
 * Tears down the test environment
 */
function teardown() {
  // Restore all stubs
  stubs.forEach(stub => stub.restore());
  stubs.length = 0;
  
  // Clean up any test artifacts or connections
}

/**
 * Logs API responses for debugging
 */
function logApiResponse(name, response) {
  const logDir = path.join(__dirname, '..', 'logs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logDir, \`api-response-\${name}-\${timestamp}.json\`);
  
  try {
    fs.writeFileSync(logFile, JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error logging API response:', error);
  }
}

module.exports = {
  setup,
  teardown,
  logApiResponse
};
`;
  
  fs.writeFileSync(setupPath, setupContent);
  console.log(`Created setup file: ${setupPath}`);
}

// Create an in-memory implementations directory for testing
const inMemoryDir = path.join(testsDir, 'helpers', 'inMemory');
if (!fs.existsSync(inMemoryDir)) {
  fs.mkdirSync(inMemoryDir, { recursive: true });
  console.log(`Created directory: tests/helpers/inMemory`);
  
  // Create an in-memory repository file
  const repoPath = path.join(inMemoryDir, 'inMemoryRepository.js');
  const repoContent = `/**
 * In Memory Repository
 * 
 * Provides an in-memory implementation of repositories for testing
 * without using mocks or stubs.
 */

class InMemoryRepository {
  constructor() {
    this.items = new Map();
  }
  
  async save(entity) {
    if (!entity.id) {
      throw new Error('Entity must have an ID');
    }
    
    this.items.set(entity.id, { ...entity });
    return { ...entity };
  }
  
  async findById(id) {
    const entity = this.items.get(id);
    return entity ? { ...entity } : null;
  }
  
  async findAll() {
    return Array.from(this.items.values()).map(item => ({ ...item }));
  }
  
  async update(id, data) {
    const entity = this.items.get(id);
    if (!entity) return null;
    
    const updated = { ...entity, ...data, updatedAt: new Date() };
    this.items.set(id, updated);
    return { ...updated };
  }
  
  async delete(id) {
    const exists = this.items.has(id);
    this.items.delete(id);
    return exists;
  }
  
  async deleteAll() {
    this.items.clear();
  }
}

/**
 * Creates an in-memory challenge repository
 */
function createInMemoryChallengeRepository() {
  const repo = new InMemoryRepository();
  
  // Add challenge-specific query methods
  repo.findByUserId = async (userId) => {
    return Array.from(repo.items.values())
      .filter(item => item.userId === userId)
      .map(item => ({ ...item }));
  };
  
  repo.findByFocusArea = async (focusArea) => {
    return Array.from(repo.items.values())
      .filter(item => item.focusArea === focusArea)
      .map(item => ({ ...item }));
  };
  
  repo.findByCriteria = async (criteria, sort = {}) => {
    let results = Array.from(repo.items.values());
    
    // Apply filtering
    Object.entries(criteria).forEach(([key, value]) => {
      results = results.filter(item => item[key] === value);
    });
    
    // Apply sorting
    if (sort.sortBy) {
      results.sort((a, b) => {
        const aVal = a[sort.sortBy];
        const bVal = b[sort.sortBy];
        
        if (sort.sortOrder === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        } else {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
      });
    }
    
    return results.map(item => ({ ...item }));
  };
  
  return repo;
}

/**
 * Creates an in-memory focus area repository
 */
function createInMemoryFocusAreaRepository() {
  const repo = new InMemoryRepository();
  
  // Add focus area-specific query methods
  repo.findByUserId = async (userId) => {
    return Array.from(repo.items.values())
      .filter(item => item.userId === userId)
      .map(item => ({ ...item }));
  };
  
  repo.findByPriority = async (priority) => {
    return Array.from(repo.items.values())
      .filter(item => item.priority === priority)
      .map(item => ({ ...item }));
  };
  
  return repo;
}

/**
 * Creates an in-memory evaluation repository
 */
function createInMemoryEvaluationRepository() {
  const repo = new InMemoryRepository();
  
  // Add evaluation-specific query methods
  repo.findByUserId = async (userId) => {
    return Array.from(repo.items.values())
      .filter(item => item.userId === userId)
      .map(item => ({ ...item }));
  };
  
  repo.findByChallengeId = async (challengeId) => {
    return Array.from(repo.items.values())
      .filter(item => item.challengeId === challengeId)
      .map(item => ({ ...item }));
  };
  
  return repo;
}

module.exports = {
  InMemoryRepository,
  createInMemoryChallengeRepository,
  createInMemoryFocusAreaRepository,
  createInMemoryEvaluationRepository
};
`;
  
  fs.writeFileSync(repoPath, repoContent);
  console.log(`Created in-memory repository file: ${repoPath}`);
}

console.log('\nTest directory structure created successfully!');
console.log('Run `npm run test:cleanup` to organize existing test files into this structure.');

// Generate instructions for next steps
console.log('\nNext steps:');
console.log('1. Run `npm run test:cleanup` to move existing tests to the new structure');
console.log('2. Check tests/README.md for testing principles and organization');
console.log('3. Update package.json if needed for additional test scripts');
console.log('4. Create example tests in each domain directory if needed'); 