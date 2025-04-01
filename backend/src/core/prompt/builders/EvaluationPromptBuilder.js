import { logger } from "#app/core/infra/logging/logger.js";
import { appendApiStandards, getResponsesApiInstruction } from "#app/core/prompt/common/apiStandards.js";
import { validateEvaluationPromptParams } from "#app/core/prompt/schemas/evaluationSchema.js";
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
 * Class responsible for building enhanced evaluation prompts with user context
 */
class EvaluationPromptBuilder {
    /**
     * Build an evaluation prompt based on challenge, user response, and user context
     * @param {Object} params - Parameters for building the prompt
     * @param {Object} params.challenge - Challenge data
     * @param {string|Object} params.userResponse - User's response to the challenge
     * @param {Object} [params.user] - User profile data
     * @param {Object} [params.personalityProfile] - User's personality profile
     * @param {Object} [params.evaluationHistory] - Previous evaluation data for growth tracking
     * @param {Object} [params.options] - Additional prompt options
     * @returns {Object} Generated evaluation prompt with system message
     * @throws {PromptConstructionError} If prompt construction fails
     */
    static build(params) {
        try {
            // Validate parameters against schema
            const validatedParams = validateEvaluationPromptParams(params);
            const { challenge, userResponse, user = {}, personalityProfile = {}, evaluationHistory = {}, options = {} } = validatedParams;
            // Extract scoring categories and weights based on challenge type and focus area
            const categoryWeights = this.getCategoryWeights(challenge, options);
            // Build the evaluation prompt sections
            const promptSections = [
                this.buildHeaderSection(),
                this.buildChallengeSection(challenge),
                this.buildUserContextSection(user),
                this.buildEvaluationHistorySection(evaluationHistory),
                this.buildUserResponseSection(userResponse),
                this.buildCriteriaSection(categoryWeights),
                this.buildStrengthAnalysisSection(),
                this.buildImprovementPlanSection(),
                this.buildGrowthTrackingSection(evaluationHistory),
                this.buildRecommendationsSection(),
                this.buildResponseFormatSection(categoryWeights),
                getResponsesApiInstruction()
            ];
            // Combine sections and ensure API standards are applied
            let prompt = promptSections.filter(Boolean).join('\n\n');
            prompt = appendApiStandards(prompt);
            // Build dynamic system message based on user context
            const systemMessage = this.buildDynamicSystemMessage(challenge, user, personalityProfile, options);
            // Format for Responses API
            return formatForResponsesApi(prompt.trim(), systemMessage);
        }
        catch (error) {
            log('error', 'Error building evaluation prompt', {
                error: error.message,
                stack: error.stack
            });
            throw new PromptConstructionError(`Failed to build evaluation prompt: ${error.message}`, {
                originalError: error
            });
        }
    }
    /**
     * Build the header section of the prompt
     * @returns {string} The header section
     * @private
     */
    static buildHeaderSection() {
        return `### EVALUATION TASK\n\nEvaluate the user's response to the challenge with detailed scoring in multiple categories, personalized feedback, and growth tracking.`;
    }
    /**
     * Build the challenge information section of the prompt
     * @param {Object} challenge - Challenge data
     * @returns {string} The challenge section
     * @private
     */
    static buildChallengeSection(challenge) {
        const section = ['### CHALLENGE INFORMATION'];
        section.push(`Title: ${challenge.title || 'Untitled Challenge'}`);
        section.push(`Type: ${challenge.challengeType || challenge.challengeTypeCode || 'standard'}`);
        section.push(`Focus Area: ${challenge.focusArea || 'general'}`);
        if (challenge.difficulty) {
            section.push(`Difficulty: ${challenge.difficulty}`);
        }
        // Add challenge content
        if (typeof challenge.content === 'object') {
            section.push(`\n### CHALLENGE CONTENT`);
            if (challenge.content.context)
                section.push(`Context: ${challenge.content.context}`);
            if (challenge.content.scenario)
                section.push(`Scenario: ${challenge.content.scenario}`);
            if (challenge.content.instructions)
                section.push(`Instructions: ${challenge.content.instructions}`);
        }
        else if (typeof challenge.content === 'string' && challenge.content.trim()) {
            section.push(`\n### CHALLENGE CONTENT\n${challenge.content}`);
        }
        return section.join('\n');
    }
    /**
     * Build the user context section of the prompt
     * @param {Object} user - User profile data
     * @returns {string|null} The user context section or null if not applicable
     * @private
     */
    static buildUserContextSection(user) {
        if (!user || Object.keys(user).length === 0) {
            return null;
        }
        const section = ['### USER CONTEXT'];
        if (user.name)
            section.push(`Name: ${user.name}`);
        if (user.email)
            section.push(`User ID: ${user.email}`);
        if (user.skillLevel)
            section.push(`Skill Level: ${user.skillLevel}`);
        if (user.focusAreas && Array.isArray(user.focusAreas) && user.focusAreas.length > 0) {
            section.push(`Focus Areas: ${user.focusAreas.join(', ')}`);
        }
        if (user.learningGoals && Array.isArray(user.learningGoals) && user.learningGoals.length > 0) {
            section.push(`Learning Goals: ${user.learningGoals.join(', ')}`);
        }
        if (user.completedChallenges) {
            section.push(`Completed Challenges: ${user.completedChallenges}`);
        }
        return section.join('\n');
    }
    /**
     * Build the evaluation history section of the prompt
     * @param {Object} evaluationHistory - Previous evaluation data
     * @returns {string|null} The evaluation history section or null if not applicable
     * @private
     */
    static buildEvaluationHistorySection(evaluationHistory) {
        if (!evaluationHistory || Object.keys(evaluationHistory).length === 0) {
            return null;
        }
        const section = ['### PREVIOUS EVALUATION DATA'];
        if (evaluationHistory.previousScore !== undefined) {
            section.push(`Previous Overall Score: ${evaluationHistory.previousScore}`);
        }
        if (evaluationHistory.previousCategoryScores &&
            Object.keys(evaluationHistory.previousCategoryScores).length > 0) {
            section.push(`Previous Category Scores:`);
            Object.entries(evaluationHistory.previousCategoryScores).forEach(([category, score]) => {
                section.push(`- ${category}: ${score}`);
            });
        }
        if (evaluationHistory.consistentStrengths && Array.isArray(evaluationHistory.consistentStrengths) && evaluationHistory.consistentStrengths.length > 0) {
            section.push(`Consistent Strengths: ${evaluationHistory.consistentStrengths.join(', ')}`);
        }
        
        if (evaluationHistory.persistentWeaknesses && Array.isArray(evaluationHistory.persistentWeaknesses) && evaluationHistory.persistentWeaknesses.length > 0) {
            section.push(`Areas Needing Improvement: ${evaluationHistory.persistentWeaknesses.join(', ')}`);
        }
        return section.join('\n');
    }
    /**
     * Build the user response section of the prompt
     * @param {string|Object} userResponse - User's response to evaluate
     * @returns {string} The user response section
     * @private
     */
    static buildUserResponseSection(userResponse) {
        return `### USER RESPONSE\n${typeof userResponse === 'string' ? userResponse : JSON.stringify(userResponse)}`;
    }
    /**
     * Build the evaluation criteria section of the prompt
     * @param {Object} categoryWeights - Category weights mapping
     * @returns {string} The criteria section
     * @private
     */
    static buildCriteriaSection(categoryWeights) {
        const section = ['### EVALUATION CRITERIA', 'Evaluate the response using the following criteria:'];
        // Add detailed criteria for each category
        Object.entries(categoryWeights).forEach(([category, weight]) => {
            const description = this.getCategoryDescription(category);
            section.push(`- ${category} (0-${weight} points): ${description}`);
        });
        section.push(`\nThe total maximum score is 100 points.`);
        return section.join('\n');
    }
    /**
     * Build the strength analysis section of the prompt
     * @returns {string} The strength analysis section
     * @private
     */
    static buildStrengthAnalysisSection() {
        return `### STRENGTH ANALYSIS
For each strength identified, provide a detailed analysis including:
1. What the user did well (the strength itself)
2. Why this aspect is effective or important
3. How it specifically contributes to the quality of the response`;
    }
    /**
     * Build the improvement plan section of the prompt
     * @returns {string} The improvement plan section
     * @private
     */
    static buildImprovementPlanSection() {
        return `### IMPROVEMENT PLANS
For each area needing improvement, provide a detailed plan including:
1. Specific issue to address
2. Why improving this area is important
3. Actionable steps to improve
4. Resources or exercises that could help`;
    }
    /**
     * Build the growth tracking section of the prompt
     * @param {Object} evaluationHistory - Previous evaluation data
     * @returns {string|null} The growth tracking section or null if not applicable
     * @private
     */
    static buildGrowthTrackingSection(evaluationHistory) {
        if (!evaluationHistory || Object.keys(evaluationHistory).length === 0) {
            return null;
        }
        return `### GROWTH TRACKING
Compare the current response to previous evaluations:
1. Identify improvements since the last evaluation
2. Note any persistent strengths or weaknesses
3. Provide specific growth insights`;
    }
    /**
     * Build the personalized recommendations section of the prompt
     * @returns {string} The recommendations section
     * @private
     */
    static buildRecommendationsSection() {
        return `### PERSONALIZED RECOMMENDATIONS
Based on the user's context, provide:
1. Personalized next steps tailored to their focus areas and skill level
2. 2-3 specific resources that would help improvement (articles, books, courses, etc.)
3. 1-2 recommended challenge types that would build on current strengths or address weaknesses`;
    }
    /**
     * Build the response format section of the prompt
     * @param {Object} categoryWeights - Category weights mapping
     * @returns {string} The response format section
     * @private
     */
    static buildResponseFormatSection(categoryWeights) {
        return `### RESPONSE FORMAT
Provide your evaluation as a JSON object with the following structure:

{
  'categoryScores': {
${Object.keys(categoryWeights).map(cat => `    '${cat}': 25`).join(',\n')}
  },
  'overallScore': 85,
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
    'Area for improvement 1',
    'Area for improvement 2'
  ],
  'improvementPlans': [
    {
      'area': 'Area for improvement 1',
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
      {
        'title': 'Resource Title',
        'type': 'article|video|course',
        'url': 'URL if available',
        'relevance': 'Why this is relevant'
      }
    ],
    'recommendedChallenges': [
      {
        'title': 'Challenge Type',
        'description': 'Brief description',
        'relevance': 'Why this would help growth'
      }
    ]
  }
}`;
    }
    /**
     * Build a dynamic system message based on user context
     * @param {Object} challenge - Challenge data
     * @param {Object} user - User profile data
     * @param {Object} personalityProfile - User's personality profile
     * @param {Object} options - Additional options
     * @returns {string} Dynamic system message
     * @private
     */
    static buildDynamicSystemMessage(challenge, user = {}, personalityProfile = {}, options = {}) {
        try {
            const challengeType = challenge.challengeType ||
                challenge.challengeTypeCode ||
                options.challengeTypeName ||
                'standard';
            const messageParts = [];
            // Start with base system message
            messageParts.push(`You are an AI evaluation expert providing `);
            // Add feedback style based on user preferences or default to constructive
            messageParts.push(`${user.preferences?.feedbackStyle || 'constructive'} feedback `);
            // Add challenge type context
            messageParts.push(`on ${challengeType} challenges. `);
            // Adjust explanation complexity based on user skill level
            if (user.skillLevel) {
                const skillLevel = user.skillLevel.toLowerCase();
                if (skillLevel === 'beginner') {
                    messageParts.push(`Explain concepts simply and thoroughly, avoiding jargon. `);
                }
                else if (skillLevel === 'intermediate') {
                    messageParts.push(`Balance explanations with appropriate complexity for someone with moderate familiarity. `);
                }
                else if (skillLevel === 'expert' || skillLevel === 'advanced') {
                    messageParts.push(`Provide nuanced, in-depth analysis that acknowledges complexity and edge cases. `);
                }
            }
            // Adjust tone based on personality profile if available
            if (personalityProfile) {
                if (personalityProfile.communicationStyle === 'formal') {
                    messageParts.push(`Maintain a formal, professional tone. `);
                }
                else if (personalityProfile.communicationStyle === 'casual') {
                    messageParts.push(`Use a friendly, conversational tone. `);
                }
                else if (personalityProfile.communicationStyle === 'technical') {
                    messageParts.push(`Use precise, technical language where appropriate. `);
                }
                else {
                    messageParts.push(`Use a clear, encouraging tone. `); // Default
                }
                // Add sensitivity based on personality traits
                if (personalityProfile.traits) {
                    if (personalityProfile.traits.includes('sensitive_to_criticism')) {
                        messageParts.push(`Frame critiques constructively and with emotional intelligence. `);
                    }
                    if (personalityProfile.traits.includes('detail_oriented')) {
                        messageParts.push(`Include specific details and examples in your feedback. `);
                    }
                    if (personalityProfile.traits.includes('big_picture_thinker')) {
                        messageParts.push(`Connect feedback to broader concepts and applications. `);
                    }
                }
            }
            // Add learning style adaptations if available
            if (user.learningStyle) {
                if (user.learningStyle === 'visual') {
                    messageParts.push(`Suggest visual aids or diagrams when relevant. `);
                }
                else if (user.learningStyle === 'practical') {
                    messageParts.push(`Focus on practical applications and concrete examples. `);
                }
                else if (user.learningStyle === 'theoretical') {
                    messageParts.push(`Include theoretical underpinnings and conceptual frameworks. `);
                }
            }
            // Add standard evaluation guidelines
            messageParts.push(`Your evaluation should be thorough, fair, and aimed at helping the user improve. `);
            messageParts.push(`Always provide specific examples from their response to illustrate your points. `);
            messageParts.push(`Balance critique with encouragement to maintain motivation.`);
            // Add output format requirements
            messageParts.push(`\n\nYour response MUST follow the exact JSON structure specified in the prompt. `);
            messageParts.push(`Ensure all required fields are included and properly formatted.`);
            return messageParts.join('');
        }
        catch (error) {
            log('error', 'Error building system message', {
                error: error.message,
                stack: error.stack
            });
            throw new PromptConstructionError(`Failed to build system message: ${error.message}`, {
                originalError: error
            });
        }
    }
    /**
     * Get category weights based on challenge type and focus area
     * @param {Object} challenge - Challenge object
     * @param {Object} options - Additional options
     * @returns {Object} Category weights mapping
     * @private
     */
    static getCategoryWeights(challenge, options = {}) {
        // Default weights for general challenges
        const defaultWeights = {
            accuracy: 35,
            clarity: 25,
            reasoning: 25,
            creativity: 15
        };
        // Get challenge type
        const challengeType = challenge.challengeType ||
            challenge.challengeTypeCode ||
            options.challengeTypeName ||
            'standard';
        // Get challenge focus area
        const focusArea = challenge.focusArea || options.focusArea || 'general';
        // Customize weights based on challenge type and focus area
        switch (challengeType.toLowerCase()) {
            case 'analysis':
                return {
                    accuracy: 30,
                    critical_thinking: 30,
                    clarity: 20,
                    insight: 20
                };
            case 'scenario':
                return {
                    problem_solving: 35,
                    application: 30,
                    reasoning: 20,
                    communication: 15
                };
            case 'research':
                return {
                    thoroughness: 35,
                    methodology: 25,
                    critical_analysis: 25,
                    presentation: 15
                };
            case 'creativity':
                return {
                    originality: 40,
                    effectiveness: 25,
                    elaboration: 20,
                    relevance: 15
                };
            case 'technical':
                return {
                    technical_accuracy: 40,
                    implementation: 30,
                    explanation: 20,
                    best_practices: 10
                };
            // Use focus area to customize weights for standard challenges
            default:
                if (focusArea.toLowerCase().includes('ethics')) {
                    return {
                        ethical_reasoning: 40,
                        comprehensiveness: 25,
                        clarity: 20,
                        practical_application: 15
                    };
                }
                else if (focusArea.toLowerCase().includes('literacy')) {
                    return {
                        conceptual_understanding: 35,
                        application: 30,
                        communication: 20,
                        critical_perspective: 15
                    };
                }
                else if (focusArea.toLowerCase().includes('impact')) {
                    return {
                        impact_analysis: 35,
                        stakeholder_consideration: 25,
                        systemic_thinking: 25,
                        practical_insight: 15
                    };
                }
                // Default to standard weights if no specific customization
                return defaultWeights;
        }
    }
    /**
     * Get description for evaluation category
     * @param {string} category - Category name
     * @returns {string} Category description
     * @private
     */
    static getCategoryDescription(category) {
        const descriptions = {
            // Common categories
            accuracy: 'Evaluate factual correctness, depth of knowledge, and absence of misconceptions',
            clarity: 'Assess organization, clarity of expression, and logical flow of ideas',
            reasoning: 'Evaluate logical connections, critical thinking, and soundness of arguments',
            creativity: 'Judge originality of ideas, innovative thinking, and novel approaches',
            // Specialized categories
            critical_thinking: 'Assess depth of analysis, consideration of alternatives, and avoidance of cognitive biases',
            insight: 'Evaluate the presence of meaningful, non-obvious observations and connections',
            problem_solving: 'Judge the effectiveness of solutions, considering constraints and trade-offs',
            application: 'Assess how well concepts are applied to specific situations or problems',
            communication: 'Evaluate clarity, precision, and effectiveness of communication',
            thoroughness: 'Judge comprehensiveness of research, addressing all relevant aspects',
            methodology: 'Evaluate appropriateness and rigor of methods used',
            critical_analysis: 'Assess ability to evaluate sources, identify biases, and synthesize information',
            presentation: 'Judge organization, clarity, and effective use of evidence',
            originality: 'Evaluate uniqueness and novelty of ideas and approach',
            effectiveness: 'Assess how well the response achieves its intended purpose',
            elaboration: 'Evaluate depth, detail, and development of ideas',
            relevance: 'Judge how well the response addresses the challenge requirements',
            technical_accuracy: 'Evaluate technical correctness and precision',
            implementation: 'Assess the quality and effectiveness of implementation details',
            explanation: 'Evaluate clarity and completeness of explanations for technical choices',
            best_practices: 'Judge adherence to established standards and best practices',
            // Ethics-focused categories
            ethical_reasoning: 'Evaluate depth and nuance of ethical analysis and reasoning',
            comprehensiveness: 'Assess coverage of relevant ethical dimensions and perspectives',
            practical_application: 'Judge how well ethical principles are applied to concrete situations',
            // AI literacy categories
            conceptual_understanding: 'Evaluate understanding of core AI concepts and principles',
            critical_perspective: 'Assess ability to critically evaluate AI technologies and claims',
            // Impact categories
            impact_analysis: 'Evaluate depth and breadth of impact analysis across domains',
            stakeholder_consideration: 'Assess identification and consideration of affected stakeholders',
            systemic_thinking: 'Evaluate understanding of complex systemic interactions and dynamics'
        };
        return descriptions[category.toLowerCase()] || 'Evaluate this aspect of the response';
    }
}
export default EvaluationPromptBuilder;
