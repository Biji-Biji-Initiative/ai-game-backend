/**
 * OpenAPI Response Adapter Test
 * 
 * This script tests the OpenAPI response adapter with various input formats
 * to ensure it correctly transforms responses to match the OpenAPI specs.
 */

'use strict';

import { createOpenApiResponseAdapter } from '../../src/core/infra/http/middleware/openapi/responseAdapter.js';

// Mock Express response object
function createMockResponse() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

// Mock Express request object
function createMockRequest(path = '/api/v1/focus-areas') {
  return {
    path,
    method: 'GET',
    headers: {}
  };
}

// Mock Express next function
const mockNext = () => {};

// Run tests
function runTests() {
  console.log('🧪 Testing OpenAPI Response Adapter...');
  
  // Create the middleware
  const responseAdapter = createOpenApiResponseAdapter();
  
  // Test 1: Standard success response with array data
  console.log('\nTest 1: Standard success response with array data');
  testAdapter(
    responseAdapter,
    '/api/v1/focus-areas',
    {
      success: true,
      data: [
        { id: '1', title: 'Focus Area 1' },
        { id: '2', title: 'Focus Area 2' }
      ]
    },
    res => {
      console.log('✅ Transformed response:');
      console.log(JSON.stringify(res.jsonData, null, 2));
      
      if (res.jsonData?.status !== 'success') {
        console.log('❌ FAILED: Missing status field');
      }
      
      if (!res.jsonData?.data?.focusAreas) {
        console.log('❌ FAILED: Missing focusAreas wrapper');
      }
    }
  );
  
  // Test 2: Single entity response
  console.log('\nTest 2: Single entity response');
  testAdapter(
    responseAdapter,
    '/api/v1/focus-areas/1234',
    {
      success: true,
      data: { id: '1234', title: 'Focus Area 1234' }
    },
    res => {
      console.log('✅ Transformed response:');
      console.log(JSON.stringify(res.jsonData, null, 2));
      
      if (res.jsonData?.status !== 'success') {
        console.log('❌ FAILED: Missing status field');
      }
      
      if (!res.jsonData?.data?.focusArea) {
        console.log('❌ FAILED: Missing focusArea wrapper');
      }
    }
  );
  
  // Test 3: Error response
  console.log('\nTest 3: Error response');
  const mockErrorRes = createMockResponse();
  mockErrorRes.status(404);
  
  responseAdapter(
    createMockRequest('/api/v1/focus-areas/999'),
    mockErrorRes,
    mockNext
  );
  
  mockErrorRes.json({
    success: false,
    error: 'Focus area not found'
  });
  
  console.log('✅ Transformed error response:');
  console.log(JSON.stringify(mockErrorRes.jsonData, null, 2));
  
  if (mockErrorRes.jsonData?.status !== 'error') {
    console.log('❌ FAILED: Missing status field in error response');
  }
  
  if (!mockErrorRes.jsonData?.message) {
    console.log('❌ FAILED: Missing message field in error response');
  }
  
  // Test 4: Already standardized response
  console.log('\nTest 4: Already standardized response');
  testAdapter(
    responseAdapter,
    '/api/v1/focus-areas',
    {
      status: 'success',
      data: [
        { id: '1', title: 'Focus Area 1' },
        { id: '2', title: 'Focus Area 2' }
      ]
    },
    res => {
      console.log('✅ Transformed response:');
      console.log(JSON.stringify(res.jsonData, null, 2));
      
      if (res.jsonData?.status !== 'success') {
        console.log('❌ FAILED: Missing status field');
      }
      
      if (!res.jsonData?.data?.focusAreas) {
        console.log('❌ FAILED: Missing focusAreas wrapper');
      }
    }
  );
  
  console.log('\n🎉 All tests completed!');
}

// Helper function to test the adapter
function testAdapter(adapter, path, inputData, callback) {
  const mockReq = createMockRequest(path);
  const mockRes = createMockResponse();
  
  adapter(mockReq, mockRes, mockNext);
  mockRes.json(inputData);
  
  callback(mockRes);
}

// Run the tests
runTests(); 