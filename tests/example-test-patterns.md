# Example Test Patterns

This document shows examples of proper test patterns to follow when writing tests.

## Environment Setup

```javascript
// Import environment helpers
const testEnv = require('../loadEnv');  // Adjust path based on your file location
const { skipIfMissingEnv } = require('../helpers/testHelpers');

describe('My Test Suite', function() {
  // Skip tests if required environment variables are missing
  before(function() {
    skipIfMissingEnv(this, 'openai');  // Skip if OpenAI credentials are missing
    // Or: skipIfMissingEnv(this, 'supabase'); // Skip if Supabase credentials are missing
    // Or: skipIfMissingEnv(this, 'all');      // Skip if any credentials are missing
  });
  
  // Set appropriate timeout for API calls
  this.timeout(30000);
  
  // Tests...
});
```

## Importing Source Modules

```javascript
// Always use this pattern for importing from src directory
const MyModule = require('../../src/path/to/module');

// For example:
const Challenge = require('../../src/core/challenge/models/Challenge');
const challengeRepository = require('../../src/core/challenge/repositories/challengeRepository');
```

## Test Types

### Domain Tests

```javascript
// domain/feature/someFeature.test.js
const { expect } = require('chai');
const MyDomainModel = require('../../src/core/domain/models/MyModel');

describe('Domain: MyModel', function() {
  it('should validate data correctly', function() {
    const model = new MyDomainModel({ /* data */ });
    expect(model.isValid()).to.be.true;
  });
});
```

### Integration Tests

```javascript
// integration/feature/someFeature.integration.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const Service1 = require('../../src/core/service1');
const Service2 = require('../../src/core/service2');

describe('Integration: Service1 with Service2', function() {
  let service1, service2;
  
  beforeEach(function() {
    service1 = new Service1();
    service2 = new Service2();
  });
  
  it('should coordinate correctly', async function() {
    const result = await service1.doSomethingWith(service2);
    expect(result).to.exist;
  });
});
```

### External API Tests

```javascript
// external/service/feature.direct.test.js
const { expect } = require('chai');
const testEnv = require('../../loadEnv');
const { skipIfMissingEnv } = require('../../helpers/testHelpers');
const { Configuration, OpenAIApi } = require('openai');

describe('External: OpenAI API', function() {
  let openai;
  
  before(function() {
    skipIfMissingEnv(this, 'openai');
    
    const config = testEnv.getTestConfig();
    const configuration = new Configuration({
      apiKey: config.openai.apiKey
    });
    openai = new OpenAIApi(configuration);
  });
  
  this.timeout(30000);
  
  it('should connect to the API', async function() {
    // Test actual API connection
  });
});
```

## Mocking Services

```javascript
const sinon = require('sinon');
const { expect } = require('chai');
const service = require('../../src/core/service');

describe('With mocked dependencies', function() {
  let mockDependency;
  
  beforeEach(function() {
    mockDependency = {
      method: sinon.stub().resolves('result')
    };
  });
  
  afterEach(function() {
    sinon.restore();
  });
  
  it('should call dependency correctly', async function() {
    await service.doSomething(mockDependency);
    expect(mockDependency.method.calledOnce).to.be.true;
  });
}); 