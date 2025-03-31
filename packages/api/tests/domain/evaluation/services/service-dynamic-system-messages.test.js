import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import dynamicPromptService from "@src/core/evaluation/services/dynamicPromptService.js";
import evaluationCategoryRepository from "@src/core/evaluation/repositories/evaluationCategoryRepository.js";
const { generateDynamicPrompt } = dynamicPromptService;
describe('Dynamic Prompt Service', () => {
    let sandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        // Stub the category description repository
        sandbox.stub(evaluationCategoryRepository, 'getCategoryDescriptions').resolves({
            critical_thinking: 'Assess depth of analysis and consideration of alternatives',
            clarity: 'Evaluate organization and clarity of expression',
            relevance: 'Judge how well the response addresses the challenge',
            insight: 'Evaluate the presence of meaningful observations'
        });
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('generateDynamicPrompt', () => {
        it('should generate a basic prompt with minimal input', () => {
            // Arrange
            const challenge = {
                id: 'test-challenge-1',
                title: 'Test Challenge',
                challengeType: 'critical-thinking',
                focusArea: 'ai-ethics',
                content: 'Analyze the ethical implications of AI in healthcare'
            };
            const userResponse = 'This is a test response about AI ethics in healthcare';
            const criteria = {
                categoryWeights: {
                    critical_thinking: 40,
                    clarity: 20,
                    relevance: 20,
                    insight: 20
                },
                skillLevel: 'intermediate'
            };
            // Act
            const result = generateDynamicPrompt({
                challenge,
                userResponse,
                userContext: {},
                criteria
            });
            // Assert
            expect(result).to.be.an('object');
            expect(result.systemMessage).to.be.a('string');
            expect(result.userMessage).to.be.a('string');
            expect(result.responseFormat).to.be.a('string');
            // Check system message content
            expect(result.systemMessage).to.include('AI evaluation expert');
            expect(result.systemMessage).to.include('ai-ethics');
            expect(result.systemMessage).to.include('critical-thinking');
            expect(result.systemMessage).to.include('intermediate-level user');
            // Check metadata
            expect(result.metadata).to.be.an('object');
            expect(result.metadata.promptVersion).to.equal('2.0');
            expect(result.metadata.challengeType).to.equal('critical-thinking');
            expect(result.metadata.focusArea).to.equal('ai-ethics');
        });
        it('should include user strengths and weaknesses when provided', () => {
            // Arrange
            const challenge = {
                id: 'test-challenge-2',
                title: 'Advanced Challenge',
                challengeType: 'case-study',
                focusArea: 'ai-ethics',
                content: 'Analyze this case study on AI in healthcare'
            };
            const userResponse = 'This is a detailed analysis of the case study...';
            const criteria = {
                categoryWeights: {
                    critical_thinking: 30,
                    clarity: 20,
                    relevance: 25,
                    insight: 25
                },
                skillLevel: 'advanced',
                consistentStrengths: ['conceptual understanding', 'analytical thinking'],
                persistentWeaknesses: ['practical application', 'specific examples'],
                learningGoals: ['improving practical implementation', 'ethical considerations']
            };
            // Act
            const result = generateDynamicPrompt({
                challenge,
                userResponse,
                userContext: {
                    profile: {
                        skillLevel: 'advanced'
                    }
                },
                criteria
            });
            // Assert
            expect(result.systemMessage).to.include('strength in: conceptual understanding, analytical thinking');
            expect(result.systemMessage).to.include('opportunity for growth: practical application, specific examples');
            expect(result.systemMessage).to.include('learning goals are: improving practical implementation, ethical considerations');
        });
        it('should include previous performance data when available', () => {
            // Arrange
            const challenge = {
                id: 'test-challenge-3',
                title: 'Follow-up Challenge',
                challengeType: 'analysis',
                focusArea: 'ai-impact',
                content: 'Analyze the impact of AI on job markets'
            };
            const userResponse = 'This is my analysis of AI impact on jobs...';
            const criteria = {
                categoryWeights: {
                    critical_thinking: 25,
                    clarity: 25,
                    relevance: 25,
                    insight: 25
                },
                skillLevel: 'intermediate',
                previousScores: {
                    overall: 78,
                    critical_thinking: 80,
                    clarity: 75,
                    relevance: 85,
                    insight: 70
                }
            };
            // Act
            const result = generateDynamicPrompt({
                challenge,
                userResponse,
                userContext: {
                    learningJourney: {
                        evaluationHistory: [
                            { challengeId: 'prev-1', overallScore: 78 }
                        ]
                    }
                },
                criteria
            });
            // Assert
            expect(result.userMessage).to.include('PREVIOUS PERFORMANCE');
            expect(result.userMessage).to.include('Previous Overall Score: 78');
            expect(result.userMessage).to.include('critical_thinking: 80');
            expect(result.userMessage).to.include('Compare current performance to previous submissions');
            // Should have comprehensive context level in metadata
            expect(result.metadata.userContextLevel).to.equal('comprehensive');
        });
        it('should handle structured challenge content', () => {
            // Arrange
            const challenge = {
                id: 'test-challenge-4',
                title: 'Structured Challenge',
                challengeType: 'problem-solving',
                focusArea: 'algorithm-design',
                content: {
                    context: 'You are designing an algorithm for a healthcare system',
                    scenario: 'The system needs to prioritize patient cases',
                    instructions: 'Design an algorithm that balances efficiency with ethical considerations'
                }
            };
            const userResponse = 'Here is my algorithm design: ...';
            const criteria = {
                categoryWeights: {
                    critical_thinking: 30,
                    clarity: 20,
                    relevance: 20,
                    insight: 30
                },
                skillLevel: 'expert',
                focusAreas: ['algorithm design', 'healthcare AI']
            };
            // Act
            const result = generateDynamicPrompt({
                challenge,
                userResponse,
                userContext: {
                    profile: {
                        skillLevel: 'expert'
                    }
                },
                criteria
            });
            // Assert
            expect(result.userMessage).to.include('CHALLENGE CONTENT');
            expect(result.userMessage).to.include('Context: You are designing an algorithm');
            expect(result.userMessage).to.include('Scenario: The system needs to prioritize');
            expect(result.userMessage).to.include('Instructions: Design an algorithm');
            // Check for focus areas
            expect(result.userMessage).to.include('Focus Areas: algorithm design, healthcare AI');
            expect(result.systemMessage).to.include('expert-level user focused on algorithm design, healthcare AI');
        });
        it('should handle errors gracefully', () => {
            // Arrange - invalid challenge with no title
            const invalidChallenge = {
                id: 'invalid-challenge'
                // Missing required fields
            };
            const userResponse = 'This is a test response';
            // Act
            const result = generateDynamicPrompt({
                challenge: invalidChallenge,
                userResponse,
                userContext: {},
                criteria: {}
            });
            // Assert - should return a basic fallback prompt
            expect(result).to.be.an('object');
            expect(result.systemMessage).to.include('objective feedback');
            expect(result.metadata.promptType).to.equal('basic-evaluation');
            expect(result.metadata).to.have.property('error');
        });
    });
});
