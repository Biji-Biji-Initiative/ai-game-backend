# API Tester UI

This simple web interface allows developers to manually test the AI Fight Club backend API endpoints.

## Prerequisites

1. The backend server must be running (`npm start` or `npm run dev`).

## How to Use

1. Start the backend server (e.g., `PORT=8765 npm run dev`).
2. Open your web browser and navigate to `http://localhost:8765/tester` (adjust the port number if needed).
3. **Create/Login User:** Use the "Quick User Setup" section to create a test user or login with an existing one.
   - The form is pre-filled with default test user credentials.
   - Click "Create or Login" to either create a new user (if the email doesn't exist) or login with an existing one.
   - This handles authentication automatically without requiring a separate JWT token.
4. **Fill Inputs:** Enter the required data into the relevant input fields for the endpoint you want to test.
5. **Click Button:** Click the button corresponding to the API endpoint.
6. **View Response:** The status of the request and the JSON response (or error) will appear in the "API Response" section below.

## Key Features

### Simple Test User Creation
The UI provides a one-click solution to create and authenticate test users:
- No need to manually obtain and paste JWT tokens
- Creates users directly in your database if they don't exist
- Handles authentication automatically

### Comprehensive API Coverage
The UI includes sections for all major API areas:
- Challenges
- Users
- Personality
- Focus Areas
- Progress
- Evaluations
- Adaptive Learning
- User Journey

### Smart Data Flow
The UI intelligently populates related fields to streamline testing:
- When you create/login as a user, all email fields across the UI are automatically populated
- When you generate a challenge, all challenge ID fields are updated
- JSON fields in complex requests are pre-populated with the relevant IDs

### Enhanced Request/Response Display
- Both request details and response are shown
- Auth tokens are masked for security
- Full JSON formatting for better readability
- "Clear Output" button to reset the display

## How It Works

The UI follows these steps for authentication:
1. First attempts to login with the provided credentials
2. If login fails, tries to create a new user with the credentials
3. If both approaches fail, attempts to directly create a user through available endpoints
4. Once authenticated, populates the user information in all relevant fields

## Development Notes

- This UI is intended for internal developer use only, not for production or end-user facing scenarios.
- The UI leverages vanilla JavaScript with no external dependencies to keep it simple.
- The simplified authentication approach is designed for development/testing and shouldn't be used in production.
- All API calls are made through the browser's fetch API to your Express backend.

## Adding More Endpoints

To add tests for more endpoints:

1. **HTML (`index.html`):** Add a new `div` with class `endpoint` within the appropriate `.api-section`. Include labels, inputs/textareas, and a button with a unique ID.
2. **JavaScript (`script.js`):** Add a new event listener targeting the button's ID. Inside the listener, retrieve input values, construct the request body/endpoint path, and call the `makeApiCall` function. 