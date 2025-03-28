# AI Fight Club CLI

This CLI provides a terminal-based interface to interact with the AI Fight Club application. It follows proper application architecture by:

1. Using dependency injection instead of direct API calls
2. Leveraging domain services and application coordinators
3. Following the same architecture as the main application

## Features

- User onboarding
- Challenge generation
- Challenge response submission and evaluation
- User profile viewing

## Architecture

The CLI is structured following clean architecture principles:

- `index.js`: Entry point with the main menu and flow control
- `commands/`: Directory for modular CLI commands (to be expanded)

## How to Run

```bash
# Run from project root
npm run cli
```

## Adding New Commands

To add new commands:

1. Create a new file in the `commands/` directory
2. Implement the command logic using the application services and coordinators
3. Export the command function
4. Import and register the command in `index.js`

## Benefits Over Previous Implementation

This CLI implementation has several advantages over the previous `terminal-client.js`:

1. Proper dependency injection through the container
2. Reuses domain logic instead of duplicating it
3. Better testability through modularity
4. Follows the same architecture as the main application

## Contributing

When extending this CLI, please:

1. Use the container for service injection
2. Don't make direct API calls
3. Follow the application's domain-driven design principles
4. Add unit tests for new commands 