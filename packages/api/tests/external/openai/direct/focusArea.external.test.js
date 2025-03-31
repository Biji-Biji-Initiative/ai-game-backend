import { jest } from '@jest/globals';
import { expect } from "chai";
import openai from '@src/infra/openai.js';
import types from '@src/infra/openai/types.js';
import testEnv from "@tests/loadEnv.js";
import { skipIfMissingEnv } from "@helpers/testHelpers.js";
import { config } from "dotenv";
const { OpenAIClient } = openai;
const { MessageRole } = types;
({ config }.config());
describe('External: OpenAI Focus Area Integration', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Configure longer timeout for external API calls
    jest.setTimeout(30000);
    let openAIClient;
    before(function () {
        // Skip tests if OpenAI API key is not available
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping external tests');
            this.skip();
        }
        // Initialize OpenAI client using our wrapper
        openAIClient = new OpenAIClient({
            apiKey: testEnv.getTestConfig().openai.apiKey
        });
    });
    it('should generate focus area recommendations using OpenAI', async function () {
        // Create the focus area recommendation prompt
        const userProfile = {
            professionalTitle: 'Product Manager',
            interests: ['AI ethics', 'Product development', 'User experience'],
            skills: ['Project management', 'Data analysis', 'Team leadership']
        };
        const systemPrompt = 'You are an expert career advisor specializing in AI skill development.';
        const userPrompt = `Based on the following user profile, recommend a focus area for their AI skills development:
    
    Professional Title: ${userProfile.professionalTitle}
    Interests: ${userProfile.interests.join(', ')}
    Skills: ${userProfile.skills.join(', ')}
    
    Provide a recommendation in JSON format with these properties:
    name: The name of the focus area (choose from: AI Ethics, Human-AI Collaboration, AI Applications, AI Safety)
    description: A detailed description of why this focus area is appropriate for the user
    skills: An array of 3-5 specific skills to develop in this focus area`;
        // Call OpenAI API using our wrapper
        const response = await openAIClient.sendJsonMessage([
            { role: MessageRole.SYSTEM, content: systemPrompt },
            { role: MessageRole.USER, content: userPrompt }
        ], {
            model: 'gpt-4o',
            temperature: 0.7,
            responseFormat: 'json'
        });
        // Verify the OpenAI response
        expect(response).to.exist;
        expect(response.data).to.be.an('object');
        // Verify the content
        const responseData = response.data;
        expect(responseData.name).to.be.oneOf(['AI Ethics', 'Human-AI Collaboration', 'AI Applications', 'AI Safety']);
        expect(responseData.description).to.be.a('string').and.not.empty;
        expect(responseData.skills).to.be.an('array').with.lengthOf.at.least(3);
        console.log('OpenAI Recommendation:', responseData.name);
        console.log('Skills:', responseData.skills.join(', '));
    });
    it('should handle different user profiles appropriately', async function () {
        // Technical user profile
        const technicalProfile = {
            professionalTitle: 'Software Engineer',
            interests: ['Machine learning', 'Data structures', 'Algorithm optimization'],
            skills: ['Python', 'TensorFlow', 'JavaScript', 'SQL']
        };
        const systemPrompt = 'You are an expert career advisor specializing in AI skill development.';
        const userPrompt = `Based on the following user profile, recommend a focus area for their AI skills development:
    
    Professional Title: ${technicalProfile.professionalTitle}
    Interests: ${technicalProfile.interests.join(', ')}
    Skills: ${technicalProfile.skills.join(', ')}
    
    Provide a recommendation in JSON format with these properties:
    name: The name of the focus area (choose from: AI Ethics, Human-AI Collaboration, AI Applications, AI Safety)
    description: A detailed description of why this focus area is appropriate for the user
    skills: An array of 3-5 specific skills to develop in this focus area`;
        // Call OpenAI API using our wrapper
        const response = await openAIClient.sendJsonMessage([
            { role: MessageRole.SYSTEM, content: systemPrompt },
            { role: MessageRole.USER, content: userPrompt }
        ], {
            model: 'gpt-4o',
            temperature: 0.7,
            responseFormat: 'json'
        });
        // Verify the response
        const responseData = response.data;
        // Log the entire recommendation for debugging
        console.log('Technical Profile Recommendation:', responseData.name);
        console.log('Description:', responseData.description);
        // Check for technical terms in the recommendation rather than specific strings
        // This makes the test more robust to different response formats
        const technicalTerms = ['python', 'tensorflow', 'machine learning', 'algorithm', 'coding', 'programming', 'developer', 'engineer'];
        const descriptionLower = responseData.description.toLowerCase();
        const containsTechnicalTerm = technicalTerms.some(term => descriptionLower.includes(term));
        expect(containsTechnicalTerm).to.be.true;
        expect(responseData.skills).to.be.an('array').with.lengthOf.at.least(3);
    });
});
