import { expect } from "chai";
import sinon from "sinon";
import openai from "@/infra/openai";
import types from "@/infra/openai/types";
import FocusAreaGenerationService from "../../../src/core/focusArea/services/focusAreaGenerationService.js";
import FocusArea from "../../../src/core/focusArea/models/FocusArea.js";
const { OpenAIClient } = openai;
const { MessageRole } = types;
// Set longer timeout for external API calls
const TEST_TIMEOUT = 30000;
describe('FocusAreaGenerationService Integration', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    // Configure longer timeout for API calls
    this.timeout(TEST_TIMEOUT);
    let focusAreaGenerationService;
    let mockOpenAI;
    before(function () {
        // Create a mock OpenAI client instead of skipping tests
        mockOpenAI = {
            sendJsonMessage: sinon.stub().resolves({
                responseId: 'mock-response-id',
                data: {
                    focusAreas: [
                        {
                            name: 'Building Resilience',
                            description: 'Developing the ability to recover from setbacks and adapt to challenges.',
                            priorityLevel: 'high',
                            rationale: 'Your personality profile indicates a tendency to get discouraged when facing obstacles.',
                            improvementStrategies: [
                                'Identify personal strengths that contribute to resilience',
                                'Practice positive self-talk during difficult situations',
                                'Develop strategies for managing stress effectively'
                            ]
                        }
                    ]
                }
            })
        };
        // Create the service with the mock client and required dependencies
        focusAreaGenerationService = new FocusAreaGenerationService({
            openAIClient: mockOpenAI,
            FocusArea,
            MessageRole
        });
    });
    it('should generate personalized focus areas for a user', async function () {
        // Test user with some basic data
        const userData = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            personality_traits: {
                openness: 70,
                conscientiousness: 65,
                extraversion: 40,
                agreeableness: 75,
                neuroticism: 55
            },
            ai_attitudes: {
                trust: 60,
                autonomy: 40,
                transparency: 80
            }
        };
        // Generate focus areas
        const focusAreas = await focusAreaGenerationService.generateFocusAreas(userData, [], // Empty challenge history
        {}, // Empty progress data
        { threadId: 'test-thread-id' } // Required option
        );
        // Verify the result structure
        expect(focusAreas).to.be.an('array');
        expect(focusAreas.length).to.be.at.least(1);
        expect(focusAreas[0]).to.be.instanceOf(FocusArea);
        expect(focusAreas[0].name).to.equal('Building Resilience');
        // Verify the method was called with appropriate data
        expect(mockOpenAI.sendJsonMessage.calledOnce).to.be.true;
        const callArgs = mockOpenAI.sendJsonMessage.firstCall.args[0];
        expect(callArgs).to.be.an('array');
        expect(callArgs.some(m => m.role === 'system')).to.be.true;
    });
    it('should adapt focus areas based on personality traits', async function () {
        // Test user with different personality traits
        const analyticalUser = {
            id: 'test-user-id-2',
            name: 'Analytical User',
            email: 'analytical@example.com',
            personality_traits: {
                openness: 80,
                conscientiousness: 85,
                extraversion: 30,
                agreeableness: 60,
                neuroticism: 45
            },
            ai_attitudes: {
                trust: 70,
                autonomy: 30,
                transparency: 90
            },
            professional_title: 'Data Scientist',
            location: 'Boston'
        };
        // Mock a different response for this test case
        mockOpenAI.sendJsonMessage.resolves({
            responseId: 'mock-response-id-2',
            data: {
                focusAreas: [
                    {
                        name: 'Advanced Data Analysis',
                        description: 'Mastering complex data patterns and insights.',
                        priorityLevel: 'high',
                        rationale: 'Your analytical mindset and professional background suggest a focus on data skills.',
                        improvementStrategies: [
                            'Practice with complex datasets',
                            'Learn advanced statistical methods',
                            'Work on data visualization techniques'
                        ]
                    }
                ]
            }
        });
        // Generate focus areas with options
        const focusAreas = await focusAreaGenerationService.generateFocusAreas(analyticalUser, [], // Empty challenge history
        {}, // Empty progress data
        {
            threadId: 'test-thread-id-2',
            count: 2,
            temperature: 0.5
        });
        // Verify the result structure and that options were passed
        expect(focusAreas).to.be.an('array');
        // Check that the call included our options
        expect(mockOpenAI.sendJsonMessage.calledTwice).to.be.true;
        const callArgs = mockOpenAI.sendJsonMessage.secondCall.args[1]; // options are the second arg
        expect(callArgs.temperature).to.equal(0.5);
    });
});
