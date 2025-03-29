/**
 * Sample OpenAI Test
 * 
 * This is a simple test to verify OpenAI API credentials and connectivity
 * without dependencies on src code.
 */

const { expect } = require('chai');
const testEnv = require('../../loadEnv');
const { skipIfMissingEnv } = require('../../helpers/testHelpers');
const { Configuration, OpenAIApi } = require('openai');

describe('OpenAI API', function() {
  let openai;
  
  before(function() {
    skipIfMissingEnv(this, 'openai');
    
    // Set up OpenAI client using v3 syntax
    const config = testEnv.getTestConfig();
    const configuration = new Configuration({
      apiKey: config.openai.apiKey,
      organization: config.openai.organization
    });
    openai = new OpenAIApi(configuration);
  });
  
  // Set longer timeout for API calls
  this.timeout(30000);
  
  it('should be able to connect to OpenAI API', async function() {
    // Skip if API key not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      this.skip();
    }
    
    // Make a simple completion request using v3 syntax
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello world' }
      ]
    });
    
    const completion = response.data;
    
    expect(completion).to.be.an('object');
    expect(completion.choices).to.be.an('array');
    expect(completion.choices.length).to.be.at.least(1);
    expect(completion.choices[0].message.content).to.be.a('string');
  });
}); 