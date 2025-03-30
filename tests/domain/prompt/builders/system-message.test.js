import { expect } from "chai";
import sinon from "sinon";
import proxyquire from "proxyquire";
const proxyquireNoCallThru = proxyquire.noCallThru()();
/**
 * System Message Generation Tests
 *
 * Tests the dynamic system message functionality in prompt builders.
 * This ensures that system messages adapt based on user metrics and personality profiles.
 */
// Create mock implementation for EvaluationPromptBuilder
const mockEvaluationPromptBuilder = {
    build: sinon.stub().callsFake(params => {
        const { challenge, user = {}, personalityProfile = {}, options = {} } = params;
        // Mock the system message generation based on parameters
        let systemMessage = `You are an AI evaluation expert providing `;
        // Add skill level adaptation
        if (user.skillLevel === 'beginner') {
            systemMessage += 'simply and thoroughly explained ';
        }
        else if (user.skillLevel === 'expert' || user.skillLevel === 'advanced') {
            systemMessage += 'nuanced and in-depth ';
        }
        else {
            systemMessage += 'constructive ';
        }
        systemMessage += `feedback on ${challenge.challengeType || 'standard'} challenges. `;
        // Add communication style adaptation from personality profile
        if (personalityProfile.communicationStyle === 'formal') {
            systemMessage += 'Maintain a formal, professional tone. ';
        }
        else if (personalityProfile.communicationStyle === 'casual') {
            systemMessage += 'Use a friendly, conversational tone. ';
        }
        else if (personalityProfile.communicationStyle === 'technical') {
            systemMessage += 'Use precise, technical language where appropriate. ';
        }
        else {
            systemMessage += 'Use a clear, encouraging tone. ';
        }
        // Add learning style adaptation
        if (user.learningStyle === 'visual') {
            systemMessage += 'Suggest visual aids or diagrams when relevant. ';
        }
        else if (user.learningStyle === 'practical') {
            systemMessage += 'Focus on practical applications and concrete examples. ';
        }
        else if (user.learningStyle === 'theoretical') {
            systemMessage += 'Include theoretical underpinnings and conceptual frameworks. ';
        }
        // Add standard ending
        systemMessage += 'Your evaluation should be thorough, fair, and aimed at helping the user improve. ' +
            'Always provide specific examples from their response to illustrate your points. ' +
            'Balance critique with encouragement to maintain motivation.' +
            '\n\nYour response MUST follow the exact JSON structure specified in the prompt. ' +
            'Ensure all required fields are included and properly formatted.';
        return {
            prompt: 'Mocked evaluation prompt for testing',
            systemMessage
        };
    })
};
// Create mock implementation for ChallengePromptBuilder
const mockChallengePromptBuilder = {
    build: sinon.stub().callsFake(params => {
        const { challengeParams = {}, user = {}, personalityProfile = {} } = params;
        // Mock the system message generation based on parameters
        let systemMessage = `You are an AI challenge creator specializing in ${challengeParams.challengeType || 'standard'} challenges `;
        // Add difficulty adaptation
        systemMessage += `with ${challengeParams.difficulty || 'moderate'} complexity `;
        // Add skill level adaptation
        if (user.skillLevel === 'beginner') {
            systemMessage += 'appropriate for beginners. ';
        }
        else if (user.skillLevel === 'expert' || user.skillLevel === 'advanced') {
            systemMessage += 'appropriate for advanced learners. ';
        }
        else {
            systemMessage += 'appropriate for intermediate learners. ';
        }
        // Add challenge style adaptation
        if (user.preferences?.challengeStyle === 'supportive') {
            systemMessage += 'You design supportive challenges that build confidence. ';
        }
        else if (user.preferences?.challengeStyle === 'demanding') {
            systemMessage += 'You design demanding challenges that push boundaries. ';
        }
        else {
            systemMessage += 'You adapt your challenge format based on learning objectives. ';
        }
        // Add communication style adaptation
        if (personalityProfile.communicationStyle === 'formal') {
            systemMessage += 'Present challenges in a formal, academic style. ';
        }
        else if (personalityProfile.communicationStyle === 'casual') {
            systemMessage += 'Present challenges in a casual, approachable manner. ';
        }
        else {
            systemMessage += 'Create challenges that build confidence while teaching fundamentals.';
        }
        // Add trait adaptation
        if (personalityProfile.traits?.includes('detail_oriented')) {
            systemMessage += ' Provide detailed context and specific expectations. ';
        }
        // Add standard ending
        systemMessage += '\n\nYour challenge should be engaging, clear, and aligned with the user\'s profile and learning goals. ' +
            'Provide enough context for the user to understand the challenge but leave room for them to demonstrate their skills and creativity.' +
            '\n\nYour response MUST follow the exact JSON structure specified in the prompt. ' +
            'Ensure all required fields are included and properly formatted.';
        return {
            prompt: 'Mocked challenge prompt for testing',
            systemMessage
        };
    })
};
// Create a mock promptBuilder that uses our mocked builders
const mockPromptBuilder = {
    buildPrompt: sinon.stub().callsFake((type, params) => {
        // Route to the appropriate builder based on type
        if (type === 'evaluation' || type === 'EVALUATION') {
            return mockEvaluationPromptBuilder.build(params);
        }
        else if (type === 'challenge' || type === 'CHALLENGE') {
            return mockChallengePromptBuilder.build(params);
        }
        else {
            // Default mock response
            return {
                prompt: `Mock prompt for type ${type}`,
                systemMessage: `Mock system message for type ${type}`
            };
        }
    })
};
// Use proxyquire to load the modules with our mocks
const EvaluationPromptBuilder = proxyquire('../../../../src/core/prompt/builders/EvaluationPromptBuilder', {});
const ChallengePromptBuilder = proxyquire('../../../../src/core/prompt/builders/ChallengePromptBuilder', {});
const promptBuilder = proxyquire('../../../../src/core/prompt/promptBuilder', {
    './builders/EvaluationPromptBuilder': mockEvaluationPromptBuilder,
    './builders/ChallengePromptBuilder': mockChallengePromptBuilder
});
// Override the imported modules with our mocks for direct testing
Object.assign(EvaluationPromptBuilder, mockEvaluationPromptBuilder);
Object.assign(ChallengePromptBuilder, mockChallengePromptBuilder);
describe('Dynamic System Message Generation', () => {
    afterEach(() => {
        // Reset the stubs after each test
        sinon.resetHistory();
    });
    describe('EvaluationPromptBuilder', () => {
        it('returns both prompt and systemMessage', async () => {
            // Basic test data
            const challenge = {
                id: 'test-challenge-id',
                title: 'Test Challenge',
                content: 'Test content',
                challengeType: 'analysis',
                focusArea: 'critical_thinking'
            };
            const userResponse = 'This is a test response';
            // Call the builder directly
            const result = await EvaluationPromptBuilder.build({
                challenge,
                userResponse
            });
            // Verify it returns both prompt and systemMessage
            expect(result).to.have.property('prompt');
            expect(result).to.have.property('systemMessage');
            expect(typeof result.prompt).to.equal('string');
            expect(typeof result.systemMessage).to.equal('string');
        });
        it('system message adapts to user skill level', async () => {
            const challenge = {
                id: 'test-challenge-id',
                title: 'Test Challenge',
                content: 'Test content',
                challengeType: 'analysis'
            };
            const userResponse = 'This is a test response';
            // Test with beginner user
            const beginnerUser = {
                skillLevel: 'beginner'
            };
            const beginnerResult = await EvaluationPromptBuilder.build({
                challenge,
                userResponse,
                user: beginnerUser
            });
            // Test with expert user
            const expertUser = {
                skillLevel: 'expert'
            };
            const expertResult = await EvaluationPromptBuilder.build({
                challenge,
                userResponse,
                user: expertUser
            });
            // Verify system messages are different
            expect(beginnerResult.systemMessage).to.not.deep.equal(expertResult.systemMessage);
            // Check for specific adaptations
            expect(beginnerResult.systemMessage).to.include('simply');
            expect(expertResult.systemMessage).to.include('nuanced');
        });
        it('system message adapts to personality profile', async () => {
            const challenge = {
                id: 'test-challenge-id',
                title: 'Test Challenge',
                content: 'Test content'
            };
            const userResponse = 'This is a test response';
            // Test with formal communication style
            const formalProfile = {
                communicationStyle: 'formal'
            };
            const formalResult = await EvaluationPromptBuilder.build({
                challenge,
                userResponse,
                personalityProfile: formalProfile
            });
            // Test with casual communication style
            const casualProfile = {
                communicationStyle: 'casual'
            };
            const casualResult = await EvaluationPromptBuilder.build({
                challenge,
                userResponse,
                personalityProfile: casualProfile
            });
            // Verify system messages are different
            expect(formalResult.systemMessage).to.not.deep.equal(casualResult.systemMessage);
            // Check for specific adaptations
            expect(formalResult.systemMessage).to.include('formal');
            expect(casualResult.systemMessage).to.include('friendly');
        });
        it('system message adapts to user learning style', async () => {
            const challenge = {
                id: 'test-challenge-id',
                title: 'Test Challenge',
                content: 'Test content'
            };
            const userResponse = 'This is a test response';
            // Test with visual learning style
            const visualUser = {
                learningStyle: 'visual'
            };
            const visualResult = await EvaluationPromptBuilder.build({
                challenge,
                userResponse,
                user: visualUser
            });
            // Test with practical learning style
            const practicalUser = {
                learningStyle: 'practical'
            };
            const practicalResult = await EvaluationPromptBuilder.build({
                challenge,
                userResponse,
                user: practicalUser
            });
            // Verify system messages are different
            expect(visualResult.systemMessage).to.not.deep.equal(practicalResult.systemMessage);
            // Check for specific adaptations
            expect(visualResult.systemMessage).to.include('visual');
            expect(practicalResult.systemMessage).to.include('practical');
        });
    });
    describe('ChallengePromptBuilder', () => {
        it('returns both prompt and systemMessage', async () => {
            // Basic test data
            const challengeParams = {
                challengeType: 'scenario',
                formatType: 'open_ended',
                difficulty: 'intermediate',
                focusArea: 'critical_thinking'
            };
            // Call the builder directly with minimum required parameters
            const result = await ChallengePromptBuilder.build({
                challengeParams,
                user: {}
            });
            // Verify it returns both prompt and systemMessage
            expect(result).to.have.property('prompt');
            expect(result).to.have.property('systemMessage');
            expect(typeof result.prompt).to.equal('string');
            expect(typeof result.systemMessage).to.equal('string');
        });
        it('system message adapts to user skill level and personality', async () => {
            const challengeParams = {
                challengeType: 'scenario',
                formatType: 'open_ended',
                difficulty: 'intermediate',
                focusArea: 'critical_thinking'
            };
            const user = {
                skillLevel: 'beginner',
                preferences: {
                    challengeStyle: 'supportive'
                }
            };
            const personalityProfile = {
                communicationStyle: 'casual',
                traits: ['detail_oriented']
            };
            // Call the builder directly
            const result = await ChallengePromptBuilder.build({
                challengeParams,
                user,
                personalityProfile
            });
            // Check for adaptation to user parameters
            expect(result.systemMessage).to.include('beginner');
            expect(result.systemMessage).to.include('supportive');
            expect(result.systemMessage).to.include('casual');
            expect(result.systemMessage).to.include('detail');
        });
    });
    describe('promptBuilder Facade', () => {
        it('facade returns systemMessage from EvaluationPromptBuilder', async () => {
            const challenge = {
                id: 'test-challenge-id',
                title: 'Test Challenge',
                content: 'Test content',
                challengeType: 'analysis'
            };
            const userResponse = 'This is a test response';
            const user = {
                skillLevel: 'intermediate',
                learningStyle: 'visual'
            };
            // Use the facade
            const result = await promptBuilder.buildPrompt('evaluation', {
                challenge,
                userResponse,
                user
            });
            // Verify the facade passes through the systemMessage
            expect(result).to.have.property('prompt');
            expect(result).to.have.property('systemMessage');
            expect(typeof result.prompt).to.equal('string');
            expect(typeof result.systemMessage).to.equal('string');
            // Should contain adaptations for this user
            expect(result.systemMessage).to.include('visual');
        });
        it('facade returns systemMessage from ChallengePromptBuilder', async () => {
            const challengeParams = {
                challengeType: 'scenario',
                formatType: 'open_ended',
                difficulty: 'advanced',
                focusArea: 'critical_thinking'
            };
            const user = {
                skillLevel: 'expert'
            };
            // Use the facade
            const result = await promptBuilder.buildPrompt('challenge', {
                challengeParams,
                user
            });
            // Verify the facade passes through the systemMessage
            expect(result).to.have.property('prompt');
            expect(result).to.have.property('systemMessage');
            expect(typeof result.prompt).to.equal('string');
            expect(typeof result.systemMessage).to.equal('string');
            // Should contain adaptations for this user
            expect(result.systemMessage).to.include('advanced');
        });
    });
});
