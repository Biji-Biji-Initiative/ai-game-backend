# Environment Variables

This document outlines the environment variables used in the AI Fight Club frontend application.

## Available Environment Variables

### API Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_MOCKING` | Enable API mocking (`enabled` or `disabled`) | - |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL for API calls | `/api` |

### Application Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application name | `AI Fight Club` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_FEATURE_LOGGING` | Enable logging features (`true` or `false`) | - |

### UI Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_DEFAULT_THEME` | Default theme (`system`, `light`, or `dark`) | `system` |

## Environment Files

The application uses the following environment files in order of precedence:

1. `.env.local` - Local overrides (not committed to git)
2. `.env.development` - Development environment (when running `next dev`)
3. `.env.production` - Production environment (when running `next start`)
4. `.env` - Default values for all environments

## Usage in Code

Environment variables are centralized in the `src/config/env.ts` file to provide type safety and default values. Always import from this file rather than accessing `process.env` directly:

```typescript
import { apiConfig, appConfig, featureFlags, uiConfig } from '@/config/env';

// Example usage
console.log(apiConfig.baseUrl);
console.log(appConfig.name);
console.log(featureFlags.logging);
console.log(uiConfig.defaultTheme);
```

## Setting Up Environment Variables

1. Copy `env.template` to `.env.local`
2. Modify the values as needed
3. Restart the development server

For production deployment, ensure all required environment variables are properly set in the hosting environment.
