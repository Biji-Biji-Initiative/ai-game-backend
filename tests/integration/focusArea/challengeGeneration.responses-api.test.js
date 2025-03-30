import { expect } from "chai";
import openai from "@/infra/openai";
import types from "@/infra/openai/types";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
const { OpenAIClient } = openai;
const { MessageRole } = types;
// Create a simplified ChallengeGenerationService for testing
/**
 *
 */
class ChallengeGenerationService {
    /**
     *
     */
    constructor({ openAIClient, MessageRole }) {
        this.openAIClient = openAIClient;
        this.MessageRole = MessageRole;
    }
    /**
     *
     */
    async generateChallenge(options = {}) {
        try {
            // Extract options
            const userId = options.userId || 'test-user-id';
            const focusArea = options.focusArea || 'AI Ethics';
            const difficulty = options.difficulty || 'intermediate';
            // Create messages for challenge generation
            const messages = [
                {
                    role: this.MessageRole.SYSTEM,
                    content: `You are an expert in creating educational challenges for ${focusArea}.
Create a challenge that tests understanding and application of concepts in this area.
The challenge should be at ${difficulty} difficulty level.
Return your response as a JSON object with these fields:
- title: string - The challenge title
- description: string - Brief overview of what the challenge is about
- content: object - The actual challenge content with scenario and questions
- difficulty: string - The difficulty level (beginner, intermediate, advanced)
- learningObjectives: array - 2-4 learning objectives for this challenge
- keywords: array - 3-7 relevant keywords`
                },
                {
                    role: this.MessageRole.USER,
                    content: `Please create a ${difficulty} level challenge for the ${focusArea} focus area.

The challenge should be a case study or scenario that requires critical thinking.
It should include a realistic scenario and 2-3 questions that test understanding and application.
Be specific and provide enough context in the scenario for someone to give a thoughtful response.

Include relevant learning objectives and keywords in your JSON response.`
                }
            ];
            // Call the OpenAI client
            const response = await this.openAIClient.sendJsonMessage(messages, {
                model: 'gpt-4o',
                temperature: 0.7,
                responseFormat: 'json'
            });
            // Create challenge object from response
            const challengeData = response.data;
            const challenge = {
                id: uuidv4(),
                userId,
                title: challengeData.title,
                description: challengeData.description,
                content: challengeData.content,
                difficulty: challengeData.difficulty || difficulty,
                focusArea: challengeData.focusArea || focusArea,
                challengeType: challengeData.challengeType || 'critical-analysis',
                formatType: challengeData.formatType || 'case-study',
                estimatedTime: challengeData.estimatedTime || 15,
                keywords: challengeData.keywords || [],
                learningObjectives: challengeData.learningObjectives || [],
                responseId: response.responseId,
                aiGenerated: true,
                createdAt: new Date().toISOString()
            };
            return challenge;
        }
        catch (error) {
            console.error('Error generating challenge:', error);
            throw new Error(`Challenge generation failed: ${error.message}`);
        }
    }
}
// Set longer timeout for external API calls
const TEST_TIMEOUT = 30000;
describe('Challenge Generation Responses API Integration', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Configure longer timeout for API calls
    this.timeout(TEST_TIMEOUT);
    let challengeGenerationService;
    let openAIClient;
    before(function () {
        // Skip tests if OpenAI API key is not available
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping Responses API tests');
            this.skip();
        }
        // Initialize the real OpenAI client with Responses API support
        openAIClient = new OpenAIClient({
            apiKey: testEnv.getTestConfig().openai.apiKey
        });
        // Create the service with the real client
        challengeGenerationService = new ChallengeGenerationService({
            openAIClient,
            MessageRole
        });
    });
    it('should generate a challenge using the Responses API', async function () {
        // Generate a challenge
        const challenge = await challengeGenerationService.generateChallenge({
            focusArea: 'AI Ethics',
            difficulty: 'intermediate'
        });
        // Verify challenge structure
        expect(challenge).to.be.an('object');
        expect(challenge.id).to.be.a('string');
        expect(challenge.title).to.be.a('string').and.not.empty;
        expect(challenge.description).to.be.a('string').and.not.empty;
        expect(challenge.content).to.be.an('object');
        expect(challenge.difficulty).to.equal('intermediate');
        expect(challenge.focusArea).to.equal('AI Ethics');
        expect(challenge.learningObjectives).to.be.an('array').with.lengthOf.at.least(1);
        expect(challenge.keywords).to.be.an('array').with.lengthOf.at.least(1);
        expect(challenge.responseId).to.be.a('string').and.match(/^resp_/);
        // Log challenge details
        console.log(`\nGenerated Challenge: ${challenge.title}`);
        console.log(`Description: ${challenge.description}`);
        console.log(`Learning Objectives: ${challenge.learningObjectives.join(', ')}`);
        console.log(`Keywords: ${challenge.keywords.join(', ')}`);
    });
    it('should generate challenges with different focus areas and difficulties', async function () {
        // Define different combinations to test
        const combinations = [
            { focusArea: 'AI Ethics', difficulty: 'beginner' },
            { focusArea: 'Data Privacy', difficulty: 'advanced' }
        ];
        // Generate challenges for each combination
        for (const { focusArea, difficulty } of combinations) {
            const challenge = await challengeGenerationService.generateChallenge({
                focusArea,
                difficulty
            });
            // Verify challenge
            expect(challenge).to.be.an('object');
            expect(challenge.title).to.be.a('string').and.not.empty;
            expect(challenge.difficulty).to.equal(difficulty);
            expect(challenge.focusArea).to.equal(focusArea);
            // Log challenge title
            console.log(`\n${focusArea} (${difficulty}): ${challenge.title}`);
            // Check that the content is appropriate for the difficulty level
            if (difficulty === 'beginner') {
                expect(challenge.content.scenario).to.be.a('string');
                // We can't deterministically check content difficulty, but we could
                // potentially check readability scores or keyword complexity
            }
            else if (difficulty === 'advanced') {
                expect(challenge.content.scenario).to.be.a('string');
                // Again, automated verification of difficulty is challenging
            }
        }
    });
});
