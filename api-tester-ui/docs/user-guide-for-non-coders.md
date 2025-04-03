# API Tester UI - User Guide for Non-Coders

This guide is designed for users with little to no programming experience who want to test and interact with APIs using the API Tester UI.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Understanding the Interface](#understanding-the-interface)
4. [Working with Flows and Steps](#working-with-flows-and-steps)
5. [Variables and How to Use Them](#variables-and-how-to-use-them)
6. [Authentication](#authentication)
7. [Interpreting API Responses](#interpreting-api-responses)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)
9. [Advanced Features](#advanced-features)
10. [Glossary of Terms](#glossary-of-terms)

## Introduction

An API (Application Programming Interface) is like a messenger that takes your request to a system, tells the system what you want to do, and then returns the system's response back to you. APIs make it possible for different applications to talk to each other.

The API Tester UI is a tool that helps you interact with APIs without writing code. It provides a visual interface to send requests to an API and view the responses.

## Getting Started

### First Visit

When you first open the API Tester UI, you'll see a welcome message with some quick tips. Take a moment to read these as they provide useful information for getting started.

### Setting Up

1. **Login**: Click the "Login" button in the top-right corner to create an account or sign in.
2. **Settings**: Click the gear icon to access settings where you can configure the application.
3. **Change Theme**: Use the theme toggle button to switch between light and dark modes based on your preference.

## Understanding the Interface

The API Tester UI interface is divided into several sections:

### Header
* **Title**: Shows the application name
* **Theme Toggle**: Switch between light and dark modes
* **Login Button**: Access authentication features
* **Settings Button**: Configure application settings

### Sidebar
* **Flows List**: Shows available test flows (groups of related API calls)
* **Variables Panel**: Displays extracted variables from previous API responses
* **Domain State**: Shows the current state of your application domain

### Main Content Area
* **Steps Panel**: Shows the steps in the current flow
* **Step Details**: Shows details for the currently selected step
* **Response Viewer**: Displays API responses

## Working with Flows and Steps

A "flow" is a sequence of API calls that work together to accomplish a task. Each flow contains "steps" which are individual API calls.

### Selecting a Flow

1. Click on a flow name in the sidebar to select it
2. The steps for that flow will appear in the Steps Panel

### Working with Steps

1. **View Step Details**: Click on a step to see its details
2. **Configure Parameters**: Fill in the required fields for the step
3. **Run Step**: Click the "Run" button next to the step to execute it
4. **View Results**: The response will appear in the Response Viewer

### Running Multiple Steps

1. **Run All Steps**: Click the "Run All Steps" button to execute all steps in sequence
2. **Clear Results**: Click "Clear Results" to reset the step responses

## Variables and How to Use Them

Variables allow you to store and reuse data from API responses in subsequent requests.

### How Variables Work

1. When you receive a response from an API, important values are automatically extracted and stored as variables
2. Variables are shown in the Variables Panel in the sidebar
3. You can use these variables in your API requests by typing `${variableName}`

### Example

If an API response contains a user ID:
```json
{
  "user": {
    "id": "12345",
    "name": "John"
  }
}
```

A variable named `user.id` with value `12345` will be created.

To use this variable in another step, type `${user.id}` in a field where you need the user ID.

## Authentication

Many APIs require authentication to access their resources. The API Tester UI supports different authentication methods:

### Login with Email/Password

1. Click the "Login" button in the header
2. Enter your email and password
3. Click "Login"

### Login with Supabase

1. Click the "Login" button in the header
2. Click the "Supabase" button
3. Follow the authentication flow

### Using Authentication Tokens

Once logged in, your authentication token is automatically added to API requests. You don't need to manually add it to your requests.

## Interpreting API Responses

After executing an API request, you'll see the response in the Response Viewer:

### Response Status

* **Green (200-299)**: Success - The request was processed successfully
* **Red (400-499)**: Client Error - There's a problem with your request
* **Red (500-599)**: Server Error - There's a problem with the API server

### Common Status Codes

* **200 OK**: Request succeeded
* **201 Created**: Resource was successfully created
* **400 Bad Request**: The request has invalid parameters
* **401 Unauthorized**: Authentication is required or failed
* **403 Forbidden**: You don't have permission to access the resource
* **404 Not Found**: The requested resource doesn't exist
* **500 Internal Server Error**: An error occurred on the server

### Response Body

The response body contains the data returned by the API. It's usually in JSON format (a structured way to organize data). The Response Viewer formats this data to make it easier to read.

## Troubleshooting Common Issues

### API Request Fails

1. **Check Authentication**: Make sure you're logged in if the API requires authentication
2. **Check Parameters**: Ensure all required parameters are filled correctly
3. **Check API URL**: Verify the API base URL in settings
4. **Network Issues**: Check your internet connection
5. **Server Issues**: The API server might be down, try again later

### "Variable Not Found" Error

If you see `${variableName}` in your response instead of the actual value:
1. Check if the variable exists in the Variables Panel
2. Make sure you've executed the step that creates this variable
3. Verify the spelling of the variable name

## Advanced Features

### Debug Mode

1. Go to Settings > Advanced
2. Enable "Debug Mode"
3. Open your browser's developer console (usually by pressing F12)
4. You'll now see detailed logs of API requests and responses

### Changing API Base URL

1. Go to Settings > General
2. Update the "API Base URL" field
3. Click "Save Settings"

### Working with Supabase

1. Go to Settings > Supabase
2. Enter your Supabase project URL and API key
3. Click "Save Configuration"
4. Click "Test Connection" to verify

## Glossary of Terms

* **API**: Application Programming Interface - a way for different applications to communicate
* **Endpoint**: A specific URL that represents an object or collection of objects
* **HTTP Method**: The action to perform (GET, POST, PUT, DELETE, etc.)
* **GET**: Retrieve data
* **POST**: Create new data
* **PUT/PATCH**: Update existing data
* **DELETE**: Remove data
* **JSON**: JavaScript Object Notation - a format for structuring data
* **Parameter**: Data sent with an API request
* **Query Parameter**: Data added to the URL (e.g., `?name=value`)
* **Body Parameter**: Data sent in the request body
* **Header**: Additional information sent with the request
* **Authentication**: Verifying your identity to access protected resources
* **Token**: A string that represents your authentication credentials
* **Status Code**: A number indicating the result of the request
* **Response**: The data returned by the API
* **Variable**: A named storage location for data that can be reused

---

For more help or to report issues, contact the application administrator. 