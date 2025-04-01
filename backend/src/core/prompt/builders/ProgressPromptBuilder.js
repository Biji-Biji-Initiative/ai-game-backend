import { logger } from "#app/core/infra/logging/logger.js";
import { appendApiStandards, getStructuredOutputInstructions, getResponsesApiInstruction } from "#app/core/prompt/common/apiStandards.js";
import { validateProgressPromptParams } from "#app/core/prompt/schemas/progressSchema.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
'use strict';
const {
  formatForResponsesApi
} = messageFormatter;
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
 * Class responsible for building progress assessment prompts
 */
class ProgressPromptBuilder {
  /**
   * Build a progress assessment prompt based on user's learning history
   * @param {Object} params - Parameters for building the prompt
   * @param {Object} params.user - User data and learning goals
   * @param {Array} [params.challengeAttempts] - History of user's challenge attempts
   * @param {Object} [params.skillProgress] - Progress in specific skills
   * @param {Object} [params.options] - Additional prompt options
   * @returns {Object} Object with input and instructions for Responses API
   * @throws {Error} If required parameters are missing
   */
  static build(params) {
    try {
      // Validate parameters against schema
      const validatedParams = validateProgressPromptParams(params);
      const {
        user,
        challengeAttempts = [],
        skillProgress = {},
        options = {}
      } = validatedParams;
      // Extract key user information
      const fullName = user.fullName || 'the user';
      const skillLevel = user.skillLevel || 'beginner';
      const focusAreas = user.focusAreas || [];
      const learningGoals = user.learningGoals || [];
      const startDate = user.startDate || '';
      // Extract options
      const timeRange = options.timeRange || 'all';
      const detailLevel = options.detailLevel || 'detailed';
      const includePredictions = options.includePredictions !== false;
      const includeRecommendations = options.includeRecommendations !== false;
      const targetFocusAreas = options.focusAreas || [];
      // Build the progress assessment prompt
      let prompt = `### PROGRESS ASSESSMENT TASK\n\n`;
      prompt += `Analyze the user's learning progress based on their challenge attempts, skill development, and learning goals. Provide insights on their growth trajectory and personalized recommendations.\n\n`;
      // Add user profile section
      prompt += `### USER PROFILE\n`;
      if (user.fullName) {
        prompt += `Name: ${user.fullName}\n`;
      }
      if (skillLevel) {
        prompt += `Skill Level: ${skillLevel}\n`;
      }
      if (startDate) {
        prompt += `Learning Journey Start Date: ${startDate}\n`;
      }
      if (focusAreas.length > 0) {
        prompt += `Focus Areas: ${focusAreas.join(', ')}\n`;
      }
      if (learningGoals.length > 0) {
        prompt += `Learning Goals: ${learningGoals.join(', ')}\n`;
      }
      if (user.learningStyle) {
        prompt += `Learning Style: ${user.learningStyle}\n`;
      }
      // Add challenge history
      if (challengeAttempts.length > 0) {
        prompt += `\n### CHALLENGE ATTEMPTS\n`;
        prompt += `The user has completed ${challengeAttempts.length} challenges.\n\n`;
        // Calculate overall statistics
        const scores = challengeAttempts.filter(attempt => attempt.score !== undefined).map(attempt => attempt.score);
        if (scores.length > 0) {
          const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          const minScore = Math.min(...scores);
          const maxScore = Math.max(...scores);
          prompt += `Overall Performance:\n`;
          prompt += `- Average Score: ${avgScore.toFixed(1)}%\n`;
          prompt += `- Highest Score: ${maxScore}%\n`;
          prompt += `- Lowest Score: ${minScore}%\n`;
        }
        // Group by focus area for insights
        const focusAreaAttempts = {};
        challengeAttempts.forEach(attempt => {
          if (attempt.focusArea) {
            if (!focusAreaAttempts[attempt.focusArea]) {
              focusAreaAttempts[attempt.focusArea] = [];
            }
            focusAreaAttempts[attempt.focusArea].push(attempt);
          }
        });
        prompt += `\nPerformance by Focus Area:\n`;
        Object.entries(focusAreaAttempts).forEach(([area, attempts]) => {
          const areaScores = attempts.filter(attempt => attempt.score !== undefined).map(attempt => attempt.score);
          if (areaScores.length > 0) {
            const avgAreaScore = areaScores.reduce((sum, score) => sum + score, 0) / areaScores.length;
            prompt += `- ${area}: ${attempts.length} challenges, avg score ${avgAreaScore.toFixed(1)}%\n`;
          } else {
            prompt += `- ${area}: ${attempts.length} challenges, no scores recorded\n`;
          }
        });
        // Show recent challenge attempts (up to 5)
        prompt += `\nRecent Challenge Attempts:\n`;
        // Sort by completedAt date (newest first) if available
        const sortedAttempts = [...challengeAttempts].sort((a, b) => {
          if (!a.completedAt) {
            return 1;
          }
          if (!b.completedAt) {
            return -1;
          }
          return new Date(b.completedAt) - new Date(a.completedAt);
        });
        const recentAttempts = sortedAttempts.slice(0, 5);
        recentAttempts.forEach((attempt, index) => {
          prompt += `\nChallenge ${index + 1}:\n`;
          prompt += `- Title: ${attempt.title || 'Untitled Challenge'}\n`;
          if (attempt.focusArea) {
            prompt += `- Focus Area: ${attempt.focusArea}\n`;
          }
          if (attempt.type) {
            prompt += `- Type: ${attempt.type}\n`;
          }
          if (attempt.score !== undefined) {
            prompt += `- Score: ${attempt.score}%\n`;
          }
          if (attempt.difficulty !== undefined) {
            prompt += `- Difficulty: ${attempt.difficulty}/10\n`;
          }
          if (attempt.completedAt) {
            prompt += `- Completed: ${attempt.completedAt}\n`;
          }
          if (attempt.strengths && attempt.strengths.length > 0) {
            prompt += `- Strengths: ${attempt.strengths.join(', ')}\n`;
          }
          if (attempt.weaknesses && attempt.weaknesses.length > 0) {
            prompt += `- Areas for Improvement: ${attempt.weaknesses.join(', ')}\n`;
          }
        });
      } else {
        prompt += `\nNo challenge attempts recorded yet.\n`;
      }
      // Add skill progress if available
      if (Object.keys(skillProgress).length > 0) {
        prompt += `\n### SKILL PROGRESS\n`;
        Object.entries(skillProgress).forEach(([skillName, data]) => {
          prompt += `${skillName}:\n`;
          if (data.level !== undefined) {
            prompt += `- Current Level: ${data.level}/10\n`;
          }
          if (data.history && data.history.length > 0) {
            // Sort history by date (oldest first)
            const sortedHistory = [...data.history].sort((a, b) => new Date(a.date) - new Date(b.date));
            const firstEntry = sortedHistory[0];
            const lastEntry = sortedHistory[sortedHistory.length - 1];
            prompt += `- Starting Level: ${firstEntry.level}/10 (${firstEntry.date})\n`;
            prompt += `- Current Level: ${lastEntry.level}/10 (${lastEntry.date})\n`;
            const improvement = lastEntry.level - firstEntry.level;
            if (improvement > 0) {
              prompt += `- Improvement: +${improvement} points\n`;
            } else if (improvement < 0) {
              prompt += `- Change: ${improvement} points\n`;
            } else {
              prompt += `- No level change recorded\n`;
            }
          }
        });
      }
      // Add analysis guidelines
      prompt += `\n### ANALYSIS GUIDELINES\n`;
      prompt += `Time Range: Analyze progress during the '${timeRange}' timeframe.\n\n`;
      if (targetFocusAreas.length > 0) {
        prompt += `Focus specifically on these focus areas: ${targetFocusAreas.join(', ')}\n\n`;
      }
      prompt += `For this analysis:\n`;
      if (detailLevel === 'comprehensive') {
        prompt += `- Provide a comprehensive assessment of the user's progress\n`;
        prompt += `- Include detailed insights for each focus area and skill\n`;
        prompt += `- Identify specific patterns in the user's learning journey\n`;
        prompt += `- Provide in-depth analysis of strengths and areas for improvement\n`;
      } else if (detailLevel === 'detailed') {
        prompt += `- Provide a detailed assessment of the user's overall progress\n`;
        prompt += `- Include insights for key focus areas and skills\n`;
        prompt += `- Identify notable patterns in the user's learning journey\n`;
        prompt += `- Analyze main strengths and areas for improvement\n`;
      } else {
        prompt += `- Provide a basic assessment of the user's progress\n`;
        prompt += `- Include brief insights on key focus areas\n`;
        prompt += `- Identify the most significant patterns\n`;
        prompt += `- Note primary strengths and areas for improvement\n`;
      }
      if (includePredictions) {
        prompt += `- Predict future growth trajectory based on current data\n`;
      }
      if (includeRecommendations) {
        prompt += `- Provide personalized recommendations to accelerate progress\n`;
        prompt += `- Suggest specific challenge types that would benefit the user\n`;
        prompt += `- Recommend focus areas to prioritize based on goals and performance\n`;
      }
      // Add response format instructions
      prompt += `\n### RESPONSE FORMAT\n`;
      prompt += `Return your analysis as a JSON object with the following structure:\n\n`;
      prompt += `{
  'overallProgress': {
    'summary': 'Brief summary of overall progress',
    'score': 7,
    'achievements': ['Achievement 1', 'Achievement 2'],
    'growthAreas': ['Growth area 1', 'Growth area 2']
  },
  'focusAreaProgress': [
    {
      'name': 'Focus area name',
      'level': 6,
      'strengths': ['Strength 1', 'Strength 2'],
      'weaknesses': ['Weakness 1', 'Weakness 2'],
      'improvement': '+2 points',
      'recommendations': ['Recommendation 1', 'Recommendation 2']
    }
  ],
  'skillBreakdown': [
    {
      'name': 'Skill name',
      'currentLevel': 7,
      'previousLevel': 5,
      'improvement': '+2 points',
      'notes': 'Additional insights about this skill'
    }
  ],
  'growthTrajectory': {
    'pattern': 'Consistent/Irregular/Accelerating/etc.',
    'projectedGrowth': 'Projection of future growth',
    'timeToNextLevel': 'Estimated time to reach next proficiency level'
  },
  'recommendations': {
    'priorities': ['Priority 1', 'Priority 2'],
    'suggestedChallenges': ['Challenge type 1', 'Challenge type 2'],
    'learningResources': ['Resource 1', 'Resource 2'],
    'customizedPlan': 'Brief personalized learning plan'
  }
}\n\n`;
      // Add responses API instruction
      prompt += `\n\n${getResponsesApiInstruction()}`;
      // Apply API standards
      prompt = appendApiStandards(prompt);
      // Create system message based on the detail level and time range
      const systemMessage = `You are an AI progress analyst specializing in learning journey assessment and personalized recommendations.
Your analysis should be data-driven, balanced, and provide ${detailLevel} insights into the user's progress over the ${timeRange} time period.
${includeRecommendations ? 'Include specific, actionable recommendations that align with their learning goals and current trajectory.' : ''}
${includePredictions ? 'Include evidence-based predictions about their future growth based on current trends.' : ''}
Ensure your response follows the exact JSON format specified in the instructions, with no extraneous text.`;
      // Format for Responses API and return
      return formatForResponsesApi(prompt.trim(), systemMessage);
    } catch (error) {
      log('error', 'Error building progress assessment prompt', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  /**
   * Factory method to create a builder with default settings
   * @returns {Function} Configured build function
   */
  static createBuilder() {
    return ProgressPromptBuilder.build;
  }
}
export default ProgressPromptBuilder;