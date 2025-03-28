/**
 * Sample OpenAI Responses API Test
 * 
 * This test demonstrates how to interact with OpenAI's Responses API
 * without dependencies on the src code.
 */

const { expect } = require('chai');
const testEnv = require('../../../loadEnv');
const { skipIfMissingEnv } = require('../../../helpers/testHelpers');
const { Configuration, OpenAIApi } = require('openai');

describe('OpenAI Responses API', function() {
  let openai;
  
  before(function() {
    skipIfMissingEnv(this, 'openai');
    
    // Set up OpenAI client
    const config = testEnv.getTestConfig();
    const configuration = new Configuration({
      apiKey: config.openai.apiKey,
      organization: config.openai.organization
    });
    openai = new OpenAIApi(configuration);
  });
  
  // Set longer timeout for API calls
  this.timeout(30000);
  
  it('should be able to generate a JSON response from a prompt', async function() {
    // Skip if API key not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      this.skip();
    }
    
    // Create a prompt that requests JSON output
    const prompt = 'Generate a sample challenge about critical thinking. Return a JSON object with title, description, and difficulty properties.';
    
    // Make a request with response_format set to json_object
    const response = await openai.createChatCompletion({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are a helpful assistant that returns data in JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const responseData = response.data;
    
    // Verify the response
    expect(responseData).to.be.an('object');
    expect(responseData.choices).to.be.an('array');
    expect(responseData.choices.length).to.be.at.least(1);
    
    // Parse the JSON response
    const content = responseData.choices[0].message.content;
    const jsonData = JSON.parse(content);
    
    // Verify the JSON structure
    expect(jsonData).to.be.an('object');
    expect(jsonData.title).to.be.a('string');
    expect(jsonData.description).to.be.a('string');
    expect(jsonData.difficulty).to.be.a('string');
    
    console.log('Generated challenge:', jsonData);
  });
}); 