# AI Fight Club API Tester

A React-based UI tool for testing the AI Fight Club API endpoints. This tool allows developers and testers to quickly interact with the API without writing code.

## Features

- **API Explorer**: Browse and search through all available API endpoints with detailed documentation
- **Dynamic Form Generation**: Forms are automatically generated based on endpoint specifications
- **Path and Query Parameter Support**: Easily set parameters for API requests
- **Request Body Builder**: JSON editor for request bodies with validation
- **Response Viewer**: View API responses in pretty or raw format
- **Scenario Builder**: Create, save, and run multi-step API request sequences

## Getting Started

1. Navigate to the ui-tester package directory:
   ```
   cd packages/ui-tester
   ```

2. Install dependencies if needed:
   ```
   pnpm install
   ```

3. Start the development server:
   ```
   pnpm dev
   ```

4. Open your browser at the indicated URL (typically `http://localhost:5173`)

## Using the API Tester

The API Tester provides a simple interface for testing individual API endpoints:

1. Select an endpoint from the left panel
2. Fill in path parameters, query parameters, and request body as needed
3. Click "Send Request" to execute the API call
4. View the response in the right panel

## Using the Scenario Builder

The Scenario Builder allows you to create sequences of API calls that execute one after another, which is useful for testing complex workflows:

1. Switch to the "Scenario Builder" tab
2. Click "Create New Scenario" and give it a name and description
3. Select an endpoint from the dropdown and fill in the required parameters
4. Add as many steps as needed to your scenario
5. Arrange steps in the correct order using the up/down arrows
6. Click "Run Scenario" to execute all steps in sequence
7. View the results of each step, including response data

### Creating Game Scenarios

You can use the Scenario Builder to simulate game flows, for example:

1. Register a user
2. Login with the user
3. Create a new game
4. Make moves in the game
5. Check the game state

The Scenario Builder will save your scenarios in your browser's local storage, so you can reuse them later.

## Configuration

You can change the base URL of the API by updating the URL field in the header. This allows you to point the tester to different environments (local, staging, production).

## Contributing

Feel free to submit issues or pull requests to enhance the functionality of this tool.

## Architecture

The API Tester follows a component-based architecture using React and TypeScript:

- **App Component**: Main container that sets up the UI structure and global state
- **NotificationSystem**: Global notification system for displaying success/error messages
- **API Utilities**: Helper functions for fetching endpoints and making API requests

## Development

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the ui-tester directory
3. Install dependencies:

```bash
npm install
```

### Running the Development Server

Start the development server:

```bash
npm run dev
```

The server will start on port 3003 by default. Visit `http://localhost:3003` to access the application.

## API Interaction

The UI Tester communicates with the API server (running on port 3000 by default) through a Vite proxy configuration.

All API requests are made to the `/api/*` path, which Vite forwards to the API server.

## Error Handling

The application includes a global notification system that displays error messages when:

- API requests fail
- Network errors occur
- Responses return error status codes

## Configuration

### API Endpoints

API endpoints are defined in the `public/data/endpoints.json` file. The structure is:

```json
[
  {
    "path": "/users",
    "method": "GET",
    "description": "Get a list of all users"
  }
]
```

### Proxy Configuration

The Vite development server proxies API requests to the backend. Configure the proxy in `vite.config.ts`:

```ts
server: {
  port: 3003,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
},
```

## Folder Structure

```
packages/ui-tester/
├── public/              # Static assets and data files
│   ├── data/            # API endpoint definitions
│   └── img/             # Images and icons
├── src/                 # Application source code
│   ├── components/      # React components
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## License

Copyright © 2023-2024 AI Fight Club
