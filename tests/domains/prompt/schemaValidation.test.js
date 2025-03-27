/**
 * Schema Validation Integration Tests
 * 
 * Tests the integration between prompt builders and their 
 * respective schema validation
 */

const { expect } = require('chai');
const EvaluationPromptBuilder = require('../../../src/core/prompt/builders/EvaluationPromptBuilder');
const ChallengePromptBuilder = require('../../../src/core/prompt/builders/ChallengePromptBuilder');
const FocusAreaPromptBuilder = require('../../../src/core/prompt/builders/FocusAreaPromptBuilder');
const PersonalityPromptBuilder = require('../../../src/core/prompt/builders/PersonalityPromptBuilder');
const ProgressPromptBuilder = require('../../../src/core/prompt/builders/ProgressPromptBuilder');
const testSetup = require('../setup');

describe('Schema Validation Integration', function() {
  
  beforeEach(function() {
    testSetup.setup();
  });
  
  afterEach(function() {
    testSetup.teardown();
  });
  
  describe('Evaluation Schema Validation', function() {
    it('should validate valid evaluation parameters', function() {
      // Valid parameters
      const validParams = {
        challenge: {
          id: 'test-challenge-1',
          title: 'Test Challenge',
          content: 'This is a test challenge',
          evaluationCriteria: ['clarity', 'accuracy', 'completeness']
        },
        userResponse: 'This is a test response'
      };
      
      // This should not throw
      const prompt = EvaluationPromptBuilder.build(validParams);
      expect(prompt).to.be.a('string');
    });
    
    it('should reject invalid evaluation parameters', function() {
      // Missing challenge
      const invalidParams = {
        userResponse: 'This is a test response'
      };
      
      // This should throw
      expect(() => EvaluationPromptBuilder.build(invalidParams)).to.throw();
    });
    
    it('should reject invalid evaluation criteria format', function() {
      // Invalid evaluation criteria (not an array)
      const invalidParams = {
        challenge: {
          id: 'test-challenge-1',
          title: 'Test Challenge',
          content: 'This is a test challenge',
          evaluationCriteria: 'clarity, accuracy' // Should be an array
        },
        userResponse: 'This is a test response'
      };
      
      // This should throw
      expect(() => EvaluationPromptBuilder.build(invalidParams)).to.throw();
    });
  });
  
  describe('Challenge Schema Validation', function() {
    it('should validate valid challenge parameters', function() {
      // Valid parameters
      const validParams = {
        user: {
          id: 'test-user-1',
          fullName: 'Test User',
          skillLevel: 'intermediate',
          focusAreas: ['effective questioning', 'clear instructions']
        },
        options: {
          challengeType: 'scenario',
          difficulty: 'medium'
        }
      };
      
      // This should not throw
      const prompt = ChallengePromptBuilder.build(validParams);
      expect(prompt).to.be.a('string');
    });
    
    it('should reject invalid challenge parameters', function() {
      // Missing user
      const invalidParams = {
        options: {
          challengeType: 'scenario',
          difficulty: 'medium'
        }
      };
      
      // This should throw
      expect(() => ChallengePromptBuilder.build(invalidParams)).to.throw();
    });
    
    it('should reject invalid difficulty level', function() {
      // Invalid difficulty level
      const invalidParams = {
        user: {
          id: 'test-user-1',
          skillLevel: 'intermediate'
        },
        options: {
          challengeType: 'scenario',
          difficulty: 'impossible' // Not a valid difficulty
        }
      };
      
      // This should throw
      expect(() => ChallengePromptBuilder.build(invalidParams)).to.throw();
    });
  });
  
  describe('Focus Area Schema Validation', function() {
    it('should validate valid focus area parameters', function() {
      // Valid parameters
      const validParams = {
        user: {
          traits: { 
            analytical: 8,
            creative: 6 
          },
          attitudes: { 
            openness: 7,
            skepticism: 4 
          },
          professional_title: 'Software Developer'
        },
        options: {
          count: 3,
          creativeVariation: 0.7
        }
      };
      
      // This should not throw
      const prompt = FocusAreaPromptBuilder.build(validParams);
      expect(prompt).to.be.a('string');
    });
    
    it('should reject invalid focus area parameters', function() {
      // Missing user
      const invalidParams = {
        options: {
          count: 3
        }
      };
      
      // This should throw
      expect(() => FocusAreaPromptBuilder.build(invalidParams)).to.throw();
    });
    
    it('should reject invalid creative variation value', function() {
      // Invalid creative variation (out of range 0-1)
      const invalidParams = {
        user: {
          traits: { analytical: 8 }
        },
        options: {
          creativeVariation: 2.5 // Should be between 0 and 1
        }
      };
      
      // This should throw
      expect(() => FocusAreaPromptBuilder.build(invalidParams)).to.throw();
    });
  });
  
  describe('Personality Schema Validation', function() {
    it('should validate valid personality parameters', function() {
      // Valid parameters
      const validParams = {
        user: {
          fullName: 'Jane Smith',
          professionalTitle: 'Marketing Specialist',
          existingTraits: {
            openness: 8,
            conscientiousness: 7
          }
        },
        options: {
          detailLevel: 'comprehensive'
        }
      };
      
      // This should not throw
      const prompt = PersonalityPromptBuilder.build(validParams);
      expect(prompt).to.be.a('string');
    });
    
    it('should reject invalid personality parameters', function() {
      // Missing user
      const invalidParams = {
        interactionHistory: [
          { type: 'conversation', score: 7 }
        ]
      };
      
      // This should throw
      expect(() => PersonalityPromptBuilder.build(invalidParams)).to.throw();
    });
    
    it('should reject invalid trait score', function() {
      // Invalid trait score (out of range 1-10)
      const invalidParams = {
        user: {
          fullName: 'Jane Smith',
          existingTraits: {
            openness: 15 // Should be between 1 and 10
          }
        }
      };
      
      // This should throw
      expect(() => PersonalityPromptBuilder.build(invalidParams)).to.throw();
    });
  });
  
  describe('Progress Schema Validation', function() {
    it('should validate valid progress parameters', function() {
      // Valid parameters
      const validParams = {
        user: {
          fullName: 'John Doe',
          skillLevel: 'advanced',
          focusAreas: ['strategic questioning', 'contextual instructions']
        },
        challengeAttempts: [
          {
            title: 'Strategic Questioning',
            focusArea: 'strategic questioning',
            score: 85
          }
        ],
        options: {
          timeRange: 'month',
          detailLevel: 'detailed'
        }
      };
      
      // This should not throw
      const prompt = ProgressPromptBuilder.build(validParams);
      expect(prompt).to.be.a('string');
    });
    
    it('should reject invalid progress parameters', function() {
      // Missing user
      const invalidParams = {
        challengeAttempts: [
          { title: 'Challenge 1', score: 85 }
        ]
      };
      
      // This should throw
      expect(() => ProgressPromptBuilder.build(invalidParams)).to.throw();
    });
    
    it('should reject invalid score in challenge attempts', function() {
      // Invalid score (out of range 0-100)
      const invalidParams = {
        user: {
          fullName: 'John Doe'
        },
        challengeAttempts: [
          {
            title: 'Challenge 1',
            score: 150 // Should be between 0 and 100
          }
        ]
      };
      
      // This should throw
      expect(() => ProgressPromptBuilder.build(invalidParams)).to.throw();
    });
  });
}); 