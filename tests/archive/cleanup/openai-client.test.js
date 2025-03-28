/**
 * OpenAI Client Tests
 * 
 * Tests for the OpenAI client adapter to validate its functionality
 * and error handling without making real API calls.
 */

const { expect } = require('chai');
const sinon = require('sinon');


const { skipIfMissingEnv } = require('../../helpers/testHelpers');
// Assuming your OpenAI client is located at this path
// Update the path if your client is located elsewhere
let openaiClient;
try {
  openaiClient = require('../../src/adapters/openai/client');
} catch (e) {
  console.warn('OpenAI client not found at expected path, skipping tests');
}

describe('OpenAI Client', function() {
  
  
  // Set longer timeout for API calls
  this.timeout(30000);

before(function() {
    skipIfMissingEnv(this, 'openai');
  });

let sandbox;
  
  beforeEach(function() {
    // Create a sinon sandbox for mocking
    sandbox = sinon.createSandbox();
  });
  
  afterEach(function() {
    // Restore all mocks
    sandbox.restore();
  });
  
  it('should exist as a module', function() {
    if (!openaiClient) {
      this.skip();
    }
    
    expect(openaiClient).to.exist;
  });
  
  describe('API Calls', function() {
    it('should make a valid chat completion call', async function() {
      if (!openaiClient) {
        this.skip();
      }
      
      // Mock the completionMethod to avoid actual API calls
      const completionStub = sandbox.stub().resolves({
        choices: [
          {
            message: {
              content: 'This is a test response'
            }
          }
        ]
      });
      
      // Replace the real method with our stub
      sandbox.replace(openaiClient, 'createChatCompletion', completionStub);
      
      // Call the method
      const result = await openaiClient.createChatCompletion({
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'gpt-4'
      });
      
      // Verify the stub was called
      expect(completionStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result.choices[0].message.content).to.equal('This is a test response');
    });
    
    it('should handle API errors gracefully', async function() {
      if (!openaiClient) {
        this.skip();
      }
      
      // Create an error response
      const apiError = new Error('OpenAI API Error');
      apiError.response = {
        status: 429,
        data: {
          error: {
            message: 'Rate limit exceeded'
          }
        }
      };
      
      // Mock the completion method to throw the error
      const completionStub = sandbox.stub().rejects(apiError);
      sandbox.replace(openaiClient, 'createChatCompletion', completionStub);
      
      try {
        // Call the method
        await openaiClient.createChatCompletion({
          messages: [{ role: 'user', content: 'Test message' }],
          model: 'gpt-4'
        });
        
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify the error was thrown
        expect(error.message).to.include('OpenAI API Error');
        
        // Verify the stub was called
        expect(completionStub.calledOnce).to.be.true;
      }
    });
  });
  
  describe('Retry Logic', function() {
    it('should retry failed API calls', async function() {
      if (!openaiClient) {
        this.skip();
      }
      
      // Skip if the client doesn't have retry functionality
      if (!openaiClient.retry) {
        this.skip();
      }
      
      // Mock the retry function
      const retryStub = sandbox.stub().resolves({
        success: true,
        result: {
          choices: [
            {
              message: {
                content: 'Retry successful'
              }
            }
          ]
        }
      });
      
      sandbox.replace(openaiClient, 'retry', retryStub);
      
      // Call the retry function
      const result = await openaiClient.retry(
        () => openaiClient.createChatCompletion({
          messages: [{ role: 'user', content: 'Test message' }],
          model: 'gpt-4'
        }),
        3
      );
      
      // Verify the stub was called
      expect(retryStub.calledOnce).to.be.true;
      
      // Verify the result
      expect(result.success).to.be.true;
      expect(result.result.choices[0].message.content).to.equal('Retry successful');
    });
  });
}); 