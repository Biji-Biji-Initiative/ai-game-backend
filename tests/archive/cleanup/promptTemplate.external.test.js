/**
 * External Test: Prompt Template OpenAI Integration
 * 
 * Tests the direct integration with OpenAI for prompt template generation.
 * This test makes real API calls to OpenAI.
 */

const { expect } = require('chai');
const { v4: uuidv4 } = require('uuid');

const testEnv = require('../../loadEnv');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
require('dotenv').config();

describe('External: Prompt Template OpenAI Integration', function() {
  
  before(function() {
    skipIfMissingEnv(this, 'openai');
  });

// Skip if API keys not available
  before(function() {
    if (!testEnv.getTestConfig().openai.apiKey) {
      console.warn('OPENAI_API_KEY not found, skipping external OpenAI tests');
      this.skip();
    }
  });
  
  // Set longer timeout for API calls
  this.timeout(30000);
  
  let openaiClient;
  
  beforeEach(function() {
    // Create OpenAI client
    const { OpenAIClient } = require('../../src/infra/openai');
    openaiClient = new OpenAIClient({ apiKey: testEnv.getTestConfig().openai.apiKey
     });
  });
  
  it('should generate a prompt template using OpenAI API', async function() {
    // 1. ARRANGE
    const domain = 'challenge';
    const description = 'A prompt for generating logical reasoning challenges that test critical thinking skills';
    
    const prompt = `Create a prompt template for an AI system in the ${domain} domain.
    
    Description: ${description}
    
    Provide a response in JSON format with these properties:
    name: A name for the prompt template (short but descriptive)
    description: A detailed description of what this prompt does
    template: The actual prompt template text with variables in curly braces like {variable_name}
    variables: An array of variable names that should be replaced in the template`;
    
    // 2. ACT
    const completion = await openaiClient.responses.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert prompt engineer who specializes in creating effective prompts for AI systems." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const responseText = completion.choices[0].message.content;
    const promptData = JSON.parse(responseText);
    
    // 3. ASSERT
    expect(promptData).to.exist;
    expect(promptData.name).to.be.a('string').and.not.empty;
    expect(promptData.description).to.be.a('string').and.not.empty;
    expect(promptData.template).to.be.a('string').and.not.empty;
    expect(promptData.variables).to.be.an('array').and.not.empty;
    
    // Verify the template contains variable placeholders
    promptData.variables.forEach(variable => {
      expect(promptData.template).to.include(`{${variable}}`);
    });
    
    // Log the result for reference
    console.log('Generated Prompt Template:', {
      name: promptData.name,
      variableCount: promptData.variables.length
    });
  });
  
  it('should handle different domains for prompt templates', async function() {
    // Test a different domain to ensure flexibility
    const domain = 'education';
    const description = 'A prompt for creating personalized learning exercises for students';
    
    const prompt = `Create a prompt template for an AI system in the ${domain} domain.
    
    Description: ${description}
    
    Provide a response in JSON format with these properties:
    name: A name for the prompt template (short but descriptive)
    description: A detailed description of what this prompt does
    template: The actual prompt template text with variables in curly braces like {variable_name}
    variables: An array of variable names that should be replaced in the template`;
    
    const completion = await openaiClient.responses.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert prompt engineer who specializes in creating effective prompts for AI systems." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const responseText = completion.choices[0].message.content;
    const promptData = JSON.parse(responseText);
    
    // Verify the prompt template structure
    expect(promptData).to.exist;
    expect(promptData.name).to.be.a('string').and.not.empty;
    expect(promptData.description).to.be.a('string').and.not.empty;
    expect(promptData.template).to.be.a('string').and.not.empty;
    expect(promptData.variables).to.be.an('array').and.not.empty;
    
    // Log the result for reference
    console.log('Generated Prompt Template (Different Domain):', {
      name: promptData.name,
      domain: domain,
      variableCount: promptData.variables.length
    });
  });
}); 