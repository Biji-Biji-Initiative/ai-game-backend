/**
 * Enhanced Evaluation Prompt Builder
 * Specialized class for generating comprehensive evaluation prompts with user context
 * and personalization.
 * 
 * @module EvaluationPromptBuilder
 * @requires logger
 * @requires apiStandards
 * @requires evaluationSchema
 */

const { logger } = require('../../../core/infra/logging/logger');
const { 
  appendApiStandards, 
  getStructuredOutputInstructions,
  getResponsesApiInstruction
} = require('../common/apiStandards');
const { validateEvaluationPromptParams } = require('../schemas/evaluationSchema');

/**
 * Helper function for logging if logger exists
 */
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
  } else {
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
   * @param {Object} [params.evaluationHistory] - Previous evaluation data for growth tracking
   * @param {Object} [params.options] - Additional prompt options
   * @returns {string} Generated evaluation prompt
   * @throws {Error} If required parameters are missing
   */
  static build(params) {
    try {
      // Validate parameters against schema
      const validatedParams = validateEvaluationPromptParams(params);
      
      const { challenge, userResponse, user = {}, evaluationHistory = {}, options = {} } = validatedParams;
      
      // Extract scoring categories and weights based on challenge type and focus area
      const categoryWeights = this.getCategoryWeights(challenge, options);
      
      // Build the evaluation prompt
      let prompt = `### EVALUATION TASK\n\n`;
      prompt += `Evaluate the user's response to the challenge with detailed scoring in multiple categories, personalized feedback, and growth tracking.\n\n`;
      
      // Add challenge information
      prompt += `### CHALLENGE INFORMATION\n`;
      prompt += `Title: ${challenge.title || 'Untitled Challenge'}\n`;
      prompt += `Type: ${challenge.challengeType || challenge.challengeTypeCode || 'standard'}\n`;
      prompt += `Focus Area: ${challenge.focusArea || 'general'}\n`;
      if (challenge.difficulty) {
        prompt += `Difficulty: ${challenge.difficulty}\n`;
      }
      prompt += `\n`;
      
      // Add challenge content
      if (typeof challenge.content === 'object') {
        prompt += `### CHALLENGE CONTENT\n`;
        if (challenge.content.context) prompt += `Context: ${challenge.content.context}\n\n`;
        if (challenge.content.scenario) prompt += `Scenario: ${challenge.content.scenario}\n\n`;
        if (challenge.content.instructions) prompt += `Instructions: ${challenge.content.instructions}\n\n`;
      } else if (typeof challenge.content === 'string' && challenge.content.trim()) {
        prompt += `### CHALLENGE CONTENT\n${challenge.content}\n\n`;
      }
      
      // Add user context - NEW
      if (user && Object.keys(user).length > 0) {
        prompt += `### USER CONTEXT\n`;
        if (user.name) prompt += `Name: ${user.name}\n`;
        if (user.email) prompt += `User ID: ${user.email}\n`;
        if (user.skillLevel) prompt += `Skill Level: ${user.skillLevel}\n`;
        
        if (user.focusAreas && Array.isArray(user.focusAreas) && user.focusAreas.length > 0) {
          prompt += `Focus Areas: ${user.focusAreas.join(', ')}\n`;
        }
        
        if (user.learningGoals && Array.isArray(user.learningGoals) && user.learningGoals.length > 0) {
          prompt += `Learning Goals: ${user.learningGoals.join(', ')}\n`;
        }
        
        if (user.completedChallenges) {
          prompt += `Completed Challenges: ${user.completedChallenges}\n`;
        }
        
        prompt += `\n`;
      }
      
      // Add evaluation history for growth tracking - NEW
      if (evaluationHistory && Object.keys(evaluationHistory).length > 0) {
        prompt += `### PREVIOUS EVALUATION DATA\n`;
        
        if (evaluationHistory.previousScore !== undefined) {
          prompt += `Previous Overall Score: ${evaluationHistory.previousScore}\n`;
        }
        
        if (evaluationHistory.previousCategoryScores && 
            Object.keys(evaluationHistory.previousCategoryScores).length > 0) {
          prompt += `Previous Category Scores:\n`;
          Object.entries(evaluationHistory.previousCategoryScores).forEach(([category, score]) => {
            prompt += `- ${category}: ${score}\n`;
          });
        }
        
        if (evaluationHistory.consistentStrengths && 
            Array.isArray(evaluationHistory.consistentStrengths) && 
            evaluationHistory.consistentStrengths.length > 0) {
          prompt += `Consistent Strengths: ${evaluationHistory.consistentStrengths.join(', ')}\n`;
        }
        
        if (evaluationHistory.persistentWeaknesses && 
            Array.isArray(evaluationHistory.persistentWeaknesses) && 
            evaluationHistory.persistentWeaknesses.length > 0) {
          prompt += `Areas Needing Improvement: ${evaluationHistory.persistentWeaknesses.join(', ')}\n`;
        }
        
        prompt += `\n`;
      }
      
      // Add user response
      prompt += `### USER RESPONSE\n${typeof userResponse === 'string' ? userResponse : JSON.stringify(userResponse)}\n\n`;
      
      // Add category scoring instructions
      prompt += `### EVALUATION CRITERIA\n`;
      prompt += `Evaluate the response using the following criteria:\n\n`;
      
      // Add detailed criteria for each category
      Object.entries(categoryWeights).forEach(([category, weight]) => {
        const description = this.getCategoryDescription(category);
        prompt += `- ${category} (0-${weight} points): ${description}\n`;
      });
      
      prompt += `\nThe total maximum score is 100 points.\n\n`;
      
      // Add strength analysis instructions
      prompt += `### STRENGTH ANALYSIS\n`;
      prompt += `For each strength identified, provide a detailed analysis including:\n`;
      prompt += `1. What the user did well (the strength itself)\n`;
      prompt += `2. Why this aspect is effective or important\n`;
      prompt += `3. How it specifically contributes to the quality of the response\n\n`;
      
      // Add improvement plan instructions - NEW
      prompt += `### IMPROVEMENT PLANS\n`;
      prompt += `For each area needing improvement, provide a detailed plan including:\n`;
      prompt += `1. Specific issue to address\n`;
      prompt += `2. Why improving this area is important\n`;
      prompt += `3. Actionable steps to improve\n`;
      prompt += `4. Resources or exercises that could help\n\n`;
      
      // Add growth tracking instructions - NEW
      if (evaluationHistory && Object.keys(evaluationHistory).length > 0) {
        prompt += `### GROWTH TRACKING\n`;
        prompt += `Compare the current response to previous evaluations:\n`;
        prompt += `1. Identify improvements since the last evaluation\n`;
        prompt += `2. Note any persistent strengths or weaknesses\n`;
        prompt += `3. Provide specific growth insights\n\n`;
      }
      
      // Add personalized recommendations instructions - NEW
      prompt += `### PERSONALIZED RECOMMENDATIONS\n`;
      prompt += `Based on the user's context, provide:\n`;
      prompt += `1. Personalized next steps tailored to their focus areas and skill level\n`;
      prompt += `2. 2-3 specific resources that would help improvement (articles, books, courses, etc.)\n`;
      prompt += `3. 1-2 recommended challenge types that would build on current strengths or address weaknesses\n\n`;
      
      // Add response format instructions - UPDATED FOR ENHANCED FORMAT
      prompt += `### RESPONSE FORMAT\n`;
      prompt += `Provide your evaluation as a JSON object with the following structure:\n\n`;
      prompt += `{
  "categoryScores": {
${Object.keys(categoryWeights).map(cat => `    "${cat}": 25`).join(',\n')}
  },
  "overallScore": 85,
  "overallFeedback": "Comprehensive evaluation of the entire response...",
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "strengthAnalysis": [
    {
      "strength": "Strength 1",
      "analysis": "Detailed explanation of why this is effective...",
      "impact": "How this contributes to overall quality..."
    }
  ],
  "areasForImprovement": [
    "Area for improvement 1",
    "Area for improvement 2"
  ],
  "improvementPlans": [
    {
      "area": "Area for improvement 1",
      "importance": "Why improving this is important...",
      "actionItems": ["Specific action 1", "Specific action 2"],
      "resources": ["Suggested resource or exercise"]
    }
  ],
  "growthInsights": {
    "improvements": ["Specific improvements since last evaluation"],
    "persistentStrengths": ["Strengths maintained across evaluations"],
    "developmentAreas": ["Areas that still need focus"],
    "growthSummary": "Overall assessment of growth trajectory..."
  },
  "recommendations": {
    "nextSteps": "Personalized next steps for improvement...",
    "resources": [
      {"title": "Resource Title", "type": "article|video|course", "url": "URL if available", "relevance": "Why this is relevant"}
    ],
    "recommendedChallenges": [
      {"title": "Challenge Type", "description": "Brief description", "relevance": "Why this would help growth"}
    ]
  }
}\n\n`;
      
      // Add Responses API instruction
      prompt += `\n\n${getResponsesApiInstruction()}`;
      
      // Ensure API standards are applied
      prompt = appendApiStandards(prompt);
      
      return prompt.trim();
    } catch (error) {
      log('error', 'Error building evaluation prompt', { 
        error: error.message,
        stack: error.stack
      });
      throw error;
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
        } else if (focusArea.toLowerCase().includes('literacy')) {
          return {
            conceptual_understanding: 35,
            application: 30,
            communication: 20,
            critical_perspective: 15
          };
        } else if (focusArea.toLowerCase().includes('impact')) {
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
      accuracy: "Evaluate factual correctness, depth of knowledge, and absence of misconceptions",
      clarity: "Assess organization, clarity of expression, and logical flow of ideas",
      reasoning: "Evaluate logical connections, critical thinking, and soundness of arguments",
      creativity: "Judge originality of ideas, innovative thinking, and novel approaches",
      
      // Specialized categories
      critical_thinking: "Assess depth of analysis, consideration of alternatives, and avoidance of cognitive biases",
      insight: "Evaluate the presence of meaningful, non-obvious observations and connections",
      problem_solving: "Judge the effectiveness of solutions, considering constraints and trade-offs",
      application: "Assess how well concepts are applied to specific situations or problems",
      communication: "Evaluate clarity, precision, and effectiveness of communication",
      thoroughness: "Judge comprehensiveness of research, addressing all relevant aspects",
      methodology: "Evaluate appropriateness and rigor of methods used",
      critical_analysis: "Assess ability to evaluate sources, identify biases, and synthesize information",
      presentation: "Judge organization, clarity, and effective use of evidence",
      originality: "Evaluate uniqueness and novelty of ideas and approach",
      effectiveness: "Assess how well the response achieves its intended purpose",
      elaboration: "Evaluate depth, detail, and development of ideas",
      relevance: "Judge how well the response addresses the challenge requirements",
      technical_accuracy: "Evaluate technical correctness and precision",
      implementation: "Assess the quality and effectiveness of implementation details",
      explanation: "Evaluate clarity and completeness of explanations for technical choices",
      best_practices: "Judge adherence to established standards and best practices",
      
      // Ethics-focused categories
      ethical_reasoning: "Evaluate depth and nuance of ethical analysis and reasoning",
      comprehensiveness: "Assess coverage of relevant ethical dimensions and perspectives",
      practical_application: "Judge how well ethical principles are applied to concrete situations",
      
      // AI literacy categories
      conceptual_understanding: "Evaluate understanding of core AI concepts and principles",
      critical_perspective: "Assess ability to critically evaluate AI technologies and claims",
      
      // Impact categories
      impact_analysis: "Evaluate depth and breadth of impact analysis across domains",
      stakeholder_consideration: "Assess identification and consideration of affected stakeholders",
      systemic_thinking: "Evaluate understanding of complex systemic interactions and dynamics",
      practical_insight: "Judge the practicality and applicability of insights about AI's impact"
    };
    
    return descriptions[category] || `Evaluate the quality of ${category.replace(/_/g, ' ')}`;
  }
  
  /**
   * Factory method to create a builder with default settings
   * @returns {Function} Configured build function
   */
  static createBuilder() {
    return EvaluationPromptBuilder.build;
  }
}

module.exports = EvaluationPromptBuilder; 