# AI Fight Club Frontend Architecture

This document explains the architecture of the AI Fight Club frontend, which is now a pure frontend repository with no backend dependencies.

## Overview

The AI Fight Club frontend is a Next.js application with TypeScript and Tailwind CSS. It uses a modern component architecture with shadcn/ui for UI components and a service-oriented approach for API interactions.

## Key Components

### Frontend Technologies

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable UI components based on Radix UI

### API Service Architecture

The application uses a service-oriented architecture for API interactions:

1. **API Client Interface**: Defines the contract for HTTP requests
2. **Mock API Client**: Returns mock data instead of making real HTTP requests
3. **Service Interfaces**: Define contracts for domain-specific services
4. **Mock Service Implementations**: Provide mock data for development and testing
5. **Service Provider**: Provides access to all services
6. **React Context**: Provides API services to React components

This approach allows us to develop and test the application without a backend while maintaining a clean architecture that can be easily switched to use real API implementations in the future.

## Component Architecture

Components are organized into feature-based directories:

```
src/components/
├── challenges/        # Challenge-related components
├── games/            # Game-related components
├── users/            # User-related components
├── layout/           # Layout components
└── shared/           # Shared components
```

Each component follows the following structure:

1. **Presentation Components**: Pure UI components that receive props and handle rendering
2. **Container Components**: Handle data fetching and state management
3. **Hooks**: Custom hooks for reusable logic
4. **Types**: TypeScript interfaces and types

## State Management

The application uses a combination of:

- **React Context**: For global state management (API services, authentication)
- **Zustand**: For complex state management (game state, user preferences)
- **Component State**: For local state management

### Zustand Stores

The application uses Zustand for state management due to its simplicity, minimal boilerplate, and ease of integration with TypeScript. Key stores include:

1. **Game Store**: Manages game flow state such as:
   - Session ID
   - Current game phase
   - Progress tracking

2. **User Preferences Store**: Manages user interface preferences:
   - Dark mode settings
   - Animation preferences

Each store is implemented with persistence using Zustand's middleware, allowing state to be maintained across page refreshes and browser sessions.

### Integration with API Services

The frontend architecture separates client-side state (managed by Zustand) from server state (managed by API services):

- **Client-side state** (Zustand): UI preferences, game flow, session tracking
- **Server state** (API Services): Data fetched from or sent to the backend

Components use both systems in a complementary manner:
1. API services for data operations
2. Zustand for UI state and navigation

This separation ensures a clean architecture where:
- Backend handles business logic and data persistence
- Frontend focuses on presentation and user interaction

Example usage in a component:

```tsx
function GameComponent() {
  // API services (for data operations)
  const { challengeService } = useApi();
  
  // Zustand state (for UI state)
  const { gamePhase, setGamePhase } = useGameStore();
  
  // Example of combined usage
  const fetchAndAdvance = async () => {
    const response = await challengeService.getChallengeById('123');
    if (response.data) {
      setGamePhase('round1');
    }
  };
}
```

## Styling

- **Tailwind CSS**: Base styling and utility classes
- **shadcn/ui**: Reusable UI components with consistent styling
- **CSS Modules**: For component-specific styles when needed

## Testing

The application uses a comprehensive testing setup:

- **Jest**: Unit testing framework
- **React Testing Library**: For component testing
- **Cypress**: For end-to-end testing
- **Testing Library**: For integration testing

## Development Workflow

1. Create a new feature branch
2. Implement the feature using the component architecture
3. Write unit tests for new components
4. Update documentation if needed
5. Create a pull request with proper description
6. Get code review
7. Merge to main branch

## Best Practices

1. **Type Safety**: Always use TypeScript interfaces and types
2. **Component Reusability**: Create reusable components where possible
3. **State Management**: Use appropriate state management for different scopes
4. **Error Handling**: Implement proper error boundaries and error handling
5. **Performance**: Optimize components and use memoization when needed
6. **Accessibility**: Follow WCAG guidelines for accessibility
7. **Responsive Design**: Ensure components work on all screen sizes

## Future Considerations

1. **Backend Integration**: The architecture is designed to easily switch from mock to real API implementations
2. **Performance Optimization**: Implement code splitting and lazy loading for better performance
3. **Internationalization**: Add support for multiple languages
4. **Analytics**: Add analytics tracking for user behavior
5. **Security**: Implement proper authentication and authorization
6. **Offline Support**: Add offline capabilities using service workers
