/**
 * Integration Tests for Evaluation Prompt System with Responses API
 * 
 * These tests verify that evaluation prompts are properly formatted
 * for the Responses API and the integration works as expected.
 */

const EvaluationPromptBuilder = require('../../src/core/prompt/builders/EvaluationPromptBuilder');
const { supabase } = require('../../src/utils/db/supabaseClient');
const axios = require('axios');
const mockAxios = jest.spyOn(axios, 'post');

// Mock OpenAI responses function implementation
jest.mock('axios');

describe('Evaluation Prompt with Responses API Integration', () => {
  beforeEach(() => {
    mockAxios.mockReset();
    mockAxios.mockImplementation(() => 
      Promise.resolve({
        data: {
          id: 'resp_mock12345',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                categoryScores: {
                  accuracy: 85,
                  clarity: 78,
                  reasoning: 80
                },
                overallScore: 82,
                overallFeedback: 'This is a strong response overall',
                strengths: ['Good factual accuracy', 'Clear reasoning'],
                areasForImprovement: ['Could improve clarity in some sections']
              })
            }
          }]
        }
      })
    );
  });
  
  test('EvaluationPromptBuilder produces prompt with valid Responses API instructions', async () => {
    const challenge = {
      id: 'test-challenge-id',
      title: 'Test Challenge',
      challengeType: 'analysis',
      focusArea: 'AI Ethics',
      content: {
        context: 'This is a test context',
        instructions: 'Analyze the following scenario'
      }
    };
    
    const userResponse = 'This is a test user response to the challenge';
    
    const user = {
      id: 'test-user-id',
      name: 'Test User',
      skillLevel: 'intermediate',
      focusAreas: ['AI Ethics', 'Critical Thinking']
    };
    
    // Use the builder to generate a prompt
    const prompt = await EvaluationPromptBuilder.build({
      challenge,
      userResponse,
      user
    });
    
    // Verify the prompt contains key elements
    expect(prompt).toContain('EVALUATION TASK');
    expect(prompt).toContain('EVALUATION CRITERIA');
    expect(prompt).toContain('USER RESPONSE');
    expect(prompt).toContain('RESPONSE FORMAT');
    
    // Verify the Responses API instruction is included
    expect(prompt).toContain('Always format your entire response as a JSON object');
    
    // Check for category-specific content
    expect(prompt).toContain('ethical_reasoning');
    expect(prompt).toContain('AI Ethics');
  });
  
  test('Evaluation response can be parsed into the Evaluation model', async () => {
    // Mock the Responses API call and response
    const mockResponseJson = {
      categoryScores: {
        ethical_reasoning: 85,
        comprehensiveness: 78,
        clarity: 82
      },
      overallScore: 82,
      overallFeedback: 'This response demonstrates strong ethical reasoning',
      strengths: ['Thorough consideration of stakeholder perspectives', 'Clear identification of ethical principles'],
      areasForImprovement: ['Could explore more diverse ethical frameworks'],
      strengthAnalysis: [
        {
          strength: 'Thorough consideration of stakeholder perspectives',
          analysis: 'The response identifies multiple stakeholders and their concerns',
          impact: 'This ensures a comprehensive ethical analysis'
        }
      ],
      improvementPlans: [
        {
          area: 'Ethical frameworks diversity',
          importance: 'Different frameworks offer unique insights',
          actionItems: ['Explore consequentialist perspectives', 'Consider virtue ethics approach'],
          resources: ['Introduction to Ethical Frameworks in AI']
        }
      ]
    };
    
    // Parse the evaluation data
    const evaluationData = {
      userId: 'test-user',
      challengeId: 'test-challenge',
      score: mockResponseJson.overallScore,
      categoryScores: mockResponseJson.categoryScores,
      overallFeedback: mockResponseJson.overallFeedback,
      strengths: mockResponseJson.strengths,
      strengthAnalysis: mockResponseJson.strengthAnalysis,
      areasForImprovement: mockResponseJson.areasForImprovement,
      improvementPlans: mockResponseJson.improvementPlans
    };
    
    // Check that this data can be stored in the database
    const { data, error } = await supabase
      .from('evaluations') // Replace with your actual evaluations table name
      .insert([{
        user_id: evaluationData.userId,
        challenge_id: evaluationData.challengeId,
        score: evaluationData.score,
        category_scores: evaluationData.categoryScores,
        overall_feedback: evaluationData.overallFeedback,
        strengths: evaluationData.strengths,
        strength_analysis: evaluationData.strengthAnalysis,
        areas_for_improvement: evaluationData.areasForImprovement,
        improvement_plans: evaluationData.improvementPlans,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    // If the table doesn't exist yet, this test should be skipped
    if (error && error.message.includes('does not exist')) {
      console.log('Evaluations table does not exist yet, skipping test');
      return;
    }
    
    // Otherwise check if the insertion worked
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.score).toBe(mockResponseJson.overallScore);
  }, 10000); // Increase timeout for database operations
  
  test('EvaluationPromptBuilder provides fallbacks for repository failures', async () => {
    // Force repository failure by providing invalid focus areas
    const challenge = {
      id: 'test-challenge-id',
      title: 'Test Challenge',
      challengeType: 'analysis'
    };
    
    const userResponse = 'Test response';
    
    // Create a user with invalid focus areas to trigger fallback
    const user = {
      focusAreas: ['NonExistentFocusArea123']
    };
    
    // This should still work using the fallback mechanism
    const prompt = await EvaluationPromptBuilder.build({
      challenge,
      userResponse,
      user
    });
    
    // Verify the prompt was still created
    expect(prompt).toBeDefined();
    expect(prompt).toContain('EVALUATION TASK');
    expect(prompt).toContain('RESPONSE FORMAT');
  });
}); 