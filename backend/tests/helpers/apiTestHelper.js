/**
 * API Test Helper
 *
 * Common utilities for API testing with real external services.
 * 
 * IMPORTANT: This file uses testConfig.js to avoid circular dependencies
 * with loadEnv.js and other test setup files.
 */
import { randomUUID } from 'crypto';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getTestConfig, hasRequiredVars } from '../config/testConfig.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Silence the console.log during test start
console.log('API Test Helper: Initializing...');

// Get configuration from testConfig.js
const config = getTestConfig();

// Create Supabase client directly for testing using config from testConfig.js
const supabaseClient = createClient(
    config.supabase.url,
    config.supabase.serviceKey || config.supabase.anonKey
);

/**
 * Generate a unique test identifier for isolating test data
 * @returns {string} A UUID prefixed with "test-"
 */
function generateTestId() {
    return `test_${uuidv4().slice(0, 8)}`;
}

/**
 * Verify Supabase connectivity with proper error handling
 * This is a reliable method to test connection without requiring specific tables
 * @param {Object} [client] - Optional Supabase client to use (uses default if not provided)
 * @returns {Promise<boolean>} True if connected successfully, throws error otherwise
 */
async function verifySupabaseConnection(client = supabaseClient) {
    try {
        // Try a simple query that should work even if there are no tables
        // We use a table that should exist in most Supabase instances
        const { data, error } = await client
            .from('challenges')
            .select('id')
            .limit(1);
            
        // If we get an error about the table not existing, 
        // that's still a successful connection
        if (error && error.code === 'PGRST301') {
            console.log('Table does not exist, but Supabase connection successful');
            return true;
        }
        
        // For any other errors, throw with details
        if (error) {
            throw new Error(`Supabase connection failed: ${error.message} (${error.code})`);
        }
        
        // Connection successful
        return true;
    } catch (error) {
        console.error('Supabase connection verification failed:', error);
        throw error;
    }
}

/**
 * Create a test user with Supabase Auth and database entry
 * @returns {Promise<Object>} Created test user data including auth credentials
 */
const setupTestUser = async () => {
    // Before creating test user, verify Supabase connection
    await verifySupabaseConnection();
    
    // Use the existing test user instead of creating a new one
    const testUser = {
        id: 'a46bfa50-d4a1-408c-bbcc-faed77fc7d2a',
        userId: 'a46bfa50-d4a1-408c-bbcc-faed77fc7d2a', // Added for compatibility
        email: 'testuser@test.com',
        password: 'Test1234!',
        full_name: 'Test User',
        professional_title: 'Software Engineer',
        location: 'San Francisco',
        country: 'USA',
        focus_area: 'Testing'
    };
    
    // Get fresh auth token
    try {
        const token = await getAuthToken(testUser.email, testUser.password);
        testUser.token = token;
    } catch (error) {
        console.error('Failed to get auth token for test user:', error);
    }
    
    console.log(`Using existing test user: ${testUser.id}`);
    return testUser;
};

/**
 * Get an auth token for a test user
 * @param {string} email - Test user email
 * @param {string} password - Test user password
 * @returns {Promise<string>} JWT auth token
 */
async function getAuthToken(email, password) {
    if (email === 'testuser@test.com') {
        // Get a fresh token by authenticating with the known credentials
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) {
                console.error('Error signing in:', error);
                throw error;
            }
            console.log('Obtained fresh auth token for test user');
            return data.session.access_token;
        }
        catch (err) {
            console.error('Exception getting auth token:', err);
            throw err;
        }
    }
    else {
        // For other users, use the standard flow
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) {
                console.error('Error signing in:', error);
                throw error;
            }
            return data.session.access_token;
        }
        catch (err) {
            console.error('Exception getting auth token:', err);
            throw err;
        }
    }
}

/**
 * Delete test user and all related data
 * @param {string} userId - ID of the test user to clean up
 */
async function cleanupTestUser(userId) {
    // In this scenario, we don't want to actually delete the test user
    console.log(`Skipping cleanup for test user: ${userId}`);
    return;
}

/**
 * Make authenticated API request
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} options.endpoint - API endpoint path
 * @param {Object} options.data - Request body data
 * @param {string} options.token - Auth token
 * @param {string} options.baseUrl - Custom base URL (optional)
 * @returns {Promise<Object>} API response
 */
async function apiRequest(options) {
    try {
        // Handle both object parameter style and legacy parameter style
        let method, endpoint, data, token, baseUrl;
        
        if (typeof options === 'object' && options !== null) {
            // New style with options object
            method = options.method || 'GET';
            endpoint = options.endpoint || '';
            data = options.data || null;
            token = options.token || null;
            baseUrl = options.baseUrl || getTestConfig().api.baseUrl;
        } else if (arguments.length >= 2) {
            // Legacy style with individual parameters
            method = arguments[0] || 'GET';
            endpoint = arguments[1] || '';
            data = arguments[2] || null;
            token = arguments[3] || null;
            baseUrl = getTestConfig().api.baseUrl;
        } else {
            throw new Error('Invalid parameters for apiRequest');
        }
        
        const config = {
            headers: {}
        };
        
        // Add auth token if provided
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // If it's a data request, set content type
        if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put' || method.toLowerCase() === 'patch')) {
            config.headers['Content-Type'] = 'application/json';
        }
        
        // Normalize endpoint - ensure it starts with / if not empty
        if (endpoint && !endpoint.startsWith('/')) {
            endpoint = '/' + endpoint;
        }
        
        // Create the full URL
        const url = `${baseUrl}${endpoint}`;
        
        console.log(`Making API request to: ${url}`);
        
        let response;
        switch (method.toUpperCase()) {
            case 'GET':
                response = await axios.get(url, config);
                break;
            case 'POST':
                response = await axios.post(url, data, config);
                break;
            case 'PUT':
                response = await axios.put(url, data, config);
                break;
            case 'PATCH':
                response = await axios.patch(url, data, config);
                break;
            case 'DELETE':
                response = await axios.delete(url, config);
                break;
            default:
                throw new Error(`Unsupported HTTP method: ${method}`);
        }
        return response;
    }
    catch (error) {
        // Return the error response if available
        if (error.response) {
            return error.response;
        }
        throw error;
    }
}

/**
 * Set up an API client for E2E testing
 * Creates a test user, gets an auth token, and creates a configured axios instance
 * @returns {Promise<Object>} Object containing apiClient, testUser, and authToken
 */
async function setupApiClient() {
    try {
        const configData = getTestConfig();
        
        // Verify Supabase credentials are available
        if (!configData.supabase.url || !configData.supabase.serviceKey && !configData.supabase.anonKey) {
            console.error('Missing Supabase credentials in test environment');
            throw new Error('Missing Supabase credentials. Make sure .env.test is loaded correctly.');
        }
        // Set up test user
        const testUser = await setupTestUser();
        // Get auth token
        const authToken = await getAuthToken(testUser.email, testUser.password);
        console.log('Auth token obtained successfully');
        // Create axios instance with auth headers
        const baseURL = configData.api.baseUrl;
        const apiClient = axios.create({
            baseURL,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return {
            apiClient,
            testUser,
            authToken
        };
    }
    catch (error) {
        console.error('Error setting up API client:', error);
        throw error;
    }
}

export {
    generateTestId,
    verifySupabaseConnection,
    setupTestUser,
    getAuthToken,
    cleanupTestUser,
    apiRequest,
    setupApiClient,
    hasRequiredVars
};
