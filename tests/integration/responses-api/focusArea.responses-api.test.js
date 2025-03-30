import { config } from "dotenv";
import openai from "../../../src/infra/openai.js";
import config from "../../../src/infra/openai/config.js";
import FocusAreaGenerationService from "../../../src/core/focusArea/services/focusAreaGenerationService.js";
import promptBuilder from "../../../src/core/prompt/promptBuilder.js";
import { expect } from "chai";
/**
 * Focus Area Generation - Responses API Integration Test
 *
 * This tests the REAL focus area generation implementation with the OpenAI Responses API.
 * It uses actual user data with dynamic system prompts to match production behavior.
 */
config.config();
process.env.NODE_ENV = 'test'; // Enable mock mode for dependencies
// Import the actual implementation from the source code
const { OpenAIClient } = openai;
const { MessageRole } = config;
// Import or create a mock FocusArea class
const FocusArea = class FocusArea {
    /**
     *
     */
    constructor(data) {
        Object.assign(this, data);
    }
};
describe('Focus Area Generation with Responses API', function () {
    // Set long timeout for API calls
    this.timeout(30000);
    // Skip if OPENAI_API_KEY isn't set
    before(function () {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('OPENAI_API_KEY not found, skipping Responses API tests');
            this.skip();
        }
    });
    it('should generate personalized focus areas using the Responses API', async function () {
        // Initialize our own client with the OpenAI API key
        const openAIClient = new OpenAIClient({
            config,
            apiKey: process.env.OPENAI_API_KEY
        });
        // Create the actual focus area generation service with the real dependencies
        const focusAreaGenerationService = new FocusAreaGenerationService({
            openAIClient,
            promptBuilder,
            FocusArea,
            MessageRole
        });
        // Real user data with personality traits and AI attitudes
        const realUserData = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            personality_traits: {
                openness: 78,
                conscientiousness: 65,
                extraversion: 52,
                agreeableness: 70,
                neuroticism: 45
            },
            ai_attitudes: {
                trust: 72,
                autonomy: 64,
                transparency: 85
            },
            professional_title: 'Product Manager',
            location: 'San Francisco'
        };
        // Challenge history (to show improvement areas)
        const challengeHistory = [
            {
                id: 'challenge-1',
                type: 'communication',
                title: 'Explain AI Ethics to Non-Technical Audience',
                completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                score: 85
            },
            {
                id: 'challenge-2',
                type: 'strategic-thinking',
                title: 'AI Implementation Strategy',
                completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                score: 72
            }
        ];
        // Progress data to influence recommendations
        const progressData = {
            totalChallenges: 8,
            avgScore: 76,
            weakAreas: ['technical-depth', 'stakeholder-communication'],
            strongAreas: ['ethical-reasoning', 'policy-understanding']
        };
        // Call the actual focus area generation service with real data
        const focusAreas = await focusAreaGenerationService.generateFocusAreas(realUserData, challengeHistory, progressData, {
            threadId: 'test-thread-id',
            count: 2,
            temperature: 0.8
        });
        // Verify the results
        expect(focusAreas).to.be.an('array');
        expect(focusAreas.length).to.equal(2);
        // Verify the structure and content of the focus areas
        focusAreas.forEach(area => {
            expect(area.name).to.be.a('string').and.not.empty;
            expect(area.description).to.be.a('string').and.not.empty;
            expect(area.priority).to.be.a('number').within(1, 3);
            expect(area.userId).to.equal(realUserData.id);
            // Verify metadata
            expect(area.metadata).to.be.an('object');
            expect(area.metadata.responseId).to.be.a('string').and.not.empty;
            expect(area.metadata.rationale).to.be.a('string').and.not.empty;
            expect(area.metadata.improvementStrategies).to.be.an('array').with.lengthOf.at.least(1);
            // Verify that the recommendations are personalized based on user data
            const rationale = area.metadata.rationale.toLowerCase();
            // Look for references to user profile in the rationale
            const hasPersonalization = rationale.includes('openness') ||
                rationale.includes('transparency') ||
                rationale.includes('trust') ||
                rationale.includes('autonomy') ||
                rationale.includes('san francisco');
            expect(hasPersonalization).to.be.true;
        });
    });
});
