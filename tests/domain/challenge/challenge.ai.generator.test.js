/**
 * Domain Test: Challenge AI Generator
 * 
 * Tests the challenge generation service that uses AI to create challenges.
 * This test uses in-memory repositories and mocked AI service.
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

// Import the model and service to test
// Update these paths as needed based on your project structure
const Challenge = require('../../src/core/challenge/models/Challenge');

describe('Domain: Challenge AI Generator', function() {
  
  // Set longer timeout for API calls
  this.timeout(30000);

// Test setup
  let challengeService;
  let mockOpenAI;
  let mockRepository;
  let sandbox;
  
  beforeEach(function() {
    // Create a sandbox for this test
    sandbox = sinon.createSandbox();
    
    // Mock the OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: sandbox.stub().resolves({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: 'Test Challenge',
                    description: 'This is a test challenge generated by AI',
                    difficulty: 'medium'
                  })
                }
              }
            ]
          })
        }
      }
    };
    
    // Mock the repository
    mockRepository = {
      save: sandbox.stub().callsFake(challenge => Promise.resolve(challenge)),
      findById: sandbox.stub().callsFake(id => Promise.resolve({ id }))
    };
    
    // Create challenge generation service
    // This is a simplified version for testing - adapt based on your actual implementation
    challengeService = {
      generateChallenge: async (category) => {
        const prompt = `Generate a cognitive challenge in the ${category} category. 
        The challenge should test critical thinking and problem-solving abilities.
        Format the response as a JSON object with these properties:
        title: A catchy title for the challenge
        description: A detailed description of the challenge
        difficulty: The difficulty level (easy, medium, or hard)`;
        
        const completion = await mockOpenAI.responses.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are an expert at creating engaging cognitive challenges that test problem-solving abilities." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        
        const responseText = completion.choices[0].message.content;
        const challengeData = JSON.parse(responseText);
        
        // Create a Challenge domain model instance
        const challenge = new Challenge({
          id: uuidv4(),
          title: challengeData.title,
          content: { description: challengeData.description },
          difficulty: challengeData.difficulty,
          challengeType: category,
          formatType: 'text',
          focusArea: 'reasoning',
          status: 'draft',
          aiGenerated: true,
          userEmail: 'test-user@example.com'
        });
        
        // Save to repository (optional in this test)
        await mockRepository.save(challenge);
        
        return challenge;
      }
    };
  });
  
  afterEach(function() {
    // Restore all stubs
    sandbox.restore();
  });
  
  it('should generate a challenge using AI', async function() {
    // 1. ARRANGE
    const category = 'logical-reasoning';
    
    // 2. ACT
    const challenge = await challengeService.generateChallenge(category);
    
    // 3. ASSERT
    expect(challenge).to.exist;
    expect(challenge.title).to.equal('Test Challenge');
    expect(challenge.content.description).to.equal('This is a test challenge generated by AI');
    expect(challenge.difficulty).to.equal('medium');
    
    // Verify OpenAI was called with the correct parameters
    expect(mockOpenAI.responses.create.calledOnce).to.be.true;
    const callArgs = mockOpenAI.responses.create.firstCall.args[0];
    expect(callArgs.model).to.equal('gpt-4o');
    expect(callArgs.messages[0].role).to.equal('system');
    expect(callArgs.messages[1].role).to.equal('user');
    expect(callArgs.messages[1].content).to.include(category);
    
    // Verify repository was called
    expect(mockRepository.save.calledOnce).to.be.true;
  });
  
  it('should handle AI generation errors gracefully', async function() {
    // 1. ARRANGE - Set up error behavior
    mockOpenAI.responses.create.rejects(new Error('API Error'));
    
    // 2 & 3. ACT & ASSERT
    try {
      await challengeService.generateChallenge('logical-reasoning');
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('API Error');
    }
    
    // Verify OpenAI was called
    expect(mockOpenAI.responses.create.calledOnce).to.be.true;
    
    // Verify repository was not called since an error occurred
    expect(mockRepository.save.called).to.be.false;
  });
}); 