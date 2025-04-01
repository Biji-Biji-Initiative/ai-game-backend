import { logger } from "#app/core/infra/logging/logger.js";
import { appendApiStandards, getResponsesApiInstruction } from "#app/core/prompt/common/apiStandards.js";
import { validateChallengePromptParams } from "#app/core/prompt/schemas/challengeSchema.js";
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
 * Class responsible for building adaptive challenge prompts
 */
class ChallengePromptBuilder {
    /**
     * Build a challenge prompt based on user profile, parameters, and game state
     * @param {Object} params - Parameters for building the prompt
     * @param {Object} params.user - User profile data
     * @param {Object} params.challengeParams - Challenge type and format parameters
     * @param {Object} [params.personalityProfile] - User's personality profile
     * @param {Object} [params.gameState] - Current game state for adaptive challenge generation
     * @param {Object} [params.options] - Additional prompt options
     * @returns {Object} Generated challenge prompt with system message
     * @throws {PromptConstructionError} If required parameters are missing
     */
    static build(params) {
        try {
            // Validate parameters against schema
            const validatedParams = validateChallengePromptParams(params);
            const { user, challengeParams, personalityProfile = {}, gameState = {}, options = {}, } = validatedParams;
            // Extract key parameters
            const challengeType = challengeParams.challengeType || challengeParams.challengeTypeCode || 'standard';
            const formatType = challengeParams.formatType || challengeParams.formatTypeCode || 'open-ended';
            const difficulty = challengeParams.difficulty || 'intermediate';
            const focusArea = challengeParams.focusArea || 'general';
            const creativeVariation = options.creativeVariation || 0.7;
            // Build the challenge prompt sections
            const promptSections = [
                this.buildHeaderSection(),
                this.buildUserProfileSection(user),
                this.buildChallengeParametersSection(challengeParams, focusArea),
                this.buildGameStateSection(gameState),
                this.buildCreativitySection(creativeVariation, options),
                this.buildAdaptationSection(gameState),
                this.buildResponseFormatSection(),
                getResponsesApiInstruction(),
            ];
            // Combine sections and ensure API standards are applied
            let prompt = promptSections.filter(Boolean).join('\n\n');
            prompt = appendApiStandards(prompt);
            // Build dynamic system message based on user context
            const systemMessage = this.buildDynamicSystemMessage(challengeType, formatType, difficulty, user, personalityProfile, options);
            // Format for Responses API
            return formatForResponsesApi(prompt.trim(), systemMessage);
        }
        catch (error) {
            log('error', 'Error building challenge prompt', {
                error: error.message,
                stack: error.stack,
            });
            throw new PromptConstructionError(`Failed to build challenge prompt: ${error.message}`, {
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
        return `### CHALLENGE GENERATION TASK\n\nGenerate a challenge for the user based on their profile and the specified parameters.`;
    }
    /**
     * Build the user profile section of the prompt
     * @param {Object} user - User profile data
     * @returns {string} The user profile section
     * @private
     */
    static buildUserProfileSection(user) {
        const section = ['### USER PROFILE'];
        section.push(`Name: ${user.fullName || 'Anonymous'}`);
        section.push(`Professional Title: ${user.professionalTitle || 'Professional'}`);
        if (user.focusAreas && Array.isArray(user.focusAreas) && user.focusAreas.length > 0) {
            section.push(`Focus Areas: ${user.focusAreas.join(', ')}`);
        }
        if (user.dominantTraits && Array.isArray(user.dominantTraits) && user.dominantTraits.length > 0) {
            section.push(`Dominant Traits: ${user.dominantTraits.join(', ')}`);
        }
        if (user.skillLevel) {
            section.push(`Skill Level: ${user.skillLevel}`);
        }
        if (user.learningGoals && Array.isArray(user.learningGoals) && user.learningGoals.length > 0) {
            section.push(`Learning Goals: ${user.learningGoals.join(', ')}`);
        }
        return section.join('\n');
    }
    /**
     * Build the challenge parameters section of the prompt
     * @param {Object} challengeParams - Challenge parameters
     * @param {string} focusArea - The focus area
     * @returns {string} The challenge parameters section
     * @private
     */
    static buildChallengeParametersSection(challengeParams, focusArea) {
        const section = ['### CHALLENGE PARAMETERS'];
        section.push(`Type: ${challengeParams.challengeType || challengeParams.challengeTypeCode || 'standard'}`);
        section.push(`Format: ${challengeParams.formatType || challengeParams.formatTypeCode || 'open-ended'}`);
        section.push(`Difficulty: ${challengeParams.difficulty || 'intermediate'}`);
        section.push(`Focus Area: ${focusArea}`);
        if (challengeParams.topic) {
            section.push(`Topic: ${challengeParams.topic}`);
        }
        if (challengeParams.keywords && Array.isArray(challengeParams.keywords)) {
            section.push(`Keywords: ${challengeParams.keywords.join(', ')}`);
        }
        return section.join('\n');
    }
    /**
     * Build the game state section of the prompt
     * @param {Object} gameState - Game state data
     * @returns {string|null} The game state section or null if not applicable
     * @private
     */
    static buildGameStateSection(gameState) {
        if (!gameState || Object.keys(gameState).length === 0) {
            return null;
        }
        const section = ['### GAME STATE CONTEXT'];
        if (gameState.currentLevel) {
            section.push(`Current Level: ${gameState.currentLevel}`);
        }
        if (gameState.progress) {
            section.push(`Progress: ${gameState.progress}%`);
        }
        if (gameState.streakCount) {
            section.push(`Streak Count: ${gameState.streakCount}`);
        }
        // Add recent challenges if available
        if (gameState.recentChallenges && Array.isArray(gameState.recentChallenges) && gameState.recentChallenges.length > 0) {
            section.push(`\nRecent Challenges:`);
            gameState.recentChallenges.forEach((c, idx) => {
                section.push(`${idx + 1}. ${c.title} (${c.challengeType || 'Unknown type'}, ${c.difficulty || 'Not specified'})`);
            });
        }
        // Add strengths and areas for improvement if available
        if (gameState.strengths && Array.isArray(gameState.strengths) && gameState.strengths.length > 0) {
            section.push(`\nUser Strengths: ${gameState.strengths.join(', ')}`);
        }
        if (gameState.areasForImprovement && Array.isArray(gameState.areasForImprovement) && gameState.areasForImprovement.length > 0) {
            section.push(`Areas for Improvement: ${gameState.areasForImprovement.join(', ')}`);
        }
        return section.join('\n');
    }
    /**
     * Build the creativity guidance section of the prompt
     * @param {number} creativeVariation - The level of creative variation (0-1)
     * @param {Object} options - Additional options
     * @returns {string} The creativity guidance section
     * @private
     */
    static buildCreativitySection(creativeVariation, options) {
        const section = ['### CREATIVITY GUIDANCE'];
        section.push(`- Variation level: ${Math.floor(creativeVariation * 100)}%`);
        if (creativeVariation > 0.8) {
            section.push(`- Generate a highly creative and unique challenge.`);
        }
        else if (creativeVariation > 0.6) {
            section.push(`- Balance creativity with structured learning.`);
        }
        else {
            section.push(`- Focus on foundational concepts with moderate creativity.`);
        }
        if (options.allowDynamicTypes) {
            section.push(`- You may create novel challenge types beyond the standard categories when appropriate.`);
        }
        if (options.suggestNovelTypes) {
            section.push(`- You are encouraged to suggest creative and unique challenge types tailored to this specific user.`);
        }
        return section.join('\n');
    }
    /**
     * Build the adaptation guidance section of the prompt
     * @param {Object} gameState - Game state data
     * @returns {string|null} The adaptation guidance section or null if not applicable
     * @private
     */
    static buildAdaptationSection(gameState) {
        if (!gameState || Object.keys(gameState).length === 0) {
            return null;
        }
        const section = ['### ADAPTATION GUIDANCE'];
        section.push(`- Create a challenge that builds on the user's strengths while addressing areas for improvement.`);
        section.push(`- Avoid repeating challenge types the user has recently encountered.`);
        if (gameState.streakCount && gameState.streakCount > 2) {
            section.push(`- The user is on a streak of ${gameState.streakCount} successfully completed challenges. Consider increasing difficulty slightly.`);
        }
        if (gameState.recentChallenges && gameState.recentChallenges.length > 0) {
            const recentFocusAreas = [
                ...new Set(gameState.recentChallenges.map(c => c.focusArea).filter(Boolean)),
            ];
            if (recentFocusAreas.length > 0 && !recentFocusAreas.includes(gameState.focusArea)) {
                section.push(`- This is a shift to a new focus area (${gameState.focusArea}) from previous work in ${recentFocusAreas.join(', ')}. Provide context that bridges these areas.`);
            }
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
Return the challenge as a JSON object with the following structure:

{
  'title': 'Challenge title',
  'content': {
    'context': 'Background information and context',
    'scenario': 'Specific scenario or problem statement',
    'instructions': 'What the user needs to do'
  },
  'questions': [
    {
      'id': 'q1',
      'text': 'Question text',
      'type': 'open-ended | multiple-choice | reflection',
      'options': ['Option 1', 'Option 2', 'Option 3'] // For multiple-choice only
    }
  ],
  'evaluationCriteria': {
    'criteria1': {
      'description': 'Description of criteria',
      'weight': 0.5
    }
  },
  'recommendedResources': [
    {
      'title': 'Resource title',
      'type': 'article | video | book | tutorial',
      'url': 'URL if available',
      'description': 'Brief description of why this resource is helpful'
    }
  ]
}`;
    }
    /**
     * Build a dynamic system message based on user context
     * @param {string} challengeType - Type of challenge
     * @param {string} formatType - Format of challenge
     * @param {string} difficulty - Difficulty level
     * @param {Object} user - User profile data
     * @param {Object} personalityProfile - User's personality profile
     * @param {Object} options - Additional options
     * @returns {string} Dynamic system message
     * @private
     */
    static buildDynamicSystemMessage(challengeType, formatType, difficulty, user = {}, personalityProfile = {}, options = {}) {
        try {
            const messageParts = [];
            // Base message
            messageParts.push(`You are an AI challenge creator specializing in ${challengeType} challenges `);
            // Add difficulty context
            if (difficulty === 'beginner') {
                messageParts.push(`that are accessible and instructive for beginners. `);
            }
            else if (difficulty === 'intermediate') {
                messageParts.push(`with moderate complexity appropriate for intermediate learners. `);
            }
            else if (difficulty === 'advanced' || difficulty === 'expert') {
                messageParts.push(`that challenge and stretch advanced learners. `);
            }
            else {
                messageParts.push(`of various difficulty levels. `);
            }
            // Add format context
            if (formatType === 'open-ended') {
                messageParts.push(`You excel at creating open-ended challenges that promote creative thinking. `);
            }
            else if (formatType === 'scenario') {
                messageParts.push(`You excel at developing rich, realistic scenarios that require thoughtful analysis. `);
            }
            else if (formatType === 'multiple-choice') {
                messageParts.push(`You excel at crafting multiple-choice challenges with well-designed options. `);
            }
            else {
                messageParts.push(`You adapt your challenge format based on learning objectives. `);
            }
            // Adjust for user skill level
            if (user.skillLevel) {
                const skillLevel = user.skillLevel.toLowerCase();
                if (skillLevel === 'beginner') {
                    messageParts.push(`Create challenges that build confidence while teaching fundamentals. `);
                }
                else if (skillLevel === 'intermediate') {
                    messageParts.push(`Focus on application of concepts and moderate complexity. `);
                }
                else if (skillLevel === 'expert' || skillLevel === 'advanced') {
                    messageParts.push(`Design sophisticated challenges that push the boundaries of expertise. `);
                }
            }
            // Add personality context if available
            if (personalityProfile && Object.keys(personalityProfile).length > 0) {
                if (personalityProfile.communicationStyle) {
                    messageParts.push(`Adapt your communication style to be ${personalityProfile.communicationStyle}. `);
                }
                if (personalityProfile.learningPreferences) {
                    messageParts.push(`Consider the user's learning preferences: ${personalityProfile.learningPreferences}. `);
                }
            }
            // Add creative variation context
            if (options.creativeVariation) {
                const variationLevel = Math.floor(options.creativeVariation * 100);
                messageParts.push(`Vary your challenge creativity by approximately ${variationLevel}%. `);
            }
            // Add format-specific instructions
            messageParts.push(`\nAlways return your challenge as a JSON object with all required fields. `);
            messageParts.push(`Format your response as valid, parsable JSON with no markdown formatting. `);
            return messageParts.join('');
        }
        catch (error) {
            log('error', 'Error building system message', {
                error: error.message,
                stack: error.stack,
            });
            throw new PromptConstructionError(`Failed to build system message: ${error.message}`, {
                originalError: error,
            });
        }
    }
}
export default ChallengePromptBuilder;
