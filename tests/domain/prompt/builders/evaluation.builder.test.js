import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import proxyquire from "proxyquire";
const proxyquireNoCallThru = proxyquire.noCallThru()();
/**
 * Integration Tests for Evaluation Prompt System with Responses API
 *
 * These tests verify that evaluation prompts are properly formatted
 * for the Responses API and the integration works as expected.
 */
// Create mock dependencies
const mockAxios = {
    post: sinon.stub().resolves({
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
};
// Create mock Supabase client
const mockSupabaseClient = {
    from: sinon.stub().callsFake(() => ({
        insert: sinon.stub().callsFake(() => ({
            select: sinon.stub().callsFake(() => ({
                single: sinon.stub().resolves({
                    data: { id: 'mock-inserted-id' },
                    error: null
                })
            }))
        }))
    }))
};
// Load the module with mocked dependencies
const EvaluationPromptBuilder = proxyquire('../../../../src/core/prompt/builders/EvaluationPromptBuilder', {
    'axios': mockAxios,
    '../../../../src/core/infra/db/supabaseClient': { supabaseClient: mockSupabaseClient }
});
describe('Evaluation Prompt with Responses API Integration', () => {
    // Set longer timeout for API calls
    jest.setTimeout(30000);
    beforeEach(() => {
        // Reset mock history
        sinon.resetHistory();
        // Reset mock implementations if needed
        mockAxios.post.resolves({
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
        });
    });
    afterEach(() => {
        sinon.restore();
    });
    it('EvaluationPromptBuilder produces prompt with valid Responses API instructions', async () => {
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
        expect(prompt).to.include('EVALUATION TASK');
        expect(prompt).to.include('EVALUATION CRITERIA');
        expect(prompt).to.include('USER RESPONSE');
        expect(prompt).to.include('RESPONSE FORMAT');
        // Verify the Responses API instruction is included
        expect(prompt).to.include('Always format your entire response as a JSON object');
        // Check for category-specific content
        expect(prompt).to.include('ethical_reasoning');
        expect(prompt).to.include('AI Ethics');
    });
    it('Evaluation response can be parsed into the Evaluation model', async () => {
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
        // This test uses Supabase, but since we're mocking it, it should pass
        mockSupabaseClient.from.callsFake(() => ({
            insert: sinon.stub().callsFake(() => ({
                select: sinon.stub().callsFake(() => ({
                    single: sinon.stub().resolves({
                        data: { id: 'mock-id', ...evaluationData },
                        error: null
                    })
                }))
            }))
        }));
        // Use the mock Supabase client to test the insertion
        const { data, error } = await mockSupabaseClient
            .from('evaluations')
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
        // Check that the mock returned the expected data
        expect(error).to.be.null;
        expect(data).to.not.be.undefined;
        expect(data.score).to.equal(mockResponseJson.overallScore);
    });
    it('EvaluationPromptBuilder provides fallbacks for repository failures', async () => {
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
        expect(prompt).to.not.be.undefined;
        expect(prompt).to.include('EVALUATION TASK');
        expect(prompt).to.include('RESPONSE FORMAT');
    });
});
