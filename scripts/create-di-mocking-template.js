#!/usr/bin/env node

/**
 * Dependency Injection Mocking Template Generator
 * 
 * This script creates templates for proper dependency injection mocking in tests.
 * It helps standardize the approach to mocking dependencies across test files.
 * 
 * Usage: node scripts/create-di-mocking-template.js [domain] [service]
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Get arguments
const domain = process.argv[2] || 'example';
const service = process.argv[3] || 'Service';

/**
 * Generate mocking template for a domain service
 */
async function generateMockingTemplate() {
  // Create directory for the test if it doesn't exist
  const testDir = path.join(__dirname, `../tests/domain/${domain.toLowerCase()}`);
  const servicesDir = path.join(testDir, 'services');
  
  try {
    // Ensure the directories exist
    await mkdir(testDir, { recursive: true });
    await mkdir(servicesDir, { recursive: true });
    
    // Create the template file
    const templatePath = path.join(servicesDir, `${service.toLowerCase()}.test.js`);
    const templateContent = `/**
 * ${domain} ${service} Tests
 * 
 * This file tests the ${domain} ${service} with proper dependency injection mocking.
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Import the service under test
const ${service} = require('../../../src/core/${domain.toLowerCase()}/services/${service}');

describe('${domain} ${service}', () => {
  // Define mocks for all dependencies
  let dependencies;
  let ${service.toLowerCase()};
  
  beforeEach(() => {
    // Create fresh mocks for each test
    dependencies = {
      // Repository mocks
      ${domain.toLowerCase()}Repository: {
        findById: sinon.stub().resolves({ id: '123', name: 'Test' }),
        save: sinon.stub().callsFake(entity => Promise.resolve(entity)),
        findByUserId: sinon.stub().resolves([]),
        delete: sinon.stub().resolves(true)
      },
      
      // Event bus mock
      eventBus: {
        publishEvent: sinon.stub().resolves()
      },
      
      // Logger mock
      logger: {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub()
      },
      
      // OpenAI client mock (if needed)
      openAIClient: {
        sendMessage: sinon.stub().resolves({ content: 'Mock AI response' }),
        streamMessage: sinon.stub().resolves({
          on: sinon.stub().returns({ on: sinon.stub() })
        })
      }
    };
    
    // Create the service with mocked dependencies
    ${service.toLowerCase()} = new ${service}(dependencies);
  });
  
  afterEach(() => {
    // Clean up stubs
    sinon.restore();
  });
  
  describe('someMethod', () => {
    it('should perform the expected action', async () => {
      // Arrange
      const testData = { id: '123' };
      dependencies.${domain.toLowerCase()}Repository.findById.resolves({ 
        id: '123', 
        name: 'Test Entity' 
      });
      
      // Act
      const result = await ${service.toLowerCase()}.someMethod(testData);
      
      // Assert
      expect(result).to.exist;
      expect(dependencies.${domain.toLowerCase()}Repository.findById.calledWith('123')).to.be.true;
    });
    
    it('should handle errors properly', async () => {
      // Arrange
      const testData = { id: '456' };
      const error = new Error('Test error');
      dependencies.${domain.toLowerCase()}Repository.findById.rejects(error);
      
      // Act & Assert
      try {
        await ${service.toLowerCase()}.someMethod(testData);
        expect.fail('Expected error was not thrown');
      } catch (err) {
        expect(err).to.equal(error);
        expect(dependencies.logger.error.called).to.be.true;
      }
    });
  });
  
  describe('publishingEvents', () => {
    it('should publish domain events', async () => {
      // Arrange
      const testData = { id: '789', trigger: 'event' };
      
      // Act
      await ${service.toLowerCase()}.triggerEvent(testData);
      
      // Assert
      expect(dependencies.eventBus.publishEvent.called).to.be.true;
      const [eventType, eventData] = dependencies.eventBus.publishEvent.firstCall.args;
      expect(eventType).to.be.a('string');
      expect(eventData).to.include({ entityId: '789' });
    });
  });
});
`;

    await writeFile(templatePath, templateContent);
    console.log(`✅ Created mocking template at: ${path.relative(__dirname, templatePath)}`);
    
    // Also create a quick reference guide
    const guidePath = path.join(__dirname, '../tests/MOCKING_PATTERNS.md');
    const guideContent = `# Dependency Injection Mocking Patterns

## Proper DI Mocking Approach

For effective testing following DDD principles, always use dependency injection for mocking:

\`\`\`javascript
// Service with proper DI
class UserService {
  constructor(dependencies) {
    this.userRepository = dependencies.userRepository;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
  }
  
  async doSomething() {
    // Use injected dependencies
    const user = await this.userRepository.findById('123');
    this.eventBus.publishEvent('EVENT_TYPE', { data: 'value' });
    return user;
  }
}

// In tests
describe('UserService', () => {
  let dependencies;
  let userService;
  
  beforeEach(() => {
    dependencies = {
      userRepository: {
        findById: sinon.stub().resolves({ id: '123' })
      },
      eventBus: {
        publishEvent: sinon.stub().resolves()
      },
      logger: {
        info: sinon.stub(),
        error: sinon.stub()
      }
    };
    
    userService = new UserService(dependencies);
  });
});
\`\`\`

## Anti-patterns to Avoid

❌ **Monkey Patching**
\`\`\`javascript
// Don't do this:
const eventBus = require('../../shared/eventBus');
sinon.stub(eventBus, 'publishEvent').returns(Promise.resolve());
\`\`\`

❌ **Global Mocking with Jest**
\`\`\`javascript
// Don't do this:
jest.mock('../../shared/eventBus', () => ({
  publishEvent: jest.fn()
}));
\`\`\`

## Standard Mocking Objects

### EventBus Mock
\`\`\`javascript
const eventBusMock = {
  publishEvent: sinon.stub().resolves(),
  subscribe: sinon.stub().returns({ id: 'subscription-123' }),
  unsubscribe: sinon.stub().resolves(true)
};
\`\`\`

### Repository Mock
\`\`\`javascript
const repositoryMock = {
  findById: sinon.stub().resolves({ id: '123', name: 'Test Entity' }),
  findByUserId: sinon.stub().resolves([{ id: '123' }]),
  save: sinon.stub().callsFake(entity => Promise.resolve({ ...entity, id: entity.id || '123' })),
  delete: sinon.stub().resolves(true),
  update: sinon.stub().callsFake((id, updates) => Promise.resolve({ id, ...updates }))
};
\`\`\`

### OpenAI Client Mock
\`\`\`javascript
const openAIClientMock = {
  sendMessage: sinon.stub().resolves({ 
    content: 'Mock AI response',
    responseId: 'mock-response-123'
  }),
  sendJsonMessage: sinon.stub().resolves({
    content: '{"result": "success"}',
    data: { result: 'success' },
    responseId: 'mock-json-123'
  }),
  streamMessage: sinon.stub().resolves({
    on: (event, callback) => ({
      on: (endEvent, endCallback) => {
        // Simulate streaming response
        setTimeout(() => callback({ choices: [{ delta: { content: 'Mock' } }] }), 10);
        setTimeout(() => callback({ choices: [{ delta: { content: ' stream' } }] }), 20);
        setTimeout(() => endCallback(), 30);
        return { cancel: sinon.stub() };
      }
    })
  })
};
\`\`\`
`;

    await writeFile(guidePath, guideContent);
    console.log(`✅ Created mocking patterns guide at: ${path.relative(__dirname, guidePath)}`);
    
  } catch (error) {
    console.error('❌ Error generating template:', error.message);
    process.exit(1);
  }
}

// Run the generation
generateMockingTemplate()
  .then(() => {
    console.log('\n✨ Template generation complete!');
    console.log('\nTo use this template:');
    console.log(`1. Update the methods and assertions to match your actual ${service}`);
    console.log('2. Ensure your service accepts dependencies via constructor injection');
    console.log('3. Reference tests/MOCKING_PATTERNS.md for standard mocking patterns');
  })
  .catch(error => {
    console.error('❌ Template generation failed:', error);
    process.exit(1);
  }); 