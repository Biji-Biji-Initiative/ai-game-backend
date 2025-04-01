# Admin UI

The Admin UI provides a powerful interface for monitoring and interacting with the API server. It allows you to visualize domain state, test API endpoints, and monitor logs in real-time.

## Features

- **API Status Monitoring**: Real-time monitoring of API health and connectivity
- **Domain State Visualization**: Interactive view of the application's domain state with change tracking
- **Request Builder**: Build and test API requests with a user-friendly interface
- **Response Inspector**: Analyze API responses with syntax highlighting and formatting
- **Variable Extraction**: Extract and manage variables from API responses for use in subsequent requests
- **Log Viewer**: Filter and search application logs by level and content
- **Flow Management**: Create, edit, and run sequences of API requests as flows
- **Dark/Light Theme**: Switch between dark and light mode for comfortable viewing

## Architecture

The Admin UI is built using a modular architecture with these key components:

### Core Modules

- **StatusManager**: Monitors API health and connectivity
- **DomainStateManager**: Manages the application's domain state
- **RequestManager**: Handles API requests and responses
- **LogManager**: Collects and manages application logs

### Components

- **DomainStateViewer**: Visualizes application state with change tracking
- **RequestBuilder**: Interface for building API requests
- **ResponseViewer**: Displays and formats API responses
- **FlowEditor**: Manages sequences of API requests
- **LogViewer**: Displays and filters application logs

### Utilities

- **logger**: Consistent logging throughout the application
- **storage-utils**: Utilities for working with browser storage
- **dom-utils**: Helper functions for DOM manipulation

## File Structure

```
admin/
├── css/
│   ├── components.css     # Component-specific styles
│   ├── json-formatter.css # Styles for JSON formatter
│   └── output.css         # Compiled Tailwind CSS
├── js/
│   ├── components/        # UI components
│   ├── modules/           # Core modules
│   ├── utils/             # Utility functions
│   ├── vendor/            # Third-party libraries
│   ├── main.js            # Main entry point
│   └── bundle.js          # Bundled JavaScript (compiled)
├── index.html             # Main HTML file
├── style.css              # Main stylesheet
└── README.md              # This file
```

## Module Details

### StatusManager

The StatusManager module monitors the health and status of the API server. It periodically checks the API health endpoint and updates the UI to reflect the current status.

```typescript
// Example usage
const statusManager = new StatusManager({
  statusEndpoint: '/api/health',
  containerId: 'api-status',
  updateInterval: 10000 // Check every 10 seconds
});

statusManager.start();
```

### DomainStateManager

The DomainStateManager module manages the application's domain state. It provides methods for getting, setting, and removing state values, and can persist state to localStorage.

```typescript
// Example usage
const stateManager = new DomainStateManager({
  viewer: stateViewer,
  storageKey: 'domain_state',
  stateEndpoint: '/api/v1/state'
});

stateManager.initialize();
```

### Storage Utilities

The storage utilities provide a consistent interface for working with localStorage and sessionStorage, with support for namespacing, expiration, and other features.

```typescript
// Example usage
import { setLocalStorageItem, getLocalStorageItem } from './utils/storage-utils';

// Store with expiration
setLocalStorageItem('user', userData, { 
  expires: 3600000, // 1 hour
  prefix: 'admin_ui'
});

// Retrieve
const userData = getLocalStorageItem('user', { prefix: 'admin_ui' });
```

## Getting Started

To use the Admin UI, follow these steps:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the CSS**:
   ```bash
   npm run build:css
   ```

3. **Build the JavaScript bundle**:
   ```bash
   npm run build:js
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Access the UI** at http://localhost:3000/admin/

## Development

### Adding New Components

1. Create the component file in `js/components/`
2. Add related styles in `css/components.css`
3. Import and initialize the component in `main.js`

### Building for Production

```bash
npm run build
```

This will create optimized CSS and JavaScript files for production use.

## Browser Support

The Admin UI supports all modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

If you'd like to contribute to the Admin UI, please follow these guidelines:

1. Follow the existing code style and organization
2. Add appropriate documentation for new features
3. Test your changes thoroughly before submitting a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 