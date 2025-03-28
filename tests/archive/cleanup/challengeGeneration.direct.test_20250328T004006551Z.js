/**
 * Challenge Generation Direct OpenAI Test
 * 
 * Tests direct integration with OpenAI Responses API for challenge generation.
 * This test bypasses any services to directly test the API connectivity.
 */

const { expect } = require('chai');
const { OpenAIClient } = require('../../../../src/infra/openai');
const { MessageRole } = require('../../../../src/infra/openai/types');


const testEnv = require('../loadEnv');

const { skipIfMissingEnv } = require('../../tests/helpers/testHelpers');
// Set longer timeout for external API calls
const TEST_TIMEOUT = 60000;

describe('Challenge Generation Direct OpenAI Test', function() {
  
  
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
      console.warn('OPENAI_API_KEY not found, skipping direct API tests');
      this.skip();
    }
    
    // Initialize the real OpenAI client
    openAIClient = new OpenAIClient({
      apiKey: testEnv.getTestConfig().openai.apiKey
    });
  });
  
  it('should generate a challenge directly from OpenAI', async function() {
    // Create the system message
    const systemMessage = `You are an expert educational content creator specializing in AI and technology.
Create challenges that test understanding and application of AI concepts.
Return your response as a JSON object with these fields:
- title: string - The challenge title
- description: string - Brief overview of what the challenge is about
- content: object - The actual challenge content with scenario and questions array
- difficulty: string - The difficulty level (beginner, intermediate, advanced)
- focusArea: string - The focus area of the challenge
- learningObjectives: array - 2-4 learning objectives for this challenge
- keywords: array - 3-7 relevant keywords`;

    // Create the user message
    const userMessage = `Please create an intermediate level challenge about AI Ethics.

The challenge should be a case study that requires critical thinking.
It should include a realistic scenario and 2-3 questions that test understanding and application.
Be specific and provide enough context in the scenario for someone to give a thoughtful response.

For questions, please format them as an array of objects with structure:
{
  "questions": [
    {
      "text": "Question text here"
    }
  ]
}`;
    
    // Send the request to OpenAI
    const response = await openAIClient.sendJsonMessage([
      { role: MessageRole.SYSTEM, content: systemMessage },
      { role: MessageRole.USER, content: userMessage }
    ], {
      model: 'gpt-4o',
      temperature: 0.7,
      responseFormat: 'json'
    });
    
    // Verify the response structure
    expect(response).to.exist;
    expect(response.data).to.be.an('object');
    
    // Log some response details
    console.log(`\nGenerated Challenge: ${response.data.title}`);
    console.log(`Description: ${response.data.description}`);
    
    // Verify the challenge structure
    expect(response.data.title).to.be.a('string').and.not.empty;
    expect(response.data.description).to.be.a('string').and.not.empty;
    expect(response.data.content).to.be.an('object');
    expect(response.data.difficulty).to.be.a('string');
    expect(response.data.focusArea).to.be.a('string');
    expect(response.data.learningObjectives).to.be.an('array').with.lengthOf.at.least(1);
    expect(response.data.keywords).to.be.an('array').with.lengthOf.at.least(1);
    
    // Verify the content structure
    expect(response.data.content.scenario).to.be.a('string').and.not.empty;
    expect(response.data.content.questions).to.be.an('array').with.lengthOf.at.least(1);
    
    // Verify the questions - adapt to the actual format returned
    for (const question of response.data.content.questions) {
      expect(question).to.be.an('object');
      expect(question.text).to.be.a('string').and.not.empty;
    }
  });
  
  it('should generate a challenge with a different focus area', async function() {
    // Define focus area to test
    const focusArea = 'Machine Learning';
    
    // Create the system message
    const systemMessage = `You are an expert educational content creator specializing in ${focusArea}.
Create challenges that test understanding and application of concepts in this area.
Return your response as a JSON object with these fields:
- title: string - The challenge title
- description: string - Brief overview of what the challenge is about
- content: object - With scenario and questions
- difficulty: string - The difficulty level (beginner)
- focusArea: string - The focus area "${focusArea}"
- learningObjectives: array - Learning objectives
- keywords: array - Relevant keywords`;

    // Create the user message
    const userMessage = `Please create a beginner level challenge about ${focusArea}.
It should include a scenario and questions that test basic understanding.`;
    
    // Send the request to OpenAI
    const response = await openAIClient.sendJsonMessage([
      { role: MessageRole.SYSTEM, content: systemMessage },
      { role: MessageRole.USER, content: userMessage }
    ], {
      model: 'gpt-4o',
      temperature: 0.7,
      responseFormat: 'json'
    });
    
    // Verify the response contains the requested focus area
    // First ensure we have data before checking
    expect(response.data).to.be.an('object');
    
    // Check if focusArea exists and contains our search term
    if (response.data.focusArea) {
      expect(response.data.focusArea.toLowerCase()).to.include(
        focusArea.toLowerCase().split(' ')[0]
      );
    }
    // Or check keywords if focusArea doesn't match
    else if (response.data.keywords && Array.isArray(response.data.keywords)) {
      const matchesKeyword = response.data.keywords.some(keyword => 
        keyword.toLowerCase().includes(focusArea.toLowerCase().split(' ')[0])
      );
      expect(matchesKeyword).to.be.true;
    }
    
    // Verify we have a title at minimum
    expect(response.data.title).to.be.a('string').and.not.empty;
    
    // Log the title for this focus area
    console.log(`\n${focusArea} Challenge: ${response.data.title}`);
  });
}); 