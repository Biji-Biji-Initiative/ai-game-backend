import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "@/core/challenge/errors/ChallengeErrors.js";
// Import the Prompt model - adjust path as needed
let Prompt;
try {
    Prompt = require('../../../src/core/prompt/models/Prompt');
}
catch (ChallengeError) {
    // If the model can't be loaded, create a simple version for testing
    Prompt = class Prompt {
        /**
         *
         */
        constructor(data) {
            this.id = data.id || uuidv4();
            this.name = data.name;
            this.description = data.description;
            this.template = data.template;
            this.variables = data.variables || [];
            this.domain = data.domain || 'challenge';
            this.createdAt = data.createdAt || new Date().toISOString();
            this.userEmail = data.userEmail || 'test-user@example.com';
            this.isActive = data.isActive !== undefined ? data.isActive : true;
        }
    };
}
describe('Domain: Prompt Template Generator', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    // Test setup
    let promptService;
    let mockOpenAI;
    let mockRepository;
    let sandbox;
    beforeEach(function () {
        // Create a sandbox for this test
        sandbox = sinon.createSandbox();
        // Mock the OpenAI client
        mockOpenAI = {
            chat: {
                completions: {
                    create: sandbox.stub().resolves({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        name: 'Test Prompt Template',
                                        description: 'This is a test prompt template generated by AI',
                                        template: 'Create a {type} that focuses on {topic} and includes details about {detail}.',
                                        variables: ['type', 'topic', 'detail']
                                    })
                                }
                            }
                        ]
                    })
                }
            }
        };
        // Mock the repository
        mockRepository = {
            save: sandbox.stub().callsFake(prompt => Promise.resolve(prompt)),
            findById: sandbox.stub().callsFake(id => Promise.resolve({ id }))
        };
        // Create prompt template generation service
        promptService = {
            generatePromptTemplate: async (domain, description) => {
                const prompt = `Create a prompt template for an AI system in the ${domain} domain.
        
        Description: ${description}
        
        Provide a response in JSON format with these properties:
        name: A name for the prompt template (short but descriptive)
        description: A detailed description of what this prompt does
        template: The actual prompt template text with variables in curly braces like {variable_name}
        variables: An array of variable names that should be replaced in the template`;
                const completion = await mockOpenAI.responses.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: 'You are an expert prompt engineer who specializes in creating effective prompts for AI systems.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' }
                });
                const responseText = completion.choices[0].message.content;
                const promptData = JSON.parse(responseText);
                // Create a Prompt domain model instance
                const promptTemplate = new Prompt({
                    id: uuidv4(),
                    name: promptData.name,
                    description: promptData.description,
                    template: promptData.template,
                    variables: promptData.variables,
                    domain: domain,
                    userEmail: 'test-user@example.com',
                    createdAt: new Date().toISOString(),
                    isActive: true
                });
                // Save to repository (optional in this test)
                await mockRepository.save(promptTemplate);
                return promptTemplate;
            }
        };
    });
    afterEach(function () {
        // Restore all stubs
        sandbox.restore();
    });
    it('should generate a prompt template using AI', async function () {
        // 1. ARRANGE
        const domain = 'challenge';
        const description = 'A prompt for generating logical reasoning challenges';
        // 2. ACT
        const promptTemplate = await promptService.generatePromptTemplate(domain, description);
        // 3. ASSERT
        expect(promptTemplate).to.exist;
        expect(promptTemplate.name).to.equal('Test Prompt Template');
        expect(promptTemplate.description).to.equal('This is a test prompt template generated by AI');
        expect(promptTemplate.template).to.equal('Create a {type} that focuses on {topic} and includes details about {detail}.');
        expect(promptTemplate.variables).to.deep.equal(['type', 'topic', 'detail']);
        // Verify OpenAI was called with the correct parameters
        expect(mockOpenAI.responses.create.calledOnce).to.be.true;
        const callArgs = mockOpenAI.responses.create.firstCall.args[0];
        expect(callArgs.model).to.equal('gpt-4o');
        expect(callArgs.messages[0].role).to.equal('system');
        expect(callArgs.messages[1].role).to.equal('user');
        expect(callArgs.messages[1].content).to.include(domain);
        expect(callArgs.messages[1].content).to.include(description);
        // Verify repository was called
        expect(mockRepository.save.calledOnce).to.be.true;
    });
    it('should handle AI generation errors gracefully', async function () {
        // 1. ARRANGE - Set up error behavior
        mockOpenAI.responses.create.rejects(new Error('API Error'));
        // 2 & 3. ACT & ASSERT
        try {
            await promptService.generatePromptTemplate('challenge', 'A description');
            expect.fail('Should have thrown an error');
        }
        catch (ChallengeError) {
            expect(error.message).to.equal('API Error');
        }
        // Verify OpenAI was called
        expect(mockOpenAI.responses.create.calledOnce).to.be.true;
        // Verify repository was not called since an error occurred
        expect(mockRepository.save.called).to.be.false;
    });
});
