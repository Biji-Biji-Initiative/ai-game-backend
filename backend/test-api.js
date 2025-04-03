// Test API Endpoints
// This script tests various endpoints to verify the backend is working

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000'; // Updated port to match .env
const endpoints = [
  { url: '/api/health', method: 'GET', name: 'Health Check' },
  { url: '/api-docs', method: 'GET', name: 'API Documentation' },
  { url: '/api/v1/status', method: 'GET', name: 'API Status' }
];

async function testEndpoints() {
  console.log('Testing API Endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name} (${endpoint.method} ${endpoint.url})...`);
      const response = await fetch(`${API_URL}${endpoint.url}`, { 
        method: endpoint.method 
      });
      
      // Just log the status for now
      console.log(`Response status: ${response.status}`);
      console.log('-'.repeat(50));
    } catch (error) {
      console.error(`Error testing ${endpoint.name}:`, error.message);
      console.log('-'.repeat(50));
    }
  }
}

testEndpoints().catch(console.error); 