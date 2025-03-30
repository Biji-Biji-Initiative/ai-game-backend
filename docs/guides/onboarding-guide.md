# Developer Onboarding Guide

This guide is designed to help new developers get started with the AI Gaming Backend project. It provides step-by-step instructions for setting up your development environment and understanding the project structure.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18.x or newer)
- **npm** (version 8.x or newer)
- **Git** (version 2.x or newer)
- **MongoDB** (version 6.x or newer)
- A code editor (we recommend Visual Studio Code)

## 2. Getting the Code

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/ai-back-end-game.git
   cd ai-back-end-game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## 3. Environment Setup

1. Create a `.env` file in the root directory by copying the example:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your local settings:
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/ai_game_dev
   JWT_SECRET=your_jwt_secret_key
   ```

## 4. Database Setup

1. Start your local MongoDB server:
   ```bash
   mongod --dbpath /path/to/data/directory
   ```

2. Run the database initialization script:
   ```bash
   npm run db:init
   ```

## 5. Starting the Development Server

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The server should now be running at `http://localhost:3000`

## 6. Project Structure Overview

Our project follows a domain-driven design approach:

```
src/
├── core/              # Core infrastructure and shared utilities
│   ├── infra/         # Infrastructure concerns (DI, database, etc.)
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── domains/           # Business logic organized by domain
│   ├── auth/          # Authentication and authorization
│   ├── game/          # Game logic
│   ├── player/        # Player management
│   └── ...
├── api/               # API controllers and routes
│   ├── routes/        # Express route definitions
│   ├── middleware/    # API middleware
│   └── controllers/   # Request handlers
├── services/          # Application services
└── index.ts           # Application entry point
```

## 7. Key Concepts

### Dependency Injection

We use a custom dependency injection container for managing dependencies. See the [Dependency Injection Guide](../architecture/dependency-injection.md) for more information.

### Domain-Driven Design

Our code is organized around business domains rather than technical concerns. See the [DDD Principles Guide](../architecture/ddd-principles.md) to understand our approach.

### Testing

We follow a comprehensive testing strategy including unit, integration, and end-to-end tests. See the [Testing Guide](../guides/testing-guide.md) for details.

## 8. Development Workflow

1. **Create a feature branch** from the main branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and write tests

3. **Run the test suite**:
   ```bash
   npm test
   ```

4. **Run linting**:
   ```bash
   npm run lint
   ```

5. **Submit a pull request** to the main branch

See the [Contribution Workflow Guide](../guides/contribution-workflow.md) for detailed information.

## 9. Common Tasks

### Adding a New API Endpoint

1. Create a new controller in `src/api/controllers`
2. Add route handler in `src/api/routes`
3. Register the route in the appropriate module

### Adding a New Domain Feature

1. Create appropriate domain objects in the relevant domain directory
2. Create or update service methods
3. Update API controllers if needed
4. Add tests for all components

## 10. Getting Help

- **Documentation**: All project documentation is in the `/docs` directory
- **Team Communication**: Join our Slack channel #ai-game-backend
- **Issue Tracking**: Report issues in our JIRA board

## 11. Next Steps

Now that you're set up, we recommend:

1. Exploring the codebase to understand the current implementation
2. Reviewing the [Architecture Overview](../architecture/README.md)
3. Reading the [API Documentation](../api/README.md)
4. Running through the test suite to understand the expected behavior

Welcome to the team! If you have any questions, don't hesitate to reach out to any of the team members. 