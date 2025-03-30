import { expect } from "chai";
import testHelper from "../testHelper";
import promptBuilder from "../../../src/core/prompt/promptBuilder.js";
import focusAreaGenerationService from "../../../src/core/focusArea/services/focusAreaGenerationService.js";
import FocusArea from "../../../src/core/focusArea/models/FocusArea.js";
import { PROMPT_TYPES } from "../../../src/core/prompt/promptTypes.js";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
describe('Focus Area Generation with Real APIs', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Set longer timeout for real API calls
    this.timeout(30000);
    let testUser;
    let threadId;
    before(async function () {
        // Skip tests if OpenAI API key is not available
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('Skipping tests: OPENAI_API_KEY not available');
            this.skip();
        }
        // Create test user and thread
        testUser = await testHelper.setupTestUser();
        threadId = await testHelper.createThread();
        console.log(`Test setup complete. User ID: ${testUser.id}, Thread ID: ${threadId}`);
    });
    after(async function () {
        // Clean up test data
        if (testUser && testUser.id) {
            await testHelper.cleanupTestData(testUser.id);
        }
    });
    it('should generate a focus area prompt using our prompt builder', async function () {
        // Skip if no thread ID
        if (!threadId) {
            this.skip();
        }
        // Create the parameters for the prompt builder
        const params = {
            user: {
                traits: testUser.personality_traits,
                attitudes: testUser.ai_attitudes,
                professional_title: testUser.professionalTitle,
                location: testUser.location
            },
            options: {
                count: 3,
                creativeVariation: 0.7
            }
        };
        // Use our actual promptBuilder to build the prompt
        const prompt = await promptBuilder.buildPrompt(PROMPT_TYPES.FOCUS_AREA, params);
        // Verify the prompt was created correctly
        expect(prompt).to.be.a('string');
        expect(prompt.length).to.be.greaterThan(100);
        // Verify the prompt contains relevant user info
        if (testUser.professionalTitle) {
            expect(prompt).to.include(testUser.professionalTitle);
        }
        console.log(`Generated focus area prompt with ${prompt.length} characters`);
    });
    it('should generate focus areas using the actual service', async function () {
        // Skip if no test user or thread ID
        if (!testUser || !threadId) {
            this.skip();
        }
        // Create challenge history (mock)
        const challengeHistory = [
            {
                focus_area: 'Effective questioning',
                score: 80,
                strengths: ['clarity', 'specificity'],
                weaknesses: ['verbosity']
            }
        ];
        // Use our actual focusAreaGenerationService
        const focusAreas = await focusAreaGenerationService.generateFocusAreas(testUser, challengeHistory, { skillLevels: { questioning: 7, instructions: 6 } }, {
            threadId,
            count: 2,
            temperature: 0.7
        });
        // Verify we got focus areas back
        expect(focusAreas).to.be.an('array');
        expect(focusAreas.length).to.be.at.least(1);
        // Verify they are FocusArea domain objects
        expect(focusAreas[0]).to.be.instanceOf(FocusArea);
        // Verify the focus areas have the expected properties
        focusAreas.forEach(area => {
            expect(area.userId).to.equal(testUser.id);
            expect(area.name).to.be.a('string');
            expect(area.description).to.be.a('string');
            expect(area.metadata).to.be.an('object');
        });
        console.log(`Generated ${focusAreas.length} focus areas with real service`);
        console.log(`Focus areas: ${focusAreas.map(fa => fa.name).join(', ')}`);
    });
    it('should use real cross-domain integration with challenge data', async function () {
        // Skip if no test user or thread ID
        if (!testUser || !threadId) {
            this.skip();
        }
        // Create a more comprehensive challenge history with varied data
        const challengeHistory = [
            {
                id: 'ch1',
                focus_area: 'Data Analysis',
                type: 'scenario',
                score: 85,
                strengths: ['critical thinking', 'attention to detail'],
                weaknesses: ['explanation clarity']
            },
            {
                id: 'ch2',
                focus_area: 'Clear Instructions',
                type: 'open-ended',
                score: 70,
                strengths: ['structure', 'thoroughness'],
                weaknesses: ['conciseness', 'specificity']
            }
        ];
        // Progress data that might influence focus area recommendations
        const progressData = {
            completedChallenges: 5,
            averageScore: 75,
            strengths: ['analytical thinking', 'problem solving'],
            weaknesses: ['communication efficiency', 'instruction clarity'],
            skillLevels: {
                'data-analysis': 8,
                'instruction-giving': 6,
                'question-formulation': 7,
                'feedback-processing': 5
            },
            learningGoals: ['improve instruction clarity', 'enhance data interpretation skills']
        };
        // Generate focus areas with the real service
        const focusAreas = await focusAreaGenerationService.generateFocusAreas(testUser, challengeHistory, progressData, {
            threadId,
            count: 3,
            temperature: 0.8,
            forceRefresh: true // Ensure we don't get cached results
        });
        // Verify we got focus areas
        expect(focusAreas).to.be.an('array');
        expect(focusAreas.length).to.be.at.least(1);
        // Detailed validation of the generated focus areas
        focusAreas.forEach(area => {
            // Verify domain object properties
            expect(area).to.be.instanceOf(FocusArea);
            expect(area.name).to.be.a('string').with.length.greaterThan(3);
            expect(area.description).to.be.a('string').with.length.greaterThan(10);
            expect(area.priority).to.be.a('number').within(1, 3);
            // Verify metadata was populated with rich information
            expect(area.metadata).to.be.an('object');
            expect(area.metadata.responseId).to.be.a('string');
            // Check for recommended challenge types if available
            if (area.metadata.recommendedChallengeTypes) {
                expect(area.metadata.recommendedChallengeTypes).to.be.an('array');
            }
            // Check for rationale if available
            if (area.metadata.rationale) {
                expect(area.metadata.rationale).to.be.a('string').with.length.greaterThan(10);
            }
        });
        console.log(`Generated ${focusAreas.length} focus areas with challenge data integration`);
        // Output details for manual inspection
        focusAreas.forEach(area => {
            console.log(`\nFocus Area: ${area.name}`);
            console.log(`Priority: ${area.priority}`);
            console.log(`Description: ${area.description.substring(0, 100)}...`);
        });
    });
});
