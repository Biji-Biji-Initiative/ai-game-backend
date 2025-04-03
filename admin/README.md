# Admin Dashboard Architecture

This project implements a modern, modular frontend architecture for an admin dashboard application.

## Architecture Overview

The architecture follows these key design principles:

1. **Modular Structure**: Components are organized into modules by function
2. **Service-Based Design**: Core functionalities are implemented as services
3. **Dependency Injection**: Services use dependency injection for better testability and loose coupling
4. **Event-Driven Communication**: Services communicate through an event bus
5. **Single Page Application**: Client-side routing for smooth transitions

## Core Components

### 1. Service Manager

The `ServiceManager` handles service lifecycle management, including initialization, dependencies, and disposal. It ensures services are initialized in the correct order based on their dependencies.

Key features:
- Dependency tracking
- Lifecycle management (initialization, disposal)
- Service state monitoring
- Singleton access

### 2. Dependency Container

The `DependencyContainer` implements a dependency injection system, allowing services to be registered, retrieved, and managed centrally.

Key features:
- Component registration
- Dependency resolution
- Singleton management
- Factory pattern support

### 3. Event Bus

The `EventBus` provides a publish-subscribe mechanism for services to communicate without tight coupling.

Key features:
- Event publishing
- Event subscription
- Event unsubscription
- Scoped events

### 4. Router

The `Router` manages client-side navigation for the Single Page Application (SPA).

Key features:
- Route registration
- Path-based navigation
- Route parameters
- Authentication-aware routing
- History API integration

## Services

### API Client

The `ApiClient` manages HTTP communication with the backend services.

Key features:
- Request/response handling
- Error handling
- Interceptors for request/response
- Retry mechanism
- Authentication header management

### Authentication Service

The `AuthService` handles user authentication, session management, and permission checks.

Key features:
- Login/logout
- Token management
- Permission checking
- Role-based authorization
- Session persistence

### User Service

The `UserService` provides user management functionality.

Key features:
- User listing
- User creation/update/deletion
- Role management
- User search

### UI Manager

The `UIManager` provides UI components and utilities for the application.

Key features:
- Toast notifications
- Modal dialogs
- Confirmation dialogs
- Alert messages
- Prompt dialogs

## Getting Started

1. **Installation**

```bash
npm install
```

2. **Development**

```bash
npm run dev
```

3. **Build**

```bash
npm run build
```

## Directory Structure

```
admin/
├── js/
│   ├── api/                # API communication
│   │   └── ApiClient.ts
│   ├── core/               # Core architecture
│   │   ├── DependencyContainer.ts
│   │   ├── EventBus.ts
│   │   ├── Router.ts
│   │   └── ServiceManager.ts
│   ├── services/           # Business logic services
│   │   ├── AuthService.ts
│   │   └── UserService.ts
│   ├── ui/                 # UI components
│   │   └── UIManager.ts
│   ├── utils/              # Utility functions
│   │   ├── logger.ts
│   │   └── storage-utils.ts
│   └── main.ts             # Application entry point
├── styles/                 # CSS styles
├── index.html              # Main HTML file
└── README.md               # Documentation
```

## Usage Examples

### Service Registration

```typescript
// Register service with the service manager
serviceManager.register('authService', () => {
  return new AuthService(apiClient, authConfig);
}, {
  dependencies: ['apiClient'],
  autoInit: true,
});
```

### Event Communication

```typescript
// Subscribe to an event
eventBus.on('auth:login', (data) => {
  console.log('User logged in:', data.user);
});

// Publish an event
eventBus.emit('auth:login', { user });
```

### Route Registration

```typescript
// Register a route
router.register({
  path: '/users/:id',
  title: 'User Details',
  requiresAuth: true,
  handler: async (params) => {
    // Handle route
    const user = await userService.getUserById(params.id);
    renderUserDetails(user);
  },
});
```

### API Client Usage

```typescript
// Make an API request
const response = await apiClient.get<User[]>('/users', {
  limit: 10,
  page: 1,
});

// Post data
await apiClient.post('/users', {
  username: 'newuser',
  email: 'user@example.com',
});
```

## License

MIT 