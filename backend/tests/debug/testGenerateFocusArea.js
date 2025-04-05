import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Get the auth config - adjust as needed
const API_URL = process.env.API_BASE_URL || 'http://localhost:3081';
const API_VERSION = process.env.API_VERSION || 'v1';
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

const ENDPOINT = `/api/${API_VERSION}/focus-areas/generate`;
const AUTH_ENDPOINT = `/api/${API_VERSION}/auth/login`;

async function getAuthToken() {
  try {
    const response = await axios.post(`${API_URL}${AUTH_ENDPOINT}`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    return response.data.data.token;
  } catch (error) {
    console.error('Error getting auth token:', error.response?.data || error.message);
    throw error;
  }
}

async function testGenerateFocusArea() {
  try {
    // Get auth token
    const token = await getAuthToken();
    console.log('✅ Auth token obtained');

    // Test case 1: Minimal request with only professionalTitle
    const requestBody1 = {
      professionalTitle: 'Software Engineer'
    };

    console.log('\n🔍 TEST CASE 1: Minimal request with only professionalTitle');
    console.log('Request:', JSON.stringify(requestBody1, null, 2));
    
    try {
      const response1 = await axios.post(`${API_URL}${ENDPOINT}`, requestBody1, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ SUCCESS - Status:', response1.status);
      console.log('Response data:', JSON.stringify(response1.data, null, 2));
    } catch (error) {
      console.error('❌ FAILED - Status:', error.response?.status);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test case 2: Request with name added manually to see if validator passes
    const requestBody2 = {
      professionalTitle: 'Software Engineer',
      name: 'Focus area for Software Engineer'
    };

    console.log('\n🔍 TEST CASE 2: Request with name added manually');
    console.log('Request:', JSON.stringify(requestBody2, null, 2));
    
    try {
      const response2 = await axios.post(`${API_URL}${ENDPOINT}`, requestBody2, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ SUCCESS - Status:', response2.status);
      console.log('Response data:', JSON.stringify(response2.data, null, 2));
    } catch (error) {
      console.error('❌ FAILED - Status:', error.response?.status);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test case 3: Complete request with all possible fields
    const requestBody3 = {
      professionalTitle: 'Software Engineer',
      interests: ['AI', 'Machine Learning', 'Web Development'],
      skills: ['JavaScript', 'Python', 'React'],
      goals: ['Learn more about AI', 'Improve coding skills']
    };

    console.log('\n🔍 TEST CASE 3: Complete request with all possible fields');
    console.log('Request:', JSON.stringify(requestBody3, null, 2));
    
    try {
      const response3 = await axios.post(`${API_URL}${ENDPOINT}`, requestBody3, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ SUCCESS - Status:', response3.status);
      console.log('Response data:', JSON.stringify(response3.data, null, 2));
    } catch (error) {
      console.error('❌ FAILED - Status:', error.response?.status);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testGenerateFocusArea(); 