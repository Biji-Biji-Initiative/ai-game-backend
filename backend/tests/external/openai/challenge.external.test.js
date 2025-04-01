import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { config } from "dotenv";
import openai from "@/infra/openai";
({ config }.config());
describe('External: Challenge OpenAI Integration', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Skip if API keys not available
    before(function () {
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping external OpenAI tests');
            this.skip();
        }
    });
    // Set longer timeout for API calls
    this.timeout(30000);
    let openaiClient;
    beforeEach(function () {
        // Create OpenAI client
        const { OpenAIClient } = openai;
        openaiClient = new OpenAIClient({ apiKey: testEnv.getTestConfig().openai.apiKey
        });
    });
    it('should generate a challenge using OpenAI API', async function () {
        // 1. ARRANGE
        const category = 'logical-reasoning';
        const prompt = `Generate a cognitive challenge in the ${category} category. 
      The challenge should test critical thinking and problem-solving abilities.
      Format the response as a JSON object with these properties:
      title: A catchy title for the challenge
      description: A detailed description of the challenge
      difficulty: The difficulty level (easy, medium, or hard)`;
        // 2. ACT
        const completion = await openaiClient.responses.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an expert at creating engaging cognitive challenges that test problem-solving abilities.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });
        // Parse the response
        const responseText = completion.choices[0].message.content;
        const challengeData = JSON.parse(responseText);
        // 3. ASSERT
        expect(challengeData).to.exist;
        expect(challengeData.title).to.be.a('string').and.not.empty;
        expect(challengeData.description).to.be.a('string').and.not.empty;
        expect(challengeData.difficulty).to.be.a('string').and.to.be.oneOf(['easy', 'medium', 'hard']);
        // Log the challenge for reference
        console.log('Generated Challenge:', {
            title: challengeData.title,
            difficulty: challengeData.difficulty
        });
    });
    it('should handle different challenge categories', async function () {
        // Test a different category to ensure flexibility
        const category = 'critical-thinking';
        const prompt = `Generate a cognitive challenge in the ${category} category. 
      The challenge should test critical thinking and problem-solving abilities.
      Format the response as a JSON object with these properties:
      title: A catchy title for the challenge
      description: A detailed description of the challenge
      difficulty: The difficulty level (easy, medium, or hard)`;
        const completion = await openaiClient.responses.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an expert at creating engaging cognitive challenges that test problem-solving abilities.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });
        // Parse the response
        const responseText = completion.choices[0].message.content;
        const challengeData = JSON.parse(responseText);
        // Verify the challenge data structure
        expect(challengeData).to.exist;
        expect(challengeData.title).to.be.a('string').and.not.empty;
        expect(challengeData.description).to.be.a('string').and.not.empty;
        expect(challengeData.difficulty).to.be.a('string').and.to.be.oneOf(['easy', 'medium', 'hard']);
        // Log the challenge for reference
        console.log('Generated Challenge (Different Category):', {
            title: challengeData.title,
            difficulty: challengeData.difficulty
        });
    });
});
