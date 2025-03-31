import { jest } from '@jest/globals';
import { expect } from "chai";
import openai from '@src/infra/openai.js';
import testEnv from "@tests/loadEnv.js";
import { skipIfMissingEnv } from "@helpers/testHelpers.js";
import { config } from "dotenv";
const { OpenAIClient } = openai;
({ config }.config());
describe('External: OpenAI Focus Area Integration', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Configure longer timeout for external API calls
    jest.setTimeout(30000);
    let openaiClient;
    before(function () {
        // Skip tests if OpenAI API key is not available
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping external tests');
            this.skip();
        }
        // Initialize OpenAI client
        openaiClient = new OpenAIClient({ apiKey: testEnv.getTestConfig().openai.apiKey
        });
    });
    it('should generate focus area recommendations using OpenAI', async function () {
        // Create the focus area recommendation prompt
        const userProfile = {
            professionalTitle: 'Product Manager',
            interests: ['AI ethics', 'Product development', 'User experience'],
            skills: ['Project management', 'Data analysis', 'Team leadership']
        };
        const prompt = `Based on the following user profile, recommend a focus area for their AI skills development:
    
    Professional Title: ${userProfile.professionalTitle}
    Interests: ${userProfile.interests.join(', ')}
    Skills: ${userProfile.skills.join(', ')}
    
    Provide a recommendation in JSON format with these properties:
    name: The name of the focus area (choose from: AI Ethics, Human-AI Collaboration, AI Applications, AI Safety)
    description: A detailed description of why this focus area is appropriate for the user
    skills: An array of 3-5 specific skills to develop in this focus area`;
        // Call OpenAI API
        const completion = await openaiClient.responses.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: 'You are an expert career advisor specializing in AI skill development.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }, model: 'gpt-4-turbo-preview'
        });
        // Verify the OpenAI response
        expect(completion).to.exist;
        expect(completion.choices).to.be.an('array').with.lengthOf.at.least(1);
        expect(completion.choices[0].message).to.exist;
        expect(completion.choices[0].message.content).to.be.a('string');
        // Parse and verify the content
        const responseData = JSON.parse(completion.choices[0].message.content);
        expect(responseData).to.be.an('object');
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
        const prompt = `Based on the following user profile, recommend a focus area for their AI skills development:
    
    Professional Title: ${technicalProfile.professionalTitle}
    Interests: ${technicalProfile.interests.join(', ')}
    Skills: ${technicalProfile.skills.join(', ')}
    
    Provide a recommendation in JSON format with these properties:
    name: The name of the focus area (choose from: AI Ethics, Human-AI Collaboration, AI Applications, AI Safety)
    description: A detailed description of why this focus area is appropriate for the user
    skills: An array of 3-5 specific skills to develop in this focus area`;
        // Call OpenAI API
        const completion = await openaiClient.responses.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: 'You are an expert career advisor specializing in AI skill development.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }, model: 'gpt-4-turbo-preview'
        });
        // Parse response
        const responseData = JSON.parse(completion.choices[0].message.content);
        // Verify response makes sense for a technical profile
        expect(responseData.description).to.include('Software Engineer');
        expect(responseData.description.toLowerCase()).to.match(/python|tensorflow|machine learning|algorithm/i);
        console.log('Technical Profile Recommendation:', responseData.name);
    });
});
