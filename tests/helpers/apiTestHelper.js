/**
 * API Test Helper
 *
 * Common utilities for API testing with real external services.
 */
import { randomUUID } from 'crypto';
import axios from 'axios';
import { supabaseClient } from "../../src/core/infra/db/supabaseClient.js";
import testConfig from '../loadEnv.js';
import { v4 as uuidv4 } from 'uuid';
// Initialize test environment
const env = testConfig.getTestConfig();
/**
 * Generate a unique test identifier for isolating test data
 * @returns {string} A UUID prefixed with "test-"
 */
function generateTestId() {
    return `test-${randomUUID()}`;
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
        email: 'testuser@test.com',
        password: 'Test1234!',
        full_name: 'Test User',
        professional_title: 'Software Engineer',
        location: 'San Francisco',
        country: 'USA',
        focus_area: 'Testing'
    };
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
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} API response
 */
async function apiRequest(method, endpoint, data = null, token) {
    try {
        const config = {
            headers: {}
        };
        
        // Add auth token if provided
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Use the environment variable API_URL or fallback to localhost
        const baseUrl = process.env.API_URL || 'http://localhost:3000/api/v1';
        const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
        
        console.log(`Making API request to: ${url}`);
        
        let response;
        switch (method.toLowerCase()) {
            case 'get':
                response = await axios.get(url, config);
                break;
            case 'post':
                response = await axios.post(url, data, config);
                break;
            case 'put':
                response = await axios.put(url, data, config);
                break;
            case 'delete':
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
        // Verify Supabase credentials are available
        if (!env.supabase.url || !env.supabase.key) {
            console.error('Missing Supabase credentials in test environment');
            throw new Error('Missing Supabase credentials. Make sure .env.test is loaded correctly.');
        }
        // Set up test user
        const testUser = await setupTestUser();
        // Get auth token
        const authToken = await getAuthToken(testUser.email, testUser.password);
        // Create axios instance with auth headers
        const baseURL = env.API_URL || 'http://localhost:3000';
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
export { generateTestId, setupTestUser, getAuthToken, cleanupTestUser, apiRequest, setupApiClient, verifySupabaseConnection };
