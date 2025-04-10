import { expect } from "chai";
import openai from "@/infra/openai";
import types from "@/infra/openai/types";
import FocusAreaGenerationService from "@/core/focusArea/services/focusAreaGenerationService.js";
import FocusArea from "@/core/focusArea/models/FocusArea.js";
import promptBuilder from "@/core/prompt/promptBuilder.js";
import { getTestConfig, hasRequiredVars } from "../../config/testConfig.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
const { OpenAIClient } = openai;
const { MessageRole } = types;
// Set longer timeout for external API calls
const TEST_TIMEOUT = 30000;
describe('FocusAreaGenerationService Responses API Integration', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Configure longer timeout for API calls
    this.timeout(TEST_TIMEOUT);
    let focusAreaGenerationService;
    let openAIClient;
    before(function () {
        // Skip tests if OpenAI API key is not available
        if (!getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping Responses API tests');
            this.skip();
        }
        // Initialize the real OpenAI client with Responses API support
        openAIClient = new OpenAIClient({
            apiKey: getTestConfig().openai.apiKey
        });
        // Create the service with the real client and required dependencies
        focusAreaGenerationService = new FocusAreaGenerationService({
            openAIClient,
            promptBuilder,
            FocusArea,
            MessageRole
        });
    });
    it('should generate personalized focus areas using the Responses API', async function () {
        // Real user data with personality traits and AI attitudes
        const userData = {
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
        // Challenge history to show improvement areas
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
        // Generate focus areas with the real OpenAI client
        const focusAreas = await focusAreaGenerationService.generateFocusAreas(userData, challengeHistory, progressData, {
            threadId: 'test-thread-id',
            count: 2,
            temperature: 0.8
        });
        // Verify results
        expect(focusAreas).to.be.an('array');
        expect(focusAreas.length).to.equal(2);
        expect(focusAreas[0]).to.be.instanceOf(FocusArea);
        // Verify each focus area structure
        focusAreas.forEach(area => {
            expect(area.name).to.be.a('string').and.not.empty;
            expect(area.description).to.be.a('string').and.not.empty;
            expect(area.priority).to.be.a('number').within(1, 3);
            expect(area.userId).to.equal(userData.id);
            // Verify metadata
            expect(area.metadata).to.be.an('object');
            expect(area.metadata.responseId).to.be.a('string').and.not.empty;
            expect(area.metadata.rationale).to.be.a('string').and.not.empty;
            expect(area.metadata.improvementStrategies).to.be.an('array').with.lengthOf.at.least(1);
            // Log the focus area details
            console.log(`\nFocus Area: ${area.name}`);
            console.log(`Priority: ${area.priority}`);
            console.log(`Description: ${area.description.substring(0, 100)}...`);
        });
    });
    it('should personalize focus areas based on user traits', async function () {
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
        // Generate focus areas with different user profile
        const focusAreas = await focusAreaGenerationService.generateFocusAreas(analyticalUser, [], // Empty challenge history
        {}, // Empty progress data
        {
            threadId: 'test-thread-id-2',
            count: 1, // Just generate one for speed
            temperature: 0.5
        });
        // Verify results
        expect(focusAreas).to.be.an('array');
        expect(focusAreas.length).to.equal(1);
        expect(focusAreas[0]).to.be.instanceOf(FocusArea);
        // Verify personalization
        const focusArea = focusAreas[0];
        const rationale = focusArea.metadata.rationale.toLowerCase();
        // Check for references to the analytical user's profile
        const hasPersonalization = rationale.includes('data scientist') ||
            rationale.includes('analytical') ||
            rationale.includes('boston') ||
            rationale.includes('conscientiousness') ||
            rationale.includes('technical');
        expect(hasPersonalization).to.be.true;
        // Log the focus area
        console.log(`\nAnalytical User Focus Area: ${focusArea.name}`);
        console.log(`Rationale: ${focusArea.metadata.rationale}`);
    });
});
