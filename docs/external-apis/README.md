# External APIs Integration

This directory contains documentation for the external APIs used in the application.

## Overview

The application integrates with several external services to provide its functionality. This documentation explains how these integrations work and how to use them effectively.

## External Services

- [OpenAI Responses API](./openai-responses-api.md) - AI text generation and evaluation
- [Supabase](./supabase.md) - Database and authentication

## Integration Approach

Each external API integration follows these principles:

1. Abstraction - All external services are abstracted behind interfaces
2. Error Handling - Robust error handling for API failures
3. Resilience - Retry mechanisms and fallback strategies
4. Configuration - Externalized configuration for API keys and endpoints

## Integration Testing

External API integrations can be tested using the provided test helpers:

```javascript
// Example of testing with external APIs
const { hasRequiredVars } = require('../tests/loadEnv');

describe('External API Integration', function() {
  before(function() {
    // Skip tests if required environment variables are not set
    if (!hasRequiredVars('openai')) {
      this.skip();
    }
  });
  
  it('should connect to external API', async function() {
    // Test implementation
  });
});
``` 