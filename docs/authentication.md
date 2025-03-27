# Authentication

## API Keys

The Responses API uses API keys for authentication. Every request must include your API key in the Authorization header.

```bash
Authorization: Bearer YOUR_API_KEY
```

### Managing API Keys

1. Get your API key from the [OpenAI dashboard](https://platform.openai.com/api-keys)
2. Store your API key securely using environment variables
3. Never commit API keys to version control

Example using environment variables:

```javascript
require('dotenv').config();
const openai = require('openai');

const client = new openai.OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

### API Key Best Practices

1. Rotate keys regularly
2. Use different keys for development and production
3. Set appropriate permissions for each key
4. Monitor key usage for unusual patterns

## Organization IDs

If you're part of multiple organizations:

```javascript
const client = new openai.OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-....'
});
```

## Rate Limits

### Default Limits

- Requests per minute (RPM): Varies by tier
- Tokens per minute (TPM): Varies by model and tier
- Concurrent requests: Varies by tier

### Rate Limit Headers

Response headers include rate limit information:

```
x-ratelimit-limit-requests: 3000
x-ratelimit-remaining-requests: 2995
x-ratelimit-reset-requests: 2024-03-22T20:43:26Z
```

### Handling Rate Limits

1. Implement exponential backoff
2. Monitor rate limit headers
3. Cache responses when possible

Example retry logic:

```javascript
async function makeRequestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) { // Rate limit exceeded
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Error Handling

### Common Error Codes

- 401: Invalid authentication
- 403: Insufficient permissions
- 429: Rate limit exceeded
- 500: Server error

### Error Response Format

```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded",
    "param": null
  }
}
```

### Best Practices for Error Handling

1. Always catch and handle errors
2. Log error details for debugging
3. Implement appropriate retry logic
4. Provide meaningful error messages to users
