# API Tester UI

A powerful and flexible UI for testing API endpoints in the AI Fight Club backend.

## Features

### Core Features
- Dynamic loading of API endpoint definitions
- Support for GET, POST, PUT, DELETE HTTP methods
- Automatic token management and authentication
- JSON response formatting with syntax highlighting
- Real-time validation of input fields
- Detailed request and response information

### Advanced Features
- **Request History and Replay**: Logs all API requests with timestamps, methods, and response data
- **Parameter Presets**: Save and load predefined sets of parameters for quick testing
- **Environment Switching**: Easily switch between development, staging, and production environments
- **Enhanced JSON Editing**: Syntax highlighting and validation for JSON input fields
- **Tabbed Response Viewing**: Formatted JSON, raw response, and headers in separate tabs
- **Input Field Validation**: Real-time validation with error messages
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

### Getting Started
1. Open the API Tester UI in your browser
2. Use the "Quick User Setup" section to create or log in as a test user
3. Once logged in, your authentication token is stored automatically

### Making API Requests
1. Navigate to the desired API endpoint section
2. Fill in the required parameters
3. Click "Send Request" to execute the API call
4. View the formatted response in the "API Response" section

### Using Presets
1. Fill in the form with desired values
2. Click "Save As..." to create a new preset
3. Access your saved presets via the dropdown menu
4. Manage presets using the "Presets" button

### Replaying Previous Requests
1. Click on any item in the "Request History" panel
2. The form will be populated with the selected request's parameters
3. Click "Send Request" to re-execute the API call

## Adding New Endpoints

New endpoints can be added by editing the `api-endpoints.js` file. Each endpoint should include:

- A unique ID
- Display name
- Path
- HTTP method
- Input fields with types, validation rules, and default values

Example:
```javascript
{
  id: "getUser",
  name: "Get User by ID",
  path: "/users/:userId",
  method: "GET",
  fields: [
    { id: "userId", label: "User ID:", type: "text", placeholder: "User ID", required: true }
  ]
}
```

## Technologies Used
- Vanilla JavaScript (no external frameworks)
- JSONEditor for enhanced JSON editing
- LocalStorage for persisting settings and history

## Prerequisites

1. The backend server must be running (`npm start` or `npm run dev`).

## Development Notes

- This UI is intended for internal developer use only, not for production or end-user facing scenarios.
- The UI leverages vanilla JavaScript with no external dependencies to keep it simple.
- The simplified authentication approach is designed for development/testing and shouldn't be used in production.
- All API calls are made through the browser's fetch API to your Express backend.

## Adding More Endpoints

To add tests for more endpoints:

1. **HTML (`index.html`):** Add a new `div` with class `endpoint` within the appropriate `.api-section`. Include labels, inputs/textareas, and a button with a unique ID.
2. **JavaScript (`script.js`):** Add a new event listener targeting the button's ID. Inside the listener, retrieve input values, construct the request body/endpoint path, and call the `makeApiCall` function. 