# AI Backend Game - Admin UI

The Admin UI is a powerful tool for managing and testing the AI Backend Game. It provides two modes to accommodate both developers and non-technical users.

## Quick Start Guide

1. **Start the server**:
   ```bash
   cd admin
   npm install
   npm start
   ```

2. **Access the UI**:
   Open your browser and go to: http://localhost:8080

3. **Switch to Simple Mode**:
   Click the "Switch to Simple Mode" button in the header.
   
4. **Choose a Category and Flow**:
   - Select a category from the sidebar (e.g., "Authentication")
   - Pick a pre-configured flow 
   - Follow the step-by-step instructions

## Features

- **Developer Mode**: Advanced interface with full control over API calls, request formatting, and raw response viewing
- **Simple Mode**: User-friendly interface with guided flows, step-by-step instructions, and simplified forms
- **Status Monitoring**: Visual indicators for system health and dependencies
- **Log Viewing**: Detailed frontend and backend logs with filtering capabilities
- **Variable Management**: Ability to extract and reuse variables from API responses

## Getting Started

1. Navigate to the admin directory
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open your browser at `http://localhost:8080`

## Using Developer Mode

Developer Mode provides full control and visibility into the API:

- **Flow Management**: Create, edit, and organize complex API request flows
- **Request Builder**: Manually construct requests with headers, params, and JSON body
- **Response Viewer**: Inspect raw responses with detailed headers and status codes
- **Domain State**: Examine the complete application state

This mode is intended for developers who need detailed control and understanding of the API.

## Using Simple Mode

Simple Mode provides a guided, user-friendly experience:

- **Step-by-Step Flows**: Pre-configured sequences of API calls organized by category
- **Simplified Forms**: Easy-to-understand input fields with helpful descriptions
- **Guided Testing**: Clear instructions for each step of the testing process
- **User-Friendly Error Messages**: Helpful explanations when something goes wrong

To switch to Simple Mode, click the "Switch to Simple Mode" button in the top-right corner of the interface.

### Flow Categories

The Simple Mode organizes flows into logical categories:

- **Authentication**: User registration, login, and token management
- **User Management**: Creating and managing user profiles
- **Challenges**: Working with game challenges and puzzles
- **Game Flow**: Game progression and state management
- **System**: System health, status, and configuration

## Development

If you need to extend or modify the Admin UI, the codebase is organized as follows:

- `/js/controllers`: Core application controllers
- `/js/modules`: Functional modules for different aspects of the app
- `/js/components`: UI components and renderers
- `/js/utils`: Utility functions
- `/js/types`: TypeScript type definitions

The user-friendly interface is implemented using:

- `UserFriendlyFlowManager`: Manages categorized flows for non-technical users
- `UserFriendlyUI`: Renders the simplified UI components

## Contributing

If you're adding new features, please ensure they work in both Developer and Simple modes, providing appropriate interfaces for each user type. 