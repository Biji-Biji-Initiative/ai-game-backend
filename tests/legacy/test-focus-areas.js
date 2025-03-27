/**
 * Focus Area Generation Test Script (New Architecture)
 * 
 * This script tests the focus area generation functionality using
 * the new domain-driven design architecture.
 * 
 * Run with: node tests/focus-areas/test-focus-areas.js
 */

// Import required modules
console.log('Loading dependencies...');
require('dotenv').config();

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set.');
  console.error('Please set it in your .env file or environment variables.');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('ERROR: Missing Supabase configuration.');
  console.error('Please set SUPABASE_URL and SUPABASE_KEY in your .env file.');
  process.exit(1);
}

// Set log level to DEBUG
process.env.LOG_LEVEL = 'debug';

console.log('OPENAI_API_KEY is set and starts with:', process.env.OPENAI_API_KEY.substring(0, 5) + '...');
console.log('SUPABASE_URL is set to:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY is set and starts with:', process.env.SUPABASE_KEY.substring(0, 5) + '...');

// Import core services and models
console.log('Importing focus area modules...');
let focusAreaService, FocusArea, focusAreaGenerationService, focusAreaThreadService;

try {
  focusAreaService = require('../../src/services/focusAreaService');
  FocusArea = require('../../src/core/focusArea/models/FocusArea');
  focusAreaGenerationService = require('../../src/core/focusArea/services/focusAreaGenerationService');
  focusAreaThreadService = require('../../src/core/focusArea/services/focusAreaThreadService');
  console.log('Focus area modules imported successfully');
} catch (error) {
  console.error('Error importing focus area modules:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

// Test user data
const testUser = {
  id: `test-${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  personality_traits: {
    analyticalThinking: 0.85,
    creativity: 0.70,
    empathy: 0.60,
    riskTaking: 0.50,
    adaptability: 0.75
  },
  ai_attitudes: {
    trust: 0.60,
    jobConcerns: 0.75,
    interest: 0.80,
    knowledge: 0.65
  },
  professional_title: 'Software Developer',
  location: 'San Francisco'
};

console.log('Test user created:', testUser.id);

// Test functions
async function testCoreDomainModel() {
  console.log('\n==== TESTING FOCUS AREA DOMAIN MODEL ====');
  
  try {
    const focusArea = new FocusArea({
      userId: testUser.id,
      name: 'Effective Technical Communication',
      description: 'Improve ability to explain complex technical concepts',
      priority: 1,
      metadata: {
        improvementStrategies: [
          'Practice explaining code to non-technical audience',
          'Create documentation with clear analogies'
        ]
      }
    });
    
    console.log('Focus area created successfully:', focusArea.name);
    console.log('Focus area object:', focusArea.toObject());
    
    return { success: true, message: 'Domain model test passed' };
  } catch (error) {
    console.error('Error testing domain model:', error);
    return { success: false, error };
  }
}

async function testThreadService() {
  console.log('\n==== TESTING FOCUS AREA THREAD SERVICE ====');
  
  try {
    const threadId = await focusAreaThreadService.createThread(testUser.id);
    console.log('Thread created successfully:', threadId);
    
    // Update test user
    testUser.focus_area_thread_id = threadId;
    
    const lastResponse = await focusAreaThreadService.getLastResponseId(threadId);
    console.log('Initial last response ID (should be null):', lastResponse);
    
    return { success: true, threadId };
  } catch (error) {
    console.error('Error testing thread service:', error);
    return { success: false, error };
  }
}

async function testGenerationService() {
  console.log('\n==== TESTING FOCUS AREA GENERATION SERVICE ====');
  
  if (!testUser.focus_area_thread_id) {
    console.error('No thread ID available. Please run the thread service test first.');
    return { success: false, error: new Error('Missing thread ID') };
  }
  
  try {
    console.log('Calling OpenAI API via focusAreaGenerationService...');
    const focusAreas = await focusAreaGenerationService.generateFocusAreas(
      testUser,
      [], // Empty challenge history
      {}, // Empty progress data
      {
        threadId: testUser.focus_area_thread_id,
        temperature: 0.9,
        forceRefresh: true // Force API call even if cached
      }
    );
    
    console.log('Focus areas generated successfully. Count:', focusAreas.length);
    focusAreas.forEach((area, index) => {
      console.log(`\n${index + 1}. ${area.name}`);
      console.log(`   Priority: ${area.priority}`);
      if (area.description) {
        console.log(`   Description: ${area.description}`);
      }
    });
    
    return { success: true, focusAreas };
  } catch (error) {
    console.error('Error testing generation service:', error);
    console.error('Stack trace:', error.stack);
    return { success: false, error };
  }
}

async function testMainService() {
  console.log('\n==== TESTING MAIN FOCUS AREA SERVICE ====');
  
  try {
    // This should create a thread if needed
    let threadId = testUser.focus_area_thread_id;
    if (!threadId) {
      threadId = await focusAreaService.createFocusAreaThread(testUser.id);
      testUser.focus_area_thread_id = threadId;
      console.log('Thread created:', threadId);
    }
    
    // Get focus areas with force refresh to ensure API call
    console.log('Calling OpenAI API via focusAreaService...');
    const focusAreas = await focusAreaService.getFocusAreas(testUser.id, { forceRefresh: true });
    
    console.log('Focus areas retrieved successfully. Count:', focusAreas.length);
    focusAreas.forEach((area, index) => {
      console.log(`${index + 1}. ${area}`);
    });
    
    return { success: true, focusAreas };
  } catch (error) {
    console.error('Error testing main service:', error);
    console.error('Stack trace:', error.stack);
    return { success: false, error };
  }
}

// Run tests
async function runTests() {
  const results = {
    domainModel: await testCoreDomainModel(),
    threadService: await testThreadService(),
    generationService: await testGenerationService(),
    mainService: await testMainService()
  };
  
  console.log('\n==== TEST RESULTS ====');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${test}: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    if (!result.success) {
      console.log(`  Error: ${result.error.message}`);
    }
  });
  
  const allPassed = Object.values(results).every(r => r.success);
  return { success: allPassed, results };
}

// Run all tests
console.log('Starting tests...');
runTests()
  .then(result => {
    if (result.success) {
      console.log('\nAll tests passed! 🎉');
      process.exit(0);
    } else {
      console.log('\nSome tests failed. 😢');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\nUnhandled exception in tests:', err);
    process.exit(1);
  }); 