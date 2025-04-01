import { applyRepositoryErrorHandling, applyServiceErrorHandling, applyControllerErrorHandling, createErrorMapper } from "#app/core/infra/errors/centralizedErrorUtils.js";
import { EvaluationError, EvaluationNotFoundError, EvaluationValidationError, EvaluationProcessingError } from "#app/core/evaluation/errors/EvaluationErrors.js";
'use strict';
// Create an error mapper for services
const evaluationServiceErrorMapper = createErrorMapper({
    EvaluationNotFoundError: EvaluationNotFoundError,
    EvaluationValidationError: EvaluationValidationError,
    EvaluationProcessingError: EvaluationProcessingError,
    Error: EvaluationError,
}, EvaluationError);
/**
 * Dynamic Prompt Service for Evaluations
 *
 * Generates highly personalized evaluation prompts based on user context,
 * challenge type, and learning history.
 *
 * @module dynamicPromptService
 */
/**
 * Service for generating dynamic, personalized prompts
 */
class DynamicPromptService {
    /**
     * Create a new DynamicPromptService
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.evaluationCategoryRepository - Repository for evaluation categories
     * @param {Object} dependencies.logger - Logger instance
     */
    /**
     * Method constructor
     */
    constructor({ evaluationCategoryRepository, logger }) {
        this.evaluationCategoryRepository = evaluationCategoryRepository;
        this.logger = logger;
    }
    /**
     * Log a message with context
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @private
     */
    /**
     * Method log
     */
    log(level, message, meta = {}) {
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](message, meta);
        }
        else {
            console[level === 'error' ? 'error' : 'log'](message, meta);
        }
    }
    /**
     * Generate a dynamic evaluation prompt
     *
     * @param {Object} params - Parameters for prompt generation
     * @param {Object} params.challenge - Challenge data
     * @param {string|Object} params.userResponse - User's response to evaluate
     * @param {Object} params.userContext - Comprehensive user context
     * @param {Object} params.criteria - Personalized evaluation criteria
     * @param {Object} params.options - Additional options
     * @returns {Promise<Object>} Generated prompt data with messages and instructions
     */
    /**
     * Method generateDynamicPrompt
     */
    async generateDynamicPrompt({ challenge, userResponse, userContext, criteria, options = {} }) {
        // Build system message with personalized instructions
        const systemMessage = this.buildSystemMessage(challenge, userContext, criteria);
        
        // Build base user message with placeholder
        const baseUserMessage = this.buildUserMessage(challenge, userResponse, userContext, criteria);
        
        // Get category descriptions for all weights from the repository
        const descriptions = await this.evaluationCategoryRepository.getCategoryDescriptions();
        
        // Generate the category descriptions section
        let categoryLines = '';
        for (const [category, weight] of Object.entries(criteria.categoryWeights)) {
            // Get the description for this category, throwing an error if not found
            const description = descriptions[category];
            if (!description) {
                throw new EvaluationError(`No description found for category: ${category}`, {
                    category,
                    errorCode: 'MISSING_CATEGORY_DESCRIPTION'
                });
            }
            
            categoryLines += `- ${category} (0-${weight} points): ${description}\n`;
        }
        
        // Replace the placeholder with actual category lines
        const userMessage = baseUserMessage.replace('[EVALUATION_CRITERIA_PLACEHOLDER]', categoryLines);
        
        // Build response format instructions
        const responseFormat = this.buildResponseFormat(criteria);
        
        return {
            systemMessage,
            userMessage,
            responseFormat,
            metadata: {
                promptVersion: '2.0',
                generatedAt: new Date().toISOString(),
                promptType: 'personalized-evaluation',
                challengeType: challenge.challengeType || challenge.type || 'standard',
                focusArea: challenge.focusArea || 'general',
                userContextLevel: this.getUserContextLevel(userContext)
            }
        };
    }
    /**
     * Build system message with personalized instructions
     *
     * @param {Object} challenge - Challenge data
     * @param {Object} userContext - User context data
     * @param {Object} criteria - Evaluation criteria
     * @returns {string} Personalized system message
     * @private
     */
    /**
     * Method buildSystemMessage
     */
    buildSystemMessage(challenge, userContext, criteria) {
        const challengeType = challenge.challengeType || challenge.type || 'standard';
        const focusArea = challenge.focusArea || 'general';
        const skillLevel = criteria.skillLevel || userContext?.profile?.skillLevel || 'intermediate';
        let systemMessage = `You are an AI evaluation expert specializing in ${focusArea} with deep expertise in assessing ${challengeType} challenges.`;
        // Add personalized evaluation approach
        systemMessage += `\n\nEvaluate this response for a ${skillLevel}-level user`;
        if (criteria.focusAreas && criteria.focusAreas.length > 0) {
            systemMessage += ` focused on ${criteria.focusAreas.join(', ')}`;
        }
        systemMessage += '.';
        // Add context about user's strengths and weaknesses
        if (criteria.consistentStrengths && criteria.consistentStrengths.length > 0) {
            systemMessage += `\n\nThe user consistently demonstrates strength in: ${criteria.consistentStrengths.join(', ')}.`;
        }
        if (criteria.persistentWeaknesses && criteria.persistentWeaknesses.length > 0) {
            systemMessage += `\n\nPay special attention to these areas where the user has opportunity for growth: ${criteria.persistentWeaknesses.join(', ')}.`;
        }
        // Add learning goals if available
        if (criteria.learningGoals && criteria.learningGoals.length > 0) {
            systemMessage += `\n\nThe user's learning goals are: ${criteria.learningGoals.join(', ')}.`;
        }
        // Add instruction for response format
        systemMessage += `\n\nAlways return your evaluation as a JSON object with category scores, overall score, detailed feedback, strengths analysis, improvement areas, growth insights, and personalized recommendations.`;
        systemMessage += `\n\nFormat your response as valid, parsable JSON without any markdown formatting or additional text. All scores should be on a 0-100 scale.`;
        return systemMessage;
    }
    /**
     * Build detailed user message with challenge, context, and user response
     *
     * @param {Object} challenge - Challenge data
     * @param {string|Object} userResponse - User's response to evaluate
     * @param {Object} userContext - User context data
     * @param {Object} criteria - Evaluation criteria
     * @returns {string} Comprehensive user message
     */
    buildUserMessage(challenge, userResponse, userContext, criteria) {
        let message = `### EVALUATION TASK\n`;
        message += `Provide a comprehensive, personalized evaluation of this ${challenge.challengeType || 'challenge'} response.\n\n`;
        
        // Add challenge information
        message += `### CHALLENGE INFORMATION\n`;
        message += `Title: ${challenge.title || 'Untitled Challenge'}\n`;
        message += `Type: ${challenge.challengeType || challenge.type || 'standard'}\n`;
        message += `Focus Area: ${challenge.focusArea || 'general'}\n`;
        if (challenge.difficulty) {
            message += `Difficulty: ${challenge.difficulty}\n`;
        }
        message += '\n';
        
        // Add challenge content
        if (typeof challenge.content === 'object') {
            message += `### CHALLENGE CONTENT\n`;
            if (challenge.content.context)
                message += `Context: ${challenge.content.context}\n\n`;
            if (challenge.content.scenario)
                message += `Scenario: ${challenge.content.scenario}\n\n`;
            if (challenge.content.instructions)
                message += `Instructions: ${challenge.content.instructions}\n\n`;
        }
        else if (typeof challenge.content === 'string' && challenge.content.trim()) {
            message += `### CHALLENGE CONTENT\n${challenge.content}\n\n`;
        }
        
        // Add user context for personalization
        message += `### USER CONTEXT\n`;
        message += `Skill Level: ${criteria.skillLevel || 'intermediate'}\n`;
        if (criteria.focusAreas && criteria.focusAreas.length > 0) {
            message += `Focus Areas: ${criteria.focusAreas.join(', ')}\n`;
        }
        
        // Add previous performance if available
        if (criteria.previousScores && Object.keys(criteria.previousScores).length > 0) {
            message += `\n### PREVIOUS PERFORMANCE\n`;
            if (criteria.previousScores.overall) {
                message += `Previous Overall Score: ${criteria.previousScores.overall}\n`;
            }
            const categories = Object.entries(criteria.previousScores)
                .filter(([key]) => key !== 'overall');
            if (categories.length > 0) {
                message += `Previous Category Scores:\n`;
                categories.forEach(([category, score]) => {
                    message += `- ${category}: ${score}\n`;
                });
            }
        }
        
        // Add category scoring instructions - but now we'll fetch them synchronously before building the message
        message += `\n### EVALUATION CRITERIA\n`;
        message += `Evaluate the response using the following categories and weights:\n\n`;
        
        // For categories, we'll use a placeholder that must be filled in by the caller
        message += `[EVALUATION_CRITERIA_PLACEHOLDER]\n`;
        
        message += `\nThe total maximum score is 100 points.\n\n`;
        
        // Add user response to evaluate
        message += `### USER RESPONSE\n`;
        message += typeof userResponse === 'string' ? userResponse : JSON.stringify(userResponse, null, 2);
        message += `\n\n`;
        
        // Add specific analysis instructions
        message += `### REQUIRED ANALYSIS\n`;
        message += `1. Evaluate each category with a score and specific feedback\n`;
        message += `2. Identify and analyze key strengths, explaining why they're effective\n`;
        message += `3. Identify areas for improvement with actionable suggestions\n`;
        
        // Add growth tracking if we have previous scores
        if (criteria.previousScores && Object.keys(criteria.previousScores).length > 0) {
            message += `4. Compare current performance to previous submissions, noting improvements\n`;
            message += `5. Identify persistent patterns (both strengths and weaknesses)\n`;
        }
        
        // Add personalization instructions
        message += `6. Provide personalized recommendations based on the user's focus areas and skill level\n`;
        message += `7. Suggest specific resources and next challenges that would benefit this user\n`;
        
        return message;
    }
    /**
     * Build response format instructions
     *
     * @param {Object} criteria - Evaluation criteria
     * @returns {string} Formatted response instructions
     * @private
     */
    /**
     * Method buildResponseFormat
     */
    buildResponseFormat(criteria) {
        const formatInstructions = `### RESPONSE FORMAT
Provide your evaluation as a JSON object with the following structure:

{
  'categoryScores': {
${Object.keys(criteria.categoryWeights).map(cat => `    '${cat}': 0`).join(',\n')}
  },
  'overallScore': 0,
  'overallFeedback': 'Comprehensive evaluation of the entire response...',
  'strengths': [
    'Strength 1',
    'Strength 2'
  ],
  'strengthAnalysis': [
    {
      'strength': 'Strength 1',
      'analysis': 'Detailed explanation of why this is effective...',
      'impact': 'How this contributes to overall quality...'
    }
  ],
  'areasForImprovement': [
    'Area 1',
    'Area 2'
  ],
  'improvementPlans': [
    {
      'area': 'Area 1',
      'importance': 'Why improving this is important...',
      'actionItems': ['Specific action 1', 'Specific action 2'],
      'resources': ['Suggested resource or exercise']
    }
  ],
  'growthInsights': {
    'improvements': ['Specific improvements since last evaluation'],
    'persistentStrengths': ['Strengths maintained across evaluations'],
    'developmentAreas': ['Areas that still need focus'],
    'growthSummary': 'Overall assessment of growth trajectory...'
  },
  'recommendations': {
    'nextSteps': 'Personalized next steps for improvement...',
    'resources': [
      {'title': 'Resource Title', 'type': 'article|video|course', 'url': 'URL if available', 'relevance': 'Why this is relevant'}
    ],
    'recommendedChallenges': [
      {'title': 'Challenge Type', 'description': 'Brief description', 'relevance': 'Why this would help growth'}
    ]
  }
}

Note: Ensure that all scores sum to 100 points. Provide specific, actionable feedback throughout.`;
        return formatInstructions;
    }
    /**
     * Determine the level of user context available
     *
     * @param {Object} userContext - User context object
     * @returns {string} Context level (none, basic, detailed, comprehensive)
     * @private
     */
    /**
     * Method getUserContextLevel
     */
    getUserContextLevel(userContext) {
        if (!userContext || Object.keys(userContext).length === 0) {
            return 'none';
        }
        if (userContext.learningJourney?.evaluationHistory?.length > 0) {
            return 'comprehensive';
        }
        if (userContext.profile && Object.keys(userContext.profile).length > 0) {
            return 'detailed';
        }
        return 'basic';
    }
}
export default DynamicPromptService;
