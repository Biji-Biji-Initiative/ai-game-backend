/**
 * Focus Area Service Domain Tests
 * 
 * Tests for the FocusArea Service using in-memory repositories.
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

// Import setup helpers
const testSetup = require('../setup');

describe('FocusArea Service Domain Tests', function() {
  
  // Set longer timeout for API calls
  this.timeout(30000);

let sandbox;
  let focusAreaRepository;
  let openAIMock;
  let focusAreaService;
  
  beforeEach(function() {
    // Set up sinon sandbox and test repositories
    const setup = testSetup.setup();
    sandbox = setup.sandbox;
    focusAreaRepository = setup.focusAreaRepository;
    openAIMock = setup.openAIClient;
    
    // Set up mock OpenAI response for focus area recommendation using the new Responses API format
    openAIMock.responses.create.resolves({
      id: "resp_123mock",
      object: "response",
      created_at: Date.now() / 1000,
      status: "completed",
      model: "gpt-4o",
      output: [
        {
          type: "message",
          id: "msg_123mock",
          status: "completed",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                name: "AI Ethics",
                description: "As a Product Manager with interests in AI ethics, this focus area will help you understand ethical considerations in AI product development.",
                skills: ["Ethical Framework Development", "Bias Identification", "Privacy-Preserving Techniques", "Responsible AI Practices"]
              }),
              annotations: []
            }
          ]
        }
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 150,
        total_tokens: 250
      }
    });
    
    // Create FocusArea model (simplified version for testing)
    class FocusArea {
      constructor(data) {
        this.id = data.id || uuidv4();
        this.name = data.name;
        this.description = data.description;
        this.skills = data.skills || [];
        this.challenges = data.challenges || [];
        this.createdAt = data.createdAt || new Date().toISOString();
        this.userId = data.userId || 'test-user-id';
        this.threadId = data.threadId || null;
      }
    }
    
    // Create a simplified service for testing
    focusAreaService = {
      recommendFocusArea: async (userProfile) => {
        try {
          // Call OpenAI to get recommendations
          const completion = await openAIMock.responses.create({
            model: "gpt-4o",
            input: {
              type: "message",
              role: "user",
              content: `Based on the following user profile, recommend a focus area for their AI skills development:
              
              Professional Title: ${userProfile.professionalTitle}
              Interests: ${userProfile.interests.join(', ')}
              Skills: ${userProfile.skills.join(', ')}
              
              Provide a recommendation in JSON format with these properties:
              name: The name of the focus area (choose from: AI Ethics, Human-AI Collaboration, AI Applications, AI Safety)
              description: A detailed description of why this focus area is appropriate for the user
              skills: An array of 3-5 specific skills to develop in this focus area`
            },
            instructions: "You are an expert career advisor specializing in AI skill development.",
            text: {
              format: {
                type: "json_object"
              }
            }
          });
          
          // Extract the response text from the new Responses API format
          const assistantMessage = completion.output.find(item => 
            item.type === 'message' && item.role === 'assistant'
          );
          
          const textOutput = assistantMessage?.content.find(item => 
            item.type === 'output_text'
          );
          
          const responseText = textOutput.text;
          const recommendationData = JSON.parse(responseText);
          
          // Create FocusArea domain object
          const focusArea = new FocusArea({
            name: recommendationData.name,
            description: recommendationData.description,
            skills: recommendationData.skills,
            userId: userProfile.userId || 'test-user-id'
          });
          
          // Save to repository
          await focusAreaRepository.save(focusArea);
          
          return focusArea;
        } catch (error) {
          throw new Error(`Failed to recommend focus area: ${error.message}`);
        }
      },
      
      getFocusAreaById: async (id) => {
        return await focusAreaRepository.findById(id);
      },
      
      getFocusAreasByUserId: async (userId) => {
        return await focusAreaRepository.findByUserId(userId);
      }
    };
  });
  
  afterEach(function() {
    // Restore sandbox
    testSetup.teardown(sandbox);
  });
  
  describe('Focus Area Recommendations', function() {
    it('should generate a focus area recommendation based on user profile', async function() {
      // Arrange - Create a test user profile
      const userProfile = {
        userId: 'test-user-123',
        professionalTitle: 'Product Manager',
        interests: ['AI ethics', 'Product development', 'User experience'],
        skills: ['Project management', 'Data analysis', 'Team leadership']
      };
      
      // Act - Generate the focus area recommendation
      const focusArea = await focusAreaService.recommendFocusArea(userProfile);
      
      // Assert - Verify recommendation
      expect(focusArea).to.exist;
      expect(focusArea.name).to.equal('AI Ethics');
      expect(focusArea.description).to.include('Product Manager');
      expect(focusArea.skills).to.be.an('array').with.lengthOf(4);
      expect(focusArea.skills).to.include('Ethical Framework Development');
      expect(focusArea.userId).to.equal('test-user-123');
      
      // Verify repository was called
      const savedFocusArea = await focusAreaRepository.findById(focusArea.id);
      expect(savedFocusArea).to.exist;
      expect(savedFocusArea.name).to.equal('AI Ethics');
      
      // Verify OpenAI was called with the right parameters
      expect(openAIMock.responses.create.calledOnce).to.be.true;
      const callArgs = openAIMock.responses.create.firstCall.args[0];
      expect(callArgs.model).to.equal('gpt-4o');
      expect(callArgs.input.content).to.include('Product Manager');
      expect(callArgs.input.content).to.include('AI ethics');
    });
    
    it('should retrieve focus areas by user ID', async function() {
      // Arrange - Create and save some focus areas for the user
      const userId = 'test-user-456';
      
      // Create test focus areas
      const focusArea1 = {
        id: uuidv4(),
        name: 'AI Ethics',
        description: 'Understanding ethical AI development',
        skills: ['Ethical Framework Development', 'Bias Identification'],
        userId
      };
      
      const focusArea2 = {
        id: uuidv4(),
        name: 'AI Applications',
        description: 'Building practical AI applications',
        skills: ['Natural Language Processing', 'Computer Vision'],
        userId
      };
      
      // Save focus areas to repository
      await focusAreaRepository.save(focusArea1);
      await focusAreaRepository.save(focusArea2);
      
      // Act - Retrieve focus areas for the user
      const userFocusAreas = await focusAreaService.getFocusAreasByUserId(userId);
      
      // Assert - Verify results
      expect(userFocusAreas).to.be.an('array').with.lengthOf(2);
      expect(userFocusAreas[0].name).to.be.oneOf(['AI Ethics', 'AI Applications']);
      expect(userFocusAreas[1].name).to.be.oneOf(['AI Ethics', 'AI Applications']);
      expect(userFocusAreas.find(fa => fa.name === 'AI Ethics').skills).to.include('Ethical Framework Development');
    });
    
    it('should handle errors from OpenAI gracefully', async function() {
      // Arrange - Set up OpenAI to throw an error
      openAIMock.responses.create.rejects(new Error('OpenAI API error'));
      
      // Act & Assert - Verify the error is handled and rethrown with context
      try {
        await focusAreaService.recommendFocusArea({
          professionalTitle: 'Developer',
          interests: ['AI'],
          skills: ['Coding']
        });
        
        // If we get here, the test failed
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.include('Failed to recommend focus area');
        expect(error.message).to.include('OpenAI API error');
      }
    });
  });
}); 