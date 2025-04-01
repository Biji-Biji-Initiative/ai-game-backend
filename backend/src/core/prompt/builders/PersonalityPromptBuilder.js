import { logger } from "#app/core/infra/logging/logger.js";
import { appendApiStandards, getResponsesApiInstruction } from "#app/core/prompt/common/apiStandards.js";
import { validatePersonalityPromptParams } from "#app/core/prompt/schemas/personalitySchema.js";
import { PromptConstructionError } from "#app/core/prompt/common/errors.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
'use strict';
const { formatForResponsesApi } = messageFormatter;
/**
 * Helper function for logging if logger exists
 * @private
 */
function log(level, message, meta = {}) {
    if (logger && typeof logger[level] === 'function') {
        logger[level](message, meta);
    }
    else {
        console[level === 'error' ? 'error' : 'log'](message, meta);
    }
}
/**
 * Class responsible for building personality assessment prompts
 */
class PersonalityPromptBuilder {
    /**
     * Build a personality assessment prompt based on user data and history
     * @param {Object} params - Parameters for building the prompt
     * @param {Object} params.user - User data and any existing traits
     * @param {Array} [params.interactionHistory] - History of user interactions
     * @param {Object} [params.options] - Additional prompt options
     * @returns {Object} Object with input and instructions for Responses API
     * @throws {Error} If required parameters are missing
     */
    static build(params) {
        try {
            // Validate parameters against schema
            const validatedParams = validatePersonalityPromptParams(params);
            const { user, interactionHistory = [], options = {} } = validatedParams;
            // Extract key user information
            const fullName = user.fullName || 'the user';
            const professionalTitle = user.professionalTitle || '';
            const existingTraits = user.existingTraits || {};
            const aiAttitudes = user.aiAttitudes || {};
            const communicationStyle = user.communicationStyle || '';
            const learningGoals = user.learningGoals || [];
            // Extract options
            const detailLevel = options.detailLevel || 'detailed';
            const traitCategories = options.traitCategories || [
                'openness',
                'conscientiousness',
                'extraversion',
                'agreeableness',
                'neuroticism',
                'adaptability',
                'creativity',
                'curiosity',
                'persistence',
                'analytical',
            ];
            // Build the personality assessment prompt sections
            const promptSections = [
                this.buildHeaderSection(),
                this.buildUserInfoSection(user),
                this.buildExistingTraitsSection(existingTraits),
                this.buildAIAttitudesSection(aiAttitudes),
                this.buildInteractionHistorySection(interactionHistory),
                this.buildAnalysisGuidelinesSection(detailLevel, traitCategories),
                this.buildResponseFormatSection(),
                getResponsesApiInstruction(),
            ];
            // Combine sections and ensure API standards are applied
            let prompt = promptSections.filter(Boolean).join('\n\n');
            prompt = appendApiStandards(prompt);
            // Create system message based on detailLevel
            const systemMessage = this.buildSystemMessage(detailLevel);
            // Return formatted for Responses API
            return formatForResponsesApi(prompt.trim(), systemMessage);
        }
        catch (error) {
            log('error', 'Error building personality assessment prompt', {
                error: error.message,
                stack: error.stack,
            });
            throw new PromptConstructionError(`Failed to build personality assessment prompt: ${error.message}`, {
                originalError: error,
            });
        }
    }
    /**
     * Build the header section of the prompt
     * @returns {string} The header section
     * @private
     */
    static buildHeaderSection() {
        return `### PERSONALITY ASSESSMENT TASK\n\nAnalyze the provided user information to create a detailed personality profile focusing on communication style and traits that affect AI interaction.`;
    }
    /**
     * Build the user information section of the prompt
     * @param {Object} user - User data
     * @returns {string} The user information section
     * @private
     */
    static buildUserInfoSection(user) {
        const section = ['### USER INFORMATION'];
        if (user.fullName) {
            section.push(`Name: ${user.fullName}`);
        }
        if (user.professionalTitle) {
            section.push(`Professional Title: ${user.professionalTitle}`);
        }
        if (user.location) {
            section.push(`Location: ${user.location}`);
        }
        if (user.interests && user.interests.length > 0) {
            section.push(`Interests: ${user.interests.join(', ')}`);
        }
        if (user.communicationStyle) {
            section.push(`Self-described communication style: ${user.communicationStyle}`);
        }
        if (user.learningGoals && user.learningGoals.length > 0) {
            section.push(`Learning goals: ${user.learningGoals.join(', ')}`);
        }
        return section.join('\n');
    }
    /**
     * Build the existing traits section of the prompt
     * @param {Object} existingTraits - Existing trait data
     * @returns {string|null} The existing traits section or null if not applicable
     * @private
     */
    static buildExistingTraitsSection(existingTraits) {
        if (!existingTraits || Object.keys(existingTraits).length === 0) {
            return null;
        }
        const section = ['### EXISTING TRAIT RATINGS (1-10 scale)'];
        Object.entries(existingTraits).forEach(([trait, score]) => {
            section.push(`- ${trait}: ${score}`);
        });
        return section.join('\n');
    }
    /**
     * Build the AI attitudes section of the prompt
     * @param {Object} aiAttitudes - AI attitude data
     * @returns {string|null} The AI attitudes section or null if not applicable
     * @private
     */
    static buildAIAttitudesSection(aiAttitudes) {
        if (!aiAttitudes || Object.keys(aiAttitudes).length === 0) {
            return null;
        }
        const section = ['### AI ATTITUDE RATINGS (1-10 scale)'];
        Object.entries(aiAttitudes).forEach(([attitude, score]) => {
            section.push(`- ${attitude}: ${score}`);
        });
        return section.join('\n');
    }
    /**
     * Build the interaction history section of the prompt
     * @param {Array} interactionHistory - User's interaction history data
     * @returns {string|null} The interaction history section or null if not applicable
     * @private
     */
    static buildInteractionHistorySection(interactionHistory) {
        if (!interactionHistory || !Array.isArray(interactionHistory) || interactionHistory.length === 0) {
            return null;
        }
        
        const section = ['### INTERACTION HISTORY'];
        section.push(`The user has ${interactionHistory.length} recorded interactions with AI systems.`);
        // Calculate some basic statistics for the interaction history
        const sentimentScores = interactionHistory
            .filter(interaction => interaction.sentimentScore !== undefined)
            .map(interaction => interaction.sentimentScore);
        const complexityScores = interactionHistory
            .filter(interaction => interaction.complexity !== undefined)
            .map(interaction => interaction.complexity);
        if (sentimentScores.length > 0) {
            const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
            section.push(`Average sentiment score: ${avgSentiment.toFixed(2)} (range -1 to 1)`);
        }
        if (complexityScores.length > 0) {
            const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
            section.push(`Average complexity score: ${avgComplexity.toFixed(2)} (scale 1-10)`);
        }
        // Add sample interactions (up to 5)
        const sampleCount = Math.min(interactionHistory.length, 5);
        section.push(`\nSample interactions:`);
        for (let i = 0; i < sampleCount; i++) {
            const interaction = interactionHistory[i];
            section.push(`\nInteraction ${i + 1}:`);
            section.push(`- Type: ${interaction.type || 'Unknown'}`);
            if (interaction.content) {
                const contentPreview = interaction.content.length > 100
                    ? `${interaction.content.substring(0, 100)}...`
                    : interaction.content;
                section.push(`- Content preview: '${contentPreview}'`);
            }
            if (interaction.score !== undefined) {
                section.push(`- Score: ${interaction.score}`);
            }
            if (interaction.sentimentScore !== undefined) {
                section.push(`- Sentiment: ${interaction.sentimentScore}`);
            }
            if (interaction.complexity !== undefined) {
                section.push(`- Complexity: ${interaction.complexity}`);
            }
        }
        return section.join('\n');
    }
    /**
     * Build the analysis guidelines section of the prompt
     * @param {string} detailLevel - Level of detail for analysis
     * @param {Array} traitCategories - Categories to analyze
     * @returns {string} The analysis guidelines section
     * @private
     */
    static buildAnalysisGuidelinesSection(detailLevel, traitCategories) {
        const section = ['### ANALYSIS GUIDELINES'];
        if (detailLevel === 'comprehensive') {
            section.push(`Perform a comprehensive personality analysis focusing on the following categories:`);
        }
        else if (detailLevel === 'detailed') {
            section.push(`Perform a detailed personality analysis focusing on the following categories:`);
        }
        else {
            section.push(`Perform a basic personality analysis focusing on the following categories:`);
        }
        // Add trait categories to analyze
        traitCategories.forEach(category => {
            section.push(`- ${category}`);
        });
        // Add analysis focus on AI interaction
        section.push(`\nFocus your analysis on how these traits impact the user's communication with AI systems. Consider:`);
        section.push(`- How the user's personality affects their approach to AI interaction`);
        section.push(`- Communication patterns that might emerge based on these traits`);
        section.push(`- Strengths and potential areas for improvement in AI communication`);
        section.push(`- How to adapt AI responses to better match the user's personality`);
        // Add detail level specific instructions
        if (detailLevel === 'comprehensive') {
            section.push(`\nFor each trait category:`);
            section.push(`- Provide a detailed score on a 1-10 scale`);
            section.push(`- Include thorough rationale for each score`);
            section.push(`- Analyze how the trait manifests in AI interactions`);
            section.push(`- Offer 3-5 specific recommendations based on the trait`);
        }
        else if (detailLevel === 'detailed') {
            section.push(`\nFor each trait category:`);
            section.push(`- Provide a score on a 1-10 scale`);
            section.push(`- Include brief rationale for each score`);
            section.push(`- Offer 2-3 specific recommendations based on the trait`);
        }
        else {
            section.push(`\nFor each trait category:`);
            section.push(`- Provide a score on a 1-10 scale`);
            section.push(`- Include a short explanation`);
            section.push(`- Offer 1 key recommendation based on the trait`);
        }
        return section.join('\n');
    }
    /**
     * Build the response format section of the prompt
     * @returns {string} The response format section
     * @private
     */
    static buildResponseFormatSection() {
        return `### RESPONSE FORMAT
Return your analysis as a JSON object with the following structure:

{
  'traits': {
    'trait_name': {
      'score': 7,
      'description': 'Description of how this trait manifests for the user',
      'rationale': 'Explanation of why this score was assigned',
      'aiInteractionImpact': 'How this trait affects AI interactions',
      'recommendations': [
        'Recommendation 1 for effective communication',
        'Recommendation 2 for effective communication'
      ]
    }
    // Additional traits...
  },
  'communicationStyle': {
    'summary': 'Brief summary of the user's overall communication style',
    'strengths': ['Strength 1', 'Strength 2'],
    'challenges': ['Challenge 1', 'Challenge 2'],
    'recommendedApproach': 'Recommended approach for AI communication'
  },
  'aiAttitudeProfile': {
    'overall': 'Overall attitude toward AI (e.g., enthusiastic, cautious)',
    'preferences': ['Preference 1', 'Preference 2'],
    'concerns': ['Concern 1', 'Concern 2']
  }
}`;
    }
    /**
     * Build the system message for the prompt
     * @param {string} detailLevel - Level of detail for the analysis
     * @returns {string} The system message
     * @private
     */
    static buildSystemMessage(detailLevel) {
        return `You are an AI personality profiler specializing in analyzing human traits and communication styles. 
Your analysis should be data-driven, balanced, and focus on providing ${detailLevel} insights into how the user's personality affects their AI interactions.
Ensure your response follows the exact JSON format specified in the instructions, with no extraneous text.`;
    }
}
export default PersonalityPromptBuilder;
