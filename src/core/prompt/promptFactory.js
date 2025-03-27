/**
 * Prompt Factory
 * 
 * Factory for creating different types of prompts with consistent structure
 * 
 * @module promptFactory
 */

/**
 * Prompt Types enum
 */
const PROMPT_TYPES = {
  CHALLENGE: 'challenge',
  EVALUATION: 'evaluation',
  FOCUS_AREA: 'focus-area',
  PERSONALITY: 'personality'
};

/**
 * Prompt Factory for building various types of prompts
 */
class PromptFactory {
  /**
   * Build a prompt based on type and parameters
   * @param {string} type - Type of prompt to build
   * @param {Object} params - Parameters for the prompt
   * @returns {string} The built prompt
   */
  static buildPrompt(type, params) {
    // Log prompt building
    console.debug('Building prompt using factory pattern', {
      type,
      params: Object.keys(params)
    });
    
    switch (type) {
      case PROMPT_TYPES.CHALLENGE:
        return this.buildChallengePrompt(params);
      case PROMPT_TYPES.EVALUATION:
        return this.buildEvaluationPrompt(params);
      case PROMPT_TYPES.FOCUS_AREA:
        return this.buildFocusAreaPrompt(params);
      case PROMPT_TYPES.PERSONALITY:
        return this.buildPersonalityPrompt(params);
      default:
        throw new Error(`Unknown prompt type: ${type}`);
    }
  }
  
  /**
   * Build a challenge prompt
   * @param {Object} params - Challenge prompt parameters
   * @returns {string} Challenge prompt
   */
  static buildChallengePrompt(params) {
    const { user, challengeParams, gameState, options = {} } = params;
    
    // Extract user profile data
    const userProfile = `
USER PROFILE
Name: ${user.fullName || 'Anonymous'}
Professional Title: ${user.professionalTitle || 'Professional'}
Focus Areas: ${user.focusAreas?.join(', ') || 'Not specified'}
Dominant Traits: ${user.dominantTraits?.join(', ') || 'Not specified'}
`;

    // Extract challenge parameters
    const challengeParameters = `
CHALLENGE PARAMETERS
Type: ${challengeParams.challengeTypeCode || challengeParams.challengeType || 'Not specified'}
Format: ${challengeParams.formatTypeCode || challengeParams.formatType || 'open-ended'}
Difficulty: ${challengeParams.difficulty || 'intermediate'}
Focus Area: ${challengeParams.focusArea || 'Not specified'}
`;

    // Add context from recent challenges if available
    const recentChallenges = gameState?.recentChallenges || [];
    let recentChallengeContext = '';
    
    if (recentChallenges.length > 0) {
      recentChallengeContext = `
RECENT CHALLENGES
${recentChallenges.map(c => `- ${c.title} (${c.challengeTypeCode || c.challengeType || 'Unknown type'})`).join('\n')}
`;
    }

    // Set creativity guidance
    const creativeVariation = options.creativeVariation || 0.7;
    const creativityGuidance = `
CREATIVITY GUIDANCE
- Variation level: ${Math.floor(creativeVariation * 100)}%
- ${creativeVariation > 0.8 ? 'Generate a highly creative and unique challenge.' : 
     creativeVariation > 0.6 ? 'Balance creativity with structured learning.' : 
     'Focus on foundational concepts with moderate creativity.'}
${options.allowDynamicTypes ? '- You may create novel challenge types beyond the standard categories when appropriate.' : ''}
${options.suggestNovelTypes ? '- You are encouraged to suggest creative and unique challenge types tailored to this specific user.' : ''}
`;

    // Build the full prompt
    return `CHALLENGE GENERATION TASK
Generate a challenge for the user based on their profile and the specified parameters.

${userProfile}
${challengeParameters}
${recentChallengeContext}
${creativityGuidance}

RESPONSE FORMAT
Return the challenge as a JSON object with the following structure:
{
  "title": "Challenge title",
  "content": {
    "context": "Background information and context",
    "scenario": "Specific scenario or problem statement",
    "instructions": "What the user needs to do"
  },
  "questions": [
    {
      "id": "q1",
      "text": "Question text",
      "type": "open-ended | multiple-choice | reflection",
      "options": ["Option 1", "Option 2", "Option 3"] // For multiple-choice only
    }
  ],
  "evaluationCriteria": {
    "criteria1": {
      "description": "Description of criteria",
      "weight": 0.5
    }
  }
}`;
  }
  
  /**
   * Build an evaluation prompt
   * @param {Object} params - Evaluation prompt parameters
   * @returns {string} Evaluation prompt
   */
  static buildEvaluationPrompt(params) {
    const { challenge, userResponse, options = {} } = params;
    
    // Extract challenge data
    const challengeData = `
CHALLENGE DETAILS
Title: ${challenge.title}
Type: ${options.challengeTypeName || challenge.challengeTypeCode || challenge.challengeType || 'Not specified'} 
Format: ${options.formatTypeName || challenge.formatTypeCode || challenge.formatType || 'Not specified'}
Focus Area: ${challenge.focusArea || 'Not specified'}
Difficulty: ${challenge.difficulty || 'intermediate'}
`;

    // Format challenge content and questions
    let contentAndQuestions = `
CHALLENGE CONTENT
`;
    
    if (typeof challenge.content === 'object') {
      if (challenge.content.context) contentAndQuestions += `Context: ${challenge.content.context}\n`;
      if (challenge.content.scenario) contentAndQuestions += `Scenario: ${challenge.content.scenario}\n`;
      if (challenge.content.instructions) contentAndQuestions += `Instructions: ${challenge.content.instructions}\n`;
    } else {
      contentAndQuestions += `Content: ${JSON.stringify(challenge.content)}\n`;
    }
    
    contentAndQuestions += `
QUESTIONS
${(challenge.questions || []).map((q, idx) => 
  `${idx + 1}. ${q.text || 'No question text'} (${q.type || 'open-ended'})`
).join('\n')}
`;

    // Format user responses
    const userResponseText = `
USER RESPONSES
${userResponse.map((resp, idx) => {
  const question = (challenge.questions || []).find(q => q.id === resp.questionId) || { text: `Question ${idx + 1}` };
  return `${idx + 1}. ${question.text || 'No question text'}\nResponse: ${resp.answer}`;
}).join('\n\n')}
`;

    // Add evaluation criteria if available
    let evaluationCriteriaText = '';
    if (challenge.evaluationCriteria) {
      evaluationCriteriaText = `
EVALUATION CRITERIA
${Object.entries(challenge.evaluationCriteria).map(([key, criteria]) => 
  `${key}: ${criteria.description} (Weight: ${criteria.weight || 'Not specified'})`
).join('\n')}
`;
    }
    
    // Add any custom evaluation guidance
    const customGuidance = options.typeMetadata?.evaluationGuidance || '';
    if (customGuidance) {
      evaluationCriteriaText += `\nCUSTOM EVALUATION GUIDANCE\n${customGuidance}\n`;
    }

    // Build the full prompt
    return `RESPONSE EVALUATION TASK
Evaluate the user's responses to the challenge based on the provided criteria.

${challengeData}
${contentAndQuestions}
${userResponseText}
${evaluationCriteriaText}

RESPONSE FORMAT
Return the evaluation as a JSON object with the following structure:
{
  "overallScore": 85, // 0-100 score
  "categoryScores": {
    "understanding": 90,
    "reasoning": 80,
    "communication": 85
  },
  "feedback": "Overall feedback explaining the evaluation",
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "improvementSuggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ]
}`;
  }
  
  /**
   * Build a focus area prompt
   * @param {Object} params - Focus area prompt parameters
   * @returns {string} Focus area prompt
   */
  static buildFocusAreaPrompt(params) {
    // Implementation would be similar to the other prompt builders
    // For now, return a placeholder
    return "FOCUS AREA RECOMMENDATION TASK\n... focus area prompt details ...";
  }
  
  /**
   * Build a personality assessment prompt
   * @param {Object} params - Personality assessment prompt parameters
   * @returns {string} Personality assessment prompt
   */
  static buildPersonalityPrompt(params) {
    // Implementation would be similar to the other prompt builders
    // For now, return a placeholder
    return "PERSONALITY ASSESSMENT TASK\n... personality prompt details ...";
  }
}

module.exports = {
  PromptFactory,
  PROMPT_TYPES
}; 