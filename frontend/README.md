# AI Fight Club Frontend

A React and Next.js application for the AI Fight Club game that challenges users to demonstrate their human intelligence edge.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test
```

## Project Structure

- **src/components**: Reusable UI components
- **src/features**: Feature-specific components organized by domain
- **src/services**: API services and abstractions
- **src/store**: State management using Zustand
- **src/tests**: Testing utilities and mocks
- **src/pages**: Next.js page components (App Router)

## Testing

See [TESTING.md](./TESTING.md) for detailed information about the testing setup and current status.

### Quick Testing Status

- Basic UI components are tested and working
- Most feature components have failing tests that need attention
- Test environment is configured but needs some refinement
- TypeScript types for Jest have been improved but still have some issues

To run a specific test that's known to work:

```bash
npm test src/components/ui/__tests__/typewriter-text.test.tsx
```

## Development Status

The application is functional but has room for improvements:

1. **Test Coverage**: Many tests are failing and need to be fixed.
2. **TypeScript Integration**: Some typing issues with Jest matchers.
3. **Mock Implementations**: Some mocks need to be improved for testing.

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Zustand (State Management)
- Shadcn UI (Component Library)
- React Query (Data Fetching)
- Jest & Testing Library (Testing)
