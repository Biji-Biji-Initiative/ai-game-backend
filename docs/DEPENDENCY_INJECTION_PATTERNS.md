# Dependency Injection Patterns for Tests

## Overview

This guide covers best practices for using dependency injection (DI) in tests, focusing on constructor injection as the preferred pattern. It explains why DI is important for testing and provides examples of how to refactor tests from legacy patterns (like proxyquire or direct stubbing) to proper constructor injection.

## Why Dependency Injection?

### Benefits of Constructor Injection

1. **Explicit Dependencies**: Makes dependencies clear and visible
2. **Better Testability**: Simplifies mocking dependencies for tests
3. **Loose Coupling**: Reduces direct dependencies between components
4. **Flexibility**: Makes it easier to swap implementations
5. **Maintainability**: Leads to more modular and maintainable code

### Issues with Legacy Approaches

1. **proxyquire/jest.mock**: Creates implicit, hard-to-track dependencies
2. **Global Stubbing**: Can cause test bleeding and make tests brittle
3. **Direct Module Imports**: Makes tests dependent on implementation details
4. **Empty Constructors**: May lead to using real implementations instead of test doubles

## Constructor Injection Pattern

### 1. In Production Code

```javascript
// UserService.js
export class UserService {
  constructor({ userRepository, eventBus, logger }) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
    this.logger = logger;
  }
  
  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${id} not found`);
    }
    return user;
  }
}
```

### 2. In Tests

```javascript
// UserService.test.js
import { expect } from 'chai';
import sinon from 'sinon';
import { UserService } from '../../../src/core/user/services/UserService.js';
import { UserNotFoundError } from '../../../src/core/user/errors/UserErrors.js';

describe('UserService', () => {
  let userService;
  let mockUserRepository;
  let mockEventBus;
  let mockLogger;
  
  beforeEach(() => {
    // Create mock dependencies
    mockUserRepository = {
      findById: sinon.stub(),
      create: sinon.stub(),
      update: sinon.stub(),
      delete: sinon.stub()
    };
    
    mockEventBus = {
      publish: sinon.stub().resolves()
    };
    
    mockLogger = {
      info: sinon.stub(),
      error: sinon.stub()
    };
    
    // Instantiate service with mock dependencies
    userService = new UserService({
      userRepository: mockUserRepository,
      eventBus: mockEventBus,
      logger: mockLogger
    });
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  it('should get user by ID', async () => {
    // Arrange
    const userId = '123';
    const mockedUser = { id: userId, name: 'Test User' };
    mockUserRepository.findById.withArgs(userId).resolves(mockedUser);
    
    // Act
    const result = await userService.getUserById(userId);
    
    // Assert
    expect(result).to.deep.equal(mockedUser);
    expect(mockUserRepository.findById.calledWith(userId)).to.be.true;
  });
  
  it('should throw UserNotFoundError when user does not exist', async () => {
    // Arrange
    const userId = '456';
    mockUserRepository.findById.withArgs(userId).resolves(null);
    
    // Act & Assert
    try {
      await userService.getUserById(userId);
      expect.fail('Expected to throw UserNotFoundError');
    } catch (error) {
      expect(error).to.be.instanceOf(UserNotFoundError);
      expect(error.message).to.include('not found');
    }
  });
});
```

## Refactoring Guide: From Legacy Patterns to Constructor Injection

### From proxyquire to Constructor Injection

#### Before (with proxyquire)

```javascript
import proxyquire from 'proxyquire';

const mockUserRepository = {
  findById: sinon.stub().resolves({ id: '123', name: 'Test User' })
};

const UserService = proxyquire('../../../src/core/user/services/UserService', {
  '../repositories/UserRepository': mockUserRepository
});

const userService = new UserService();

// Test userService...
```

#### After (with Constructor Injection)

```javascript
import { UserService } from '../../../src/core/user/services/UserService.js';

const mockUserRepository = {
  findById: sinon.stub().resolves({ id: '123', name: 'Test User' })
};

const userService = new UserService({
  userRepository: mockUserRepository
});

// Test userService...
```

### From Direct Stubbing to Constructor Injection

#### Before (with direct stubbing)

```javascript
import { UserService } from '../../../src/core/user/services/UserService.js';
import * as UserRepository from '../../../src/core/user/repositories/UserRepository.js';

sinon.stub(UserRepository, 'findById').resolves({ id: '123', name: 'Test User' });

const userService = new UserService();

// Test userService...
```

#### After (with Constructor Injection)

```javascript
import { UserService } from '../../../src/core/user/services/UserService.js';

const mockUserRepository = {
  findById: sinon.stub().resolves({ id: '123', name: 'Test User' })
};

const userService = new UserService({
  userRepository: mockUserRepository
});

// Test userService...
```

## Best Practices

1. **Create Mock Factory Functions**: For frequently used mocks, create factory functions
   ```javascript
   function createMockUserRepository() {
     return {
       findById: sinon.stub(),
       create: sinon.stub(),
       update: sinon.stub(),
       delete: sinon.stub()
     };
   }
   ```

2. **Reset Mocks Between Tests**: To prevent test bleeding
   ```javascript
   beforeEach(() => {
     mockUserRepository = createMockUserRepository();
     userService = new UserService({ userRepository: mockUserRepository });
   });
   ```

3. **Verify All Interactions**: Test both the returned results and the interactions with dependencies
   ```javascript
   expect(result).to.deep.equal(expectedResult);
   expect(mockUserRepository.findById.calledWith(userId)).to.be.true;
   ```

4. **Test Error Cases**: Ensure error cases are properly tested
   ```javascript
   mockUserRepository.findById.rejects(new Error('Database error'));
   
   try {
     await userService.getUserById('123');
     expect.fail('Should have thrown an error');
   } catch (error) {
     expect(error).to.be.instanceOf(UserRepositoryError);
   }
   ```

5. **Avoid Partial Mocking**: Mock entire dependencies rather than individual methods
   ```javascript
   // Don't do this
   const userService = new UserService({
     userRepository: userRepository // Real implementation
   });
   sinon.stub(userService.userRepository, 'findById');
   
   // Do this instead
   const userService = new UserService({
     userRepository: mockUserRepository // Mock implementation
   });
   ```

## Step-by-Step Refactoring Process

1. **Identify Dependencies**: List all dependencies of the class under test
2. **Create Mocks**: Create mock implementations for each dependency
3. **Update Constructor**: Ensure the class accepts dependencies via constructor
4. **Instantiate with Mocks**: Create instance of the class with mock dependencies
5. **Set Up Stubs**: Configure your mocks for each test case
6. **Run Tests**: Execute and verify tests work with the new pattern
7. **Remove Legacy Code**: Clean up any remaining proxyquire or direct stub code

## Common Issues and Solutions

### Missing Dependencies

**Problem**: Constructor requires dependencies that aren't provided in tests

**Solution**: Check the constructor signature and ensure all required dependencies are mocked

```javascript
// Class constructor
constructor({ 
  userRepository, 
  eventBus, 
  logger, 
  config = defaultConfig 
}) {
  // ...
}

// In tests
const userService = new UserService({
  userRepository: mockUserRepository,
  eventBus: mockEventBus,
  logger: mockLogger
  // config is optional with a default
});
```

### Nested Dependencies

**Problem**: Mocking deeply nested object structures

**Solution**: Create factory functions for complex dependency trees

```javascript
function createMockConfig() {
  return {
    auth: {
      tokenExpiry: 3600,
      refreshTokenExpiry: 86400
    },
    api: {
      rateLimit: 100
    }
  };
}
```

### Static Methods/Properties

**Problem**: Classes with static methods or properties that are hard to mock

**Solution**: Refactor to use instance methods or inject the static dependencies

```javascript
// Before
class UserService {
  static validateEmail(email) {
    return emailRegex.test(email);
  }
  
  async createUser(userData) {
    if (!UserService.validateEmail(userData.email)) {
      throw new ValidationError('Invalid email');
    }
    // ...
  }
}

// After
class UserService {
  constructor({ emailValidator }) {
    this.emailValidator = emailValidator;
  }
  
  async createUser(userData) {
    if (!this.emailValidator.validate(userData.email)) {
      throw new ValidationError('Invalid email');
    }
    // ...
  }
}

// In tests
const mockEmailValidator = {
  validate: sinon.stub().returns(true)
};

const userService = new UserService({
  emailValidator: mockEmailValidator
});
```

## Using In-Memory Repositories

For integration tests, consider using in-memory repositories instead of mocks:

```javascript
class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
  }
  
  async findById(id) {
    return this.users.get(id) || null;
  }
  
  async create(user) {
    const newUser = { ...user, id: user.id || uuidv4() };
    this.users.set(newUser.id, newUser);
    return newUser;
  }
  
  // Other repository methods...
}

// In tests
const userRepository = new InMemoryUserRepository();
userRepository.users.set('123', { id: '123', name: 'Test User' });

const userService = new UserService({
  userRepository
});
```

## Conclusion

By following these dependency injection patterns, your tests will become:

- More maintainable
- Less fragile
- Easier to understand
- Better at isolating units of code
- More aligned with SOLID principles

These benefits lead to a more maintainable codebase and a more enjoyable testing experience. 