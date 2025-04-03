# AI Fight Club API

Backend for the AI Fight Club platform - a stateful web app that challenges users with dynamic, AI-generated cognitive challenges to highlight their unique Human Edge.

## Recent Improvements

The application has been enhanced with the following features:

1. **OpenAPI/Swagger Integration**: 
   - API documentation available at `/api-docs`
   - Request/response validation using OpenAPI schemas
   - Auto-generated client SDKs

2. **Error Monitoring with Sentry**:
   - Automatic error tracking and reporting
   - Performance monitoring
   - User-context for better debugging

3. **API Versioning**:
   - Standardized versioning across all endpoints
   - Support for multiple versioning strategies
   - Deprecation notices for older API versions

4. **Enhanced Security**:
   - Refresh token rotation
   - CORS configuration improvements
   - Rate limiting on sensitive endpoints

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 8.x or higher
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in the required values
4. Run database migrations:
   ```
   npm run db:migrate
   ```
5. Start the development server:
   ```
   npm run start:dev
   ```

## API Documentation

The API documentation is available at `/api-docs` when the server is running. You can also find the OpenAPI specification in JSON format at `/api-docs-json`.

## Error Monitoring

To enable error monitoring, set the `SENTRY_DSN` environment variable in your `.env` file. You can get a DSN from [Sentry](https://sentry.io) after creating a project.

## API Versioning

All API endpoints are versioned using the URI path strategy. The current version is `v1` and is accessed via `/api/v1/...`. Older versions will be deprecated with appropriate notices before being removed.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details. 