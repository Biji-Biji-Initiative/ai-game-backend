# Dependency Injection Container Guide

This guide explains how to work with the modular dependency injection (DI) container system that has been implemented for better organization and maintainability.

## Container Architecture

The DI container system has been organized into modular files for better maintainability:

```
src/config/container/
├── index.js                 # Main entry point that initializes the container
├── infrastructure.js        # Infrastructure components (logging, database, etc.)
├── repositories.js          # Domain repository components
├── services.js              # Domain and application service components
├── controllers.js           # Controller components for handling requests
└── routes.js                # Route components for API endpoints
```

## How It Works

1. The `index.js` file initializes the container and loads all module registrations
2. Each module file contains a function that registers a specific type of component
3. The `container.js` file in the config directory acts as a compatibility layer for existing code that requires the container

## Adding New Components

### Adding a New Repository

1. Open `src/config/container/repositories.js`
2. Add a new container registration inside the `registerRepositoryComponents` function:

```javascript
container.register(
  'myNewRepository',
  c => {
    const MyNewRepository = require('../../core/domain/repositories/MyNewRepository');
    return new MyNewRepository(c.get('supabase'), c.get('logger'));
  },
  true // Set to true for singleton instances
);
```

### Adding a New Service

1. Open `src/config/container/services.js`
2. Add a new container registration inside the `registerServiceComponents` function:

```javascript
container.register(
  'myNewService',
  c => {
    const MyNewService = require('../../core/domain/services/MyNewService');
    return new MyNewService({
      myNewRepository: c.get('myNewRepository'),
      logger: c.get('logger'),
      eventBus: c.get('eventBus'),
    });
  },
  true
);
```

### Adding a New Controller

1. Open `src/config/container/controllers.js`
2. Add a new container registration inside the `registerControllerComponents` function:

```javascript
container.register(
  'myNewController',
  c => {
    const MyNewController = require('../../core/domain/controllers/MyNewController');
    return new MyNewController({
      myNewService: c.get('myNewService'),
      logger: c.get('logger'),
    });
  },
  true
);
```

### Adding a New Route

1. Open `src/config/container/routes.js`
2. Add a new container registration inside the `registerRouteComponents` function:

```javascript
container.register(
  'myNewRoutes',
  c => {
    const myNewRoutes = require('../../routes/myNewRoutes');
    return myNewRoutes(c.get('myNewController'));
  },
  true
);
```

3. Add the route to the `apiRoutes` registration in the same file:

```javascript
// Inside the apiRoutes registration
router.use('/my-new-feature', c.get('myNewRoutes'));
```

## Best Practices

1. **Follow a consistent pattern** for each type of component
2. **Use object parameter notation** for components that require multiple dependencies
3. **Register as singletons** (true as the third parameter) for services that should only be instantiated once
4. **Domain-specific components** should have their own domain-specific loggers
5. **Keep component registrations organized** by their domain or function

## Accessing Components

You can access any registered component using the container's `get` method:

```javascript
const myService = container.get('myService');
```

## Adding a New Domain

When adding a completely new domain, follow these steps:

1. Create the domain files (repositories, services, controllers, etc.)
2. Add repository registrations to `repositories.js`
3. Add service registrations to `services.js`
4. Add controller registrations to `controllers.js`
5. Add route registrations to `routes.js`

## Troubleshooting

If you encounter the error "Service not registered", make sure:

1. The component is registered in the appropriate module file
2. The name used in `container.get()` matches the registration name
3. There are no circular dependencies between components

For more complex issues, review the entire dependency chain to ensure all dependencies are properly registered. 