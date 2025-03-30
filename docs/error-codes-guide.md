# API Error Codes Guide

This document explains the standardized error code approach used throughout the application.

## Error Code System

Our application uses a domain-specific error code system that provides clear, specific error information for each domain.

## Domain-Specific Error Codes

Error codes follow the pattern `<DOMAIN>_<TYPE>_<SUBTYPE>` where:

- **DOMAIN**: 2-4 letter domain prefix (USER, CHAL, FOCUS, etc.)
- **TYPE**: Error category (NOT_FOUND, VALIDATION, etc.)
- **SUBTYPE**: Optional specific error (EMAIL, FORMAT, etc.)

Examples: `USER_NOT_FOUND`, `CHAL_VALIDATION_FORMAT`, `FOCUS_ACCESS_DENIED`

### Domain Prefixes

| Prefix | Domain |
|--------|--------|
| `USER_` | User domain |
| `CHAL_` | Challenge domain |
| `FOCUS_` | Focus area domain |
| `PERS_` | Personality domain |
| `EVAL_` | Evaluation domain |
| `PROG_` | Progress domain |
| `ADAP_` | Adaptive domain |
| `AUTH_` | Authentication domain |
| `JOUR_` | User journey domain |
| `AI_` | OpenAI domain |

### Common Error Types

Common error types across domains:

- `NOT_FOUND`: Resource not found (404)
- `VALIDATION`: Data validation error (400)
- `PROCESSING`: Error during processing (500)
- `REPOSITORY`: Database or repository error (500)
- `ACCESS_DENIED`: Access control error (403)

## HTTP Status Codes

The system automatically maps error codes to appropriate HTTP status codes:

| Error Code Pattern | HTTP Status |
|-------------------|-------------|
| `*_NOT_FOUND` | 404 |
| `*_VALIDATION_*` | 400 |
| `*_PROCESSING` | 500 |
| `*_REPOSITORY` | 500 |
| `*_ACCESS_DENIED` | 403 |
| `AUTH_INVALID_*` | 401 |

## For Developers

When creating new error classes or throwing errors:

1. Use the domain-specific error codes from `DomainErrorCodes.js`
2. Pass the appropriate error code in the options object
3. Let the error handler middleware determine the correct HTTP status code automatically

Example:

```javascript
import { UserErrorCodes } from "../../infra/errors/DomainErrorCodes.js";

throw new UserNotFoundError("User not found", { 
  errorCode: UserErrorCodes.NOT_FOUND,
  metadata: { userId: "123" }
});
```

## Extending Error Codes

To add new domain-specific error codes:

1. Add the new code to the appropriate domain in `src/core/infra/errors/DomainErrorCodes.js`
2. Update the error classes to use the new code
3. If needed, add a new pattern mapping to `errorCodeToStatusMap` in `ErrorHandler.js`
4. Document the new code in this guide

## Error Response Format

API error responses follow this format:

```json
{
  "success": false,
  "status": "error",
  "message": "User not found",
  "errorCode": "USER_NOT_FOUND",
  "requestId": "req-123456"
}
```

In development environments, additional details are included:

```json
{
  "success": false,
  "status": "error",
  "message": "User not found",
  "errorCode": "USER_NOT_FOUND",
  "requestId": "req-123456",
  "error": {
    "name": "UserNotFoundError",
    "message": "User not found",
    "stack": "..."
  },
  "metadata": {
    "userId": "123"
  }
}
``` 