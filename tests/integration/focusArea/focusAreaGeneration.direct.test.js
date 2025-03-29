/**
 * Focus Area Direct OpenAI Integration Test
 * 
 * Tests direct integration with OpenAI Responses API for focus area generation.
 * This test bypasses the prompt builder to directly test OpenAI connectivity.
 */

const { expect } = require('chai');
const { OpenAIClient } = require('../../src/infra/openai');
const { MessageRole } = require('../../src/infra/openai/types');


const testEnv = require('../../loadEnv');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
// Set longer timeout for external API calls
const TEST_TIMEOUT = 60000;

describe('Focus Area OpenAI Responses API Integration', function() {
  
  
  // Set longer timeout for API calls
  this.timeout(30000);

  before(function() {
    skipIfMissingEnv(this, 'openai');
  });

  // Configure longer timeout for API calls
  this.timeout(TEST_TIMEOUT);
  
  let openAIClient;
  
  before(function() {
    // Skip tests if OpenAI API key is not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      console.warn('OPENAI_API_KEY not found, skipping integration tests');
      this.skip();
    }
    
    // Initialize the real OpenAI client
    openAIClient = new OpenAIClient({
      apiKey: testEnv.getTestConfig().openai.apiKey
    });
  });
  
  it('should generate focus area recommendations via direct Responses API call', async function() {
    // Create messages for the Responses API
    const systemInstructions = `You are an AI learning strategist specializing in personalized focus area recommendations for AI communication skills. 
The user is at the beginning of their learning journey. Recommend foundational focus areas.
Your focus area recommendations should be specific, actionable, and personalized to the user's context.
Include a clear rationale for each focus area and practical strategies for improvement.
Your response MUST be a valid JSON with a "focusAreas" array.`;

    // Create a prompt for focus area generation
    const userPrompt = `Please generate 2 focus area recommendations for me based on this profile:
      
Professional Title: Product Manager
Personality Traits: 
- Openness: 0.8 (high)
- Conscientiousness: 0.7 (moderate-high)
- Extraversion: 0.5 (moderate)
- Agreeableness: 0.6 (moderate)
- Neuroticism: 0.3 (low)

AI Attitudes:
- Optimism: 0.7 (moderate-high)
- Concern: 0.4 (moderate-low)
- Engagement: 0.8 (high)

Location: San Francisco

Please return 2 focus areas in this JSON format:
{
  "focusAreas": [
    {
      "name": "Focus Area Name",
      "description": "Detailed description of the focus area",
      "priorityLevel": "high|medium|low",
      "rationale": "Why this focus area is recommended for the user",
      "improvementStrategies": [
        "Strategy 1",
        "Strategy 2",
        "Strategy 3"
      ]
    }
  ]
}`;
    
    // Call the Responses API with correct format for the latest API
    const options = {
      model: 'gpt-4o',
      temperature: 0.7,
      responseFormat: 'json',
    };
    
    // Use sendJsonMessage which handles the Responses API format
    const response = await openAIClient.sendJsonMessage([
      { role: MessageRole.SYSTEM, content: systemInstructions },
      { role: MessageRole.USER, content: userPrompt }
    ], options);
    
    // Verify the response structure
    expect(response).to.exist;
    expect(response.data).to.exist;
    expect(response.data.focusAreas).to.be.an('array').with.lengthOf(2);
    
    // Verify each focus area
    for (const focusArea of response.data.focusAreas) {
      expect(focusArea.name).to.be.a('string').and.not.empty;
      expect(focusArea.description).to.be.a('string').and.not.empty;
      expect(focusArea.priorityLevel).to.be.oneOf(['high', 'medium', 'low']);
      expect(focusArea.rationale).to.be.a('string').and.not.empty;
      expect(focusArea.improvementStrategies).to.be.an('array').with.lengthOf.at.least(2);
      
      // Log the focus area details
      console.log(`\nFocus Area: ${focusArea.name}`);
      console.log(`Priority: ${focusArea.priorityLevel}`);
      console.log(`Description: ${focusArea.description.substring(0, 100)}...`);
    }
  });
}); 