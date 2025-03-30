import { jest } from '@jest/globals';
import { expect } from "chai";
import testSetup from "../../test-helpers/setup.js";
import { createTestUser, createTestChallenge } from "../../helpers/testFactory.js";
import promptBuilder from '../../../src/core/prompt/promptBuilder.js';
import { PROMPT_TYPES } from '../../../src/core/prompt/promptTypes.js';
describe('Prompt Builder Domain', function () {
    beforeEach(function () {
        // Set up test environment
        testSetup.setup();
    });
    afterEach(function () {
        // Clean up test environment
        testSetup.teardown();
    });
    describe('Focus Area Prompt Building', function () {
        it('should build a focus area prompt with user data', async function () {
            // Create test user data
            const user = createTestUser({
                personality_traits: ['curious', 'analytical', 'thoughtful'],
                ai_attitudes: ['optimistic', 'pragmatic'],
                professionalTitle: 'Software Engineer',
                location: 'San Francisco'
            });
            // Build a focus area prompt
            const prompt = await promptBuilder.buildPrompt(PROMPT_TYPES.FOCUS_AREA, {
                user,
                options: {
                    count: 3,
                    creativeVariation: 0.7
                }
            });
            // Verify the prompt was created and contains relevant information
            expect(prompt).to.be.a('string');
            expect(prompt.length).to.be.greaterThan(100);
            // Check for user data in the prompt
            expect(prompt).to.include('Software Engineer');
            expect(prompt).to.include('San Francisco');
            // Should mention at least one trait
            const hasTraitMentioned = user.personality_traits.some(trait => prompt.toLowerCase().includes(trait.toLowerCase()));
            expect(hasTraitMentioned).to.be.true;
        });
    });
    describe('Personality Insights Prompt Building', function () {
        it('should build a personality insights prompt with interaction history', async function () {
            // Create test data
            const user = createTestUser();
            const interactionHistory = [
                {
                    type: 'challenge',
                    content: 'User completed a challenge about effective questioning.',
                    timestamp: new Date(Date.now() - 86400000) // 1 day ago
                },
                {
                    type: 'feedback',
                    content: 'User demonstrated strong analytical skills but could improve clarity.',
                    timestamp: new Date(Date.now() - 43200000) // 12 hours ago
                }
            ];
            // Build a personality insights prompt
            const prompt = await promptBuilder.buildPrompt(PROMPT_TYPES.PERSONALITY, {
                user,
                interactionHistory,
                options: {
                    detailLevel: 'high',
                    focusAreas: ['communication', 'analytical-thinking']
                }
            });
            // Verify the prompt was created
            expect(prompt).to.be.a('string');
            expect(prompt.length).to.be.greaterThan(100);
            // Should include context about the history
            expect(prompt.toLowerCase()).to.include('history');
            expect(prompt.toLowerCase()).to.include('challenge');
            expect(prompt.toLowerCase()).to.include('analytical');
        });
    });
    describe('Error Handling', function () {
        it('should throw an error when using a non-existent prompt type', async function () {
            try {
                await promptBuilder.buildPrompt('non-existent-type', {});
                // Should not reach here
                expect.fail('Should have thrown an error for non-existent prompt type');
            }
            catch (error) {
                expect(error.message).to.include('non-existent-type');
            }
        });
        it('should throw an error when missing required parameters', async function () {
            try {
                // Missing user parameter
                await promptBuilder.buildPrompt(PROMPT_TYPES.FOCUS_AREA, {
                    options: { count: 3 }
                });
                // Should not reach here
                expect.fail('Should have thrown an error for missing parameters');
            }
            catch (error) {
                expect(error.message).to.include('validation');
            }
        });
    });
    describe('Prompt Builder Registration', function () {
        it('should allow registering and using a custom prompt builder', async function () {
            // Define a simple custom prompt builder
            const customBuilder = {
                type: 'custom-type',
                build: params => Promise.resolve(`This is a custom prompt for ${params.name}`)
            };
            // Register the custom builder
            promptBuilder.registerBuilder(customBuilder);
            // Use the custom builder
            const prompt = await promptBuilder.buildPrompt('custom-type', { name: 'Test User' });
            // Verify the custom builder was used
            expect(prompt).to.equal('This is a custom prompt for Test User');
        });
    });
});
