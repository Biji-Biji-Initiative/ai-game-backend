/**
 * DEPRECATED - THIS TEST HAS BEEN MOVED
 * 
 * This test has been replaced by a proper test in:
 * tests/integration/responses-api/focusArea.responses-api.test.js
 * 
 * Please use that test instead of this one.
 */

/**
 * Test script to verify the actual OpenAI client implementation
 * in our source code is using the Responses API correctly.
 * 
 * This uses REAL user data and dynamic system prompts to match the
 * production implementation.
 */
require('dotenv').config();
process.env.NODE_ENV = 'test'; // Enable mock mode for dependencies

// Import the actual implementation from the source code
const { OpenAIClient } = require('./src/infra/openai');
const config = require('./src/infra/openai/config');
const FocusAreaGenerationService = require('./src/core/focusArea/services/focusAreaGenerationService');
const { MessageRole } = require('./src/infra/openai/config');
const promptBuilder = require('./src/core/prompt/promptBuilder');

// Import or create a mock FocusArea class
const FocusArea = class FocusArea {
  constructor(data) {
    Object.assign(this, data);
  }
};

async function testActualFocusAreaGeneration() {
  console.log('Testing the REAL focus area generation with Responses API...');
  
  try {
    // Initialize our own client with the OpenAI API key
    const openAIClient = new OpenAIClient({
      config,
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('Client initialized, using API key:', 
      process.env.OPENAI_API_KEY ? 
      process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 
      'Not set'
    );
    
    // Create the actual focus area generation service with the real dependencies
    const focusAreaGenerationService = new FocusAreaGenerationService({
      openAIClient,
      promptBuilder,
      FocusArea,
      MessageRole
    });
    
    console.log('Focus Area Generation Service created with actual implementation');
    
    // Real user data with personality traits and AI attitudes
    const realUserData = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      personality_traits: {
        openness: 78,
        conscientiousness: 65,
        extraversion: 52,
        agreeableness: 70,
        neuroticism: 45
      },
      ai_attitudes: {
        trust: 72,
        autonomy: 64,
        transparency: 85
      },
      professional_title: 'Product Manager',
      location: 'San Francisco'
    };
    
    // Challenge history (to show improvement areas)
    const challengeHistory = [
      {
        id: 'challenge-1',
        type: 'communication',
        title: 'Explain AI Ethics to Non-Technical Audience',
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        score: 85
      },
      {
        id: 'challenge-2',
        type: 'strategic-thinking',
        title: 'AI Implementation Strategy',
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        score: 72
      }
    ];
    
    // Progress data to influence recommendations
    const progressData = {
      totalChallenges: 8,
      avgScore: 76,
      weakAreas: ['technical-depth', 'stakeholder-communication'],
      strongAreas: ['ethical-reasoning', 'policy-understanding']
    };
    
    console.log('Generating focus areas with REAL user data and dynamic prompts...');
    
    // Call the actual focus area generation service with real data
    const focusAreas = await focusAreaGenerationService.generateFocusAreas(
      realUserData,
      challengeHistory,
      progressData,
      { 
        threadId: 'test-thread-id',
        count: 2,
        temperature: 0.8
      }
    );
    
    console.log('Focus areas generated successfully!');
    console.log(`Generated ${focusAreas.length} focus areas`);
    
    // Display the generated focus areas
    focusAreas.forEach((area, index) => {
      console.log(`\n--- Focus Area ${index + 1}: ${area.name} ---`);
      console.log(`Description: ${area.description.substring(0, 100)}...`);
      console.log(`Priority: ${area.priority}`);
      console.log(`Metadata:`, JSON.stringify(area.metadata, null, 2));
    });
    
    console.log('\nTest completed successfully!');
    return focusAreas;
  } catch (error) {
    console.error('Error testing focus area generation:', error.message);
    console.error(error.stack);
  }
}

// Don't run the test automatically, since it's deprecated
// testActualFocusAreaGeneration(); 