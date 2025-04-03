# Token Refresh Integration Guide

This document provides guidance for implementing token refresh logic in client applications to handle JWT token expiration gracefully.

## Overview

Our API uses JWT (JSON Web Tokens) for authentication, which have the following characteristics:

- **Access tokens** are short-lived (1 hour) and provide access to protected API endpoints
- **Refresh tokens** are long-lived (1 week) and are used to obtain new access tokens when they expire
- The refresh token can be stored either as an HttpOnly cookie (web applications) or securely in the client (mobile/desktop apps)

## Token Refresh Flow

The token refresh mechanism works as follows:

1. Client makes an API request with the current access token in the Authorization header
2. If the access token is valid, the server processes the request normally
3. If the access token is expired, the server returns a `401 Unauthorized` response with the header `X-Token-Expired: true`
4. The client detects this specific response and attempts to refresh the token
5. If the refresh is successful, the client retries the original request with the new access token
6. If the refresh fails, the client redirects the user to the login page

## Implementation Guide

### 1. HTTP Client Setup

Configure your HTTP client (Axios, Fetch, etc.) to handle token refresh automatically.

#### Axios Example:

```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'https://your-api.com',
  timeout: 10000,
});

// Request interceptor - adds token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is due to an expired token
    const isExpiredToken = 
      error.response?.status === 401 && 
      error.response?.headers['x-token-expired'] === 'true' &&
      !originalRequest._retry;
      
    if (isExpiredToken) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/v1/auth/refresh', { 
          refreshToken 
        });
        
        // Store the new tokens
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Web Applications (with HttpOnly Cookies)

For web applications using HttpOnly cookies for refresh tokens:

```javascript
// Response interceptor handling
async (error) => {
  const originalRequest = error.config;
  
  // Check if the error is due to an expired token
  const isExpiredToken = 
    error.response?.status === 401 && 
    error.response?.headers['x-token-expired'] === 'true' &&
    !originalRequest._retry;
    
  if (isExpiredToken) {
    originalRequest._retry = true;
    
    try {
      // For cookie-based refresh, no need to send the refresh token in the body
      const response = await axios.post('/api/v1/auth/refresh');
      
      // Store the new access token
      const { accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      
      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return axios(originalRequest);
    } catch (refreshError) {
      // If refresh fails, redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
  
  return Promise.reject(error);
}
```

### 3. React Native / Mobile Applications

For React Native or other mobile applications:

```javascript
// Store tokens securely using something like react-native-keychain
import * as Keychain from 'react-native-keychain';

// Store tokens
async function storeTokens(accessToken, refreshToken) {
  await Keychain.setGenericPassword(
    'auth_tokens',
    JSON.stringify({ accessToken, refreshToken })
  );
}

// Get tokens
async function getTokens() {
  const credentials = await Keychain.getGenericPassword();
  if (credentials) {
    return JSON.parse(credentials.password);
  }
  return null;
}

// Clear tokens
async function clearTokens() {
  await Keychain.resetGenericPassword();
}

// In your API interceptor
async (error) => {
  const originalRequest = error.config;
  
  const isExpiredToken = 
    error.response?.status === 401 && 
    error.response?.headers['x-token-expired'] === 'true' &&
    !originalRequest._retry;
    
  if (isExpiredToken) {
    originalRequest._retry = true;
    
    try {
      const tokens = await getTokens();
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post('/api/v1/auth/refresh', { 
        refreshToken: tokens.refreshToken 
      });
      
      const { accessToken, refreshToken } = response.data.data;
      await storeTokens(accessToken, refreshToken || tokens.refreshToken);
      
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return axios(originalRequest);
    } catch (refreshError) {
      await clearTokens();
      // Handle logout/redirect based on your navigation system
      return Promise.reject(refreshError);
    }
  }
  
  return Promise.reject(error);
}
```

## Security Considerations

1. **Store access tokens** in memory or a secure storage mechanism appropriate for your platform.
2. **Store refresh tokens** in HttpOnly cookies (for web applications) or secure storage (for mobile/desktop apps).
3. **Implement token rotation** - once a refresh token is used, a new one is issued and the old one is invalidated.
4. **Set appropriate expiration times** - access tokens should be short-lived (minutes to hours), while refresh tokens can be longer-lived (days to weeks).
5. **Implement proper error handling** - redirect users to the login page when refresh fails.

## Testing Refresh Logic

To test the token refresh flow:

1. Log in to obtain initial tokens
2. Wait for the access token to expire (can be simulated by modifying the token or waiting for the expiration period)
3. Make a request that requires authentication
4. Verify that the token refresh occurs automatically and the original request succeeds

## Troubleshooting

Common issues:

- **401 errors after refresh**: Check that the new access token is being correctly applied to the original request
- **Infinite refresh loops**: Ensure the `_retry` flag is properly set and checked
- **Missing refresh token**: Verify the refresh token is being correctly stored and retrieved

Contact the backend team if you encounter persistent issues. 