# Dependency Injection Mocking Patterns

## Proper DI Mocking Approach

For effective testing following DDD principles, always use dependency injection for mocking:

```javascript
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
```

## Anti-patterns to Avoid

❌ **Monkey Patching**
```javascript
// Don't do this:
const eventBus = require('../../shared/eventBus');
sinon.stub(eventBus, 'publishEvent').returns(Promise.resolve());
```

❌ **Global Mocking with Jest**
```javascript
// Don't do this:
jest.mock('../../shared/eventBus', () => ({
  publishEvent: jest.fn()
}));
```

## Standard Mocking Objects

### EventBus Mock
```javascript
const eventBusMock = {
  publishEvent: sinon.stub().resolves(),
  subscribe: sinon.stub().returns({ id: 'subscription-123' }),
  unsubscribe: sinon.stub().resolves(true)
};
```

### Repository Mock
```javascript
const repositoryMock = {
  findById: sinon.stub().resolves({ id: '123', name: 'Test Entity' }),
  findByUserId: sinon.stub().resolves([{ id: '123' }]),
  save: sinon.stub().callsFake(entity => Promise.resolve({ ...entity, id: entity.id || '123' })),
  delete: sinon.stub().resolves(true),
  update: sinon.stub().callsFake((id, updates) => Promise.resolve({ id, ...updates }))
};
```

### OpenAI Client Mock
```javascript
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
```
