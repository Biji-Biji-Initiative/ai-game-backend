/**
 * OpenAI Insight Generator Unit Tests
 * 
 * Tests the OpenAIInsightGenerator adapter implementation.
 */
const { expect } = require('chai');
const sinon = require('sinon');
const OpenAIInsightGenerator = require('../../src/infrastructure/services/OpenAIInsightGenerator');
const { personalityLogger } = require('../../src/core/infra/logging/domainLogger');

describe('OpenAI Insight Generator', () => {
  
  // Set longer timeout for API calls
  this.timeout(30000);

let openAIInsightGenerator;
  let openaiClientMock;
  let promptBuilderMock;
  let loggerStub;
  
  beforeEach(() => {
    // Create mocks
    openaiClientMock = {
      chat: {
        completions: {
          create: sinon.stub()
        }
      }
    };
    
    promptBuilderMock = {
      buildPrompt: sinon.stub()
    };
    
    // Create a stub for the logger
    loggerStub = {
      debug: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    };
    
    // Stub the personalityLogger
    sinon.stub(personalityLogger, 'child').returns(loggerStub);
    
    // Create instance of the generator
    openAIInsightGenerator = new OpenAIInsightGenerator(openaiClientMock, promptBuilderMock);
  });
  
  afterEach(() => {
    // Clean up all stubs
    sinon.restore();
  });
  
  describe('generateFor', () => {
    it('should generate insights using OpenAI', async () => {
      // Arrange
      const profile = {
        userId: 'user123',
        personalityTraits: {
          analytical: 75,
          creative: 60
        },
        aiAttitudes: {
          early_adopter: 80,
          skeptical: 40
        }
      };
      
      // Mock prompt builder response
      promptBuilderMock.buildPrompt.resolves('Test prompt for personality analysis');
      
      // Mock OpenAI response
      const openaiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                traits: {
                  analytical: {
                    score: 75,
                    description: 'Strong analytical abilities',
                    recommendations: ['Develop technical writing skills']
                  }
                },
                communicationStyle: {
                  strengths: ['Clear articulation', 'Logical expression'],
                  challenges: ['Sometimes too technical'],
                  recommendedApproach: 'Balanced and informative'
                },
                aiAttitudeProfile: {
                  preferences: ['Early adoption of technology'],
                  concerns: []
                }
              })
            }
          }
        ]
      };
      openaiClientMock.chat.completions.create.resolves(openaiResponse);
      
      // Act
      const insights = await openAIInsightGenerator.generateFor(profile);
      
      // Assert
      expect(insights).to.be.an('object');
      expect(insights).to.have.property('strengths').that.is.an('array');
      expect(insights).to.have.property('focus_areas').that.is.an('array');
      expect(insights).to.have.property('recommendations').that.is.an('array');
      expect(insights).to.have.property('traits').that.is.an('object');
      expect(insights).to.have.property('ai_preferences').that.is.an('object');
      
      // Verify prompt builder was called with correct parameters
      expect(promptBuilderMock.buildPrompt.calledWith('personality', {
        user: {
          fullName: 'User',
          existingTraits: profile.personalityTraits,
          aiAttitudes: profile.aiAttitudes
        }
      })).to.be.true;
      
      // Verify OpenAI was called with correct parameters
      expect(openaiClientMock.chat.completions.create.calledOnce).to.be.true;
      const openaiArgs = openaiClientMock.chat.completions.create.firstCall.args[0];
      expect(openaiArgs.model).to.equal('gpt-4o');
      expect(openaiArgs.response_format.type).to.equal('json_object');
      
      // Verify logging
      expect(loggerStub.debug.calledWith('Generating insights with OpenAI', { userId: 'user123' })).to.be.true;
      expect(loggerStub.info.calledWith('Generated insights with OpenAI', { userId: 'user123' })).to.be.true;
    });
    
    it('should handle errors when OpenAI API fails', async () => {
      // Arrange
      const profile = {
        userId: 'user456',
        personalityTraits: {
          analytical: 75
        }
      };
      
      // Mock prompt builder
      promptBuilderMock.buildPrompt.resolves('Test prompt');
      
      // Mock OpenAI error
      const apiError = new Error('API rate limit exceeded');
      openaiClientMock.chat.completions.create.rejects(apiError);
      
      // Act & Assert
      try {
        await openAIInsightGenerator.generateFor(profile);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to generate insights');
        expect(loggerStub.error.calledWith('Error generating insights with OpenAI', { 
          error: apiError.message,
          userId: 'user456'
        })).to.be.true;
      }
    });
    
    it('should handle transformation errors by returning raw response', async () => {
      // Arrange
      const profile = {
        userId: 'user789',
        personalityTraits: {
          analytical: 75
        }
      };
      
      // Mock prompt builder
      promptBuilderMock.buildPrompt.resolves('Test prompt');
      
      // Mock OpenAI with invalid response format
      const invalidResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                // Invalid structure that will cause transformation to fail
                someUnexpectedFormat: true
              })
            }
          }
        ]
      };
      openaiClientMock.chat.completions.create.resolves(invalidResponse);
      
      // Act
      const insights = await openAIInsightGenerator.generateFor(profile);
      
      // Assert
      expect(insights).to.deep.equal({ someUnexpectedFormat: true });
      expect(loggerStub.warn.calledOnce).to.be.true;
    });
  });
  
  describe('_transformOpenAIResponse', () => {
    it('should transform OpenAI response to standard insight format', () => {
      // Arrange
      const aiResponse = {
        traits: {
          analytical: {
            score: 80,
            description: 'Strong analytical abilities',
            aiInteractionImpact: 'Enhances understanding of complex systems'
          },
          creative: {
            score: 65,
            description: 'Moderate creativity',
            aiInteractionImpact: 'Values some innovative approaches'
          }
        },
        communicationStyle: {
          strengths: ['Clear articulation', 'Logical expression'],
          challenges: ['Sometimes too technical'],
          recommendedApproach: 'Balanced and informative'
        },
        aiAttitudeProfile: {
          preferences: ['Early adoption of technology'],
          concerns: ['Privacy implications']
        }
      };
      
      // Act
      const result = openAIInsightGenerator._transformOpenAIResponse(aiResponse);
      
      // Assert
      expect(result.strengths).to.include('Clear articulation');
      expect(result.strengths).to.include('Logical expression');
      expect(result.strengths).to.include('Strong preference for Early adoption of technology');
      
      expect(result.focus_areas).to.include('Sometimes too technical');
      expect(result.focus_areas).to.include('Address concern about Privacy implications');
      
      expect(result.traits.analytical.score).to.equal(80);
      expect(result.traits.analytical.description).to.equal('Strong analytical abilities');
      expect(result.traits.analytical.impact).to.equal('Enhances understanding of complex systems');
      
      expect(result.ai_preferences.communication_style).to.equal('Balanced and informative');
    });
  });
}); 