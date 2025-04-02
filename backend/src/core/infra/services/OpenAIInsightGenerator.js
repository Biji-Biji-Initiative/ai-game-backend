import { personalityLogger } from "#app/core/infra/logging/domainLogger.js";
import InsightGenerator from "#app/core/personality/ports/InsightGenerator.js";
import AIClient from "#app/core/ai/ports/AIClient.js"; // Import AIClient port
import PersonalityPromptBuilder from "#app/core/prompt/builders/PersonalityPromptBuilder.js"; // Import the builder
import { ResponseFormat } from "#app/core/infra/openai/types.js"; // Import response format enum
import { OpenAIResponseHandlingError, OpenAIRequestError } from "#app/core/infra/openai/errors.js"; // Use OpenAIRequestError instead of AIClientError
import { z } from 'zod'; // Import Zod
'use strict';

// Define the Zod schema for expected insights structure
const personalityInsightsSchema = z.object({
  strengths: z.array(z.string()).describe("List of user's strengths"),
  focus_areas: z.array(z.string()).describe("List of areas for user focus/improvement"),
  recommendations: z.array(z.string()).describe("Actionable recommendations for the user"),
  traits: z.record(z.string(), z.any()).describe("Key-value pairs of personality traits (e.g., { openness: 0.8 })"),
}).strict(); // Use strict to disallow extra fields

/**
 * OpenAI Insight Generator
 *
 * Implements the InsightGenerator port using OpenAI for real insight generation.
 */
// const InsightGenerator = require('../../core/personality/ports/InsightGenerator');

class OpenAIInsightGenerator extends InsightGenerator {
    /**
     * Constructor for OpenAIInsightGenerator
     * @param {Object} dependencies - Dependencies
     * @param {AIClient} dependencies.aiClient - The AI client adapter instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ aiClient, logger }) {
        super();
        if (!aiClient) throw new Error('AIClient is required for OpenAIInsightGenerator');
        if (!logger) throw new Error('Logger is required for OpenAIInsightGenerator');
        
        this.aiClient = aiClient;
        // Use provided logger or default if necessary (though DI should provide it)
        this.logger = logger || personalityLogger.child('openAIInsightGenerator');
        this.logger.info('OpenAIInsightGenerator initialized');
    }

    /**
     * Generate insights based on a personality profile using OpenAI
     * @param {import('#app/core/personality/models/Personality')} profile - The personality profile
     * @returns {Promise<Object>} Generated insights object { strengths, focus_areas, recommendations, traits }
     */
    async generateFor(profile) {
        this.logger.info('Generating insights using OpenAI', { userId: profile?.userId });
        if (!profile || !profile.userId) {
            this.logger.warn('generateFor called with null or invalid profile');
            // Return a default structure for consistency
            return { strengths: [], focus_areas: [], recommendations: [], traits: {} }; 
        }

        try {
            // 1. Build the prompt using PersonalityPromptBuilder
            const promptParams = {
                user: {
                    id: profile.userId,
                    fullName: profile.fullName || 'User',
                    // Map relevant profile fields to builder expected params
                    existingTraits: profile.personalityTraits || {},
                    // Add other relevant user data if available and needed by builder
                },
                // interactionHistory: [], // Optional: Add if available and relevant
                options: {
                    detailLevel: 'detailed', // Or adjust as needed
                    // Define specific trait categories if needed
                    // traitCategories: ['openness', 'conscientiousness', ...]
                }
            };
            const { input, instructions } = PersonalityPromptBuilder.build(promptParams);
            this.logger.debug('Built personality insight prompt', { userId: profile.userId });

            // 2. Define AI call options
            const aiOptions = {
                responseFormat: ResponseFormat.JSON_OBJECT, // Ensure JSON output
                temperature: 0.5, // Adjust temperature for creativity vs consistency
                model: 'gpt-4o', // Or configure based on needs/cost
                userIdentifier: `user-${profile.userId}` // Pass user ID for tracking
                // Add previousResponseId if part of a conversation thread
            };

            // 3. Call the AI Client
            this.logger.info(`Sending insight generation request to AI for user: ${profile.userId}`);
            const response = await this.aiClient.sendJsonMessage({ input, instructions }, aiOptions);
            this.logger.info(`Received insight generation response from AI for user: ${profile.userId}`, { responseId: response?.responseId });

            // 4. Parse and validate the response data (assuming response.data contains the parsed JSON)
            if (!response?.data) {
                 throw new OpenAIResponseHandlingError('AI response did not contain expected data object.');
            }
            const insights = response.data; // Already parsed by sendJsonMessage

            // Validate the insights structure using Zod
            const validationResult = personalityInsightsSchema.safeParse(insights);
            if (!validationResult.success) {
                const errorMessage = 'AI response data failed validation';
                this.logger.error(errorMessage, { 
                    errors: validationResult.error.flatten(), 
                    responseId: response?.responseId,
                    userId: profile.userId,
                    rawData: insights // Log the raw data for debugging
                });
               throw new OpenAIResponseHandlingError(errorMessage, { 
                   validationErrors: validationResult.error.flatten(), 
                   responseId: response?.responseId 
                });
            }
            
            // Use the validated data
            const validatedInsights = validationResult.data;
            
            this.logger.info(`Successfully generated insights for user: ${profile.userId}`);
            return validatedInsights; // Return the validated insights object

        } catch (error) {
            this.logger.error(`Failed to generate personality insights for user: ${profile.userId}`, {
                 error: error.message,
                 stack: error.stack,
                 isApiClientError: error instanceof OpenAIRequestError,
                 isResponseHandlingError: error instanceof OpenAIResponseHandlingError
            });
            // Depending on production requirements, either throw the error 
            // or return a default/empty structure
            // throw error; // Rethrow to be handled upstream
            return { strengths: [], focus_areas: [], recommendations: [], traits: {} }; // Return default on error
        }
    }
}

export { OpenAIInsightGenerator };