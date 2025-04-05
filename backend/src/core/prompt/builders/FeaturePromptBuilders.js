'use strict';

import { promptTypesExtended } from '../promptTypesExtended.js';

/**
 * Feature-specific prompt builders for the new features
 */
class FeaturePromptBuilders {
  /**
   * Create a new FeaturePromptBuilders instance
   * @param {Object} options - Configuration options
   * @param {Object} options.config - Application configuration
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.config = options.config || {};
    this.logger = options.logger || console;
  }

  /**
   * Build a rival generation prompt
   * @param {Object} params - Parameters for the prompt
   * @param {Object} params.user - User data
   * @param {Object} params.personality - User's personality data
   * @param {Array} params.focusAreas - User's focus areas
   * @param {Object} params.preferences - User's preferences
   * @returns {Object} Prompt object
   */
  buildRivalGenerationPrompt(params) {
    const { user, personality, focusAreas, preferences } = params;
    
    const prompt = {
      type: promptTypesExtended.RIVAL_GENERATION,
      content: `Generate a personalized AI rival for the user with the following characteristics:
        - User profile: ${JSON.stringify(user)}
        - Personality traits: ${JSON.stringify(personality)}
        - Focus areas: ${JSON.stringify(focusAreas)}
        - Preferences: ${JSON.stringify(preferences)}
        
        Create a rival that is challenging but beatable, with complementary strengths and weaknesses.
        Include a name, personality traits, backstory, strengths, weaknesses, and preferred challenge types.`,
      metadata: {
        userId: user.id,
        personalityId: personality.id,
        focusAreaIds: focusAreas.map(fa => fa.id)
      }
    };
    
    return prompt;
  }

  /**
   * Build a rival personality prompt
   * @param {Object} params - Parameters for the prompt
   * @param {Object} params.user - User data
   * @param {Object} params.rival - Existing rival data
   * @returns {Object} Prompt object
   */
  buildRivalPersonalityPrompt(params) {
    const { user, rival } = params;
    
    const prompt = {
      type: promptTypesExtended.RIVAL_PERSONALITY,
      content: `Develop a detailed personality profile for the rival:
        - Rival data: ${JSON.stringify(rival)}
        - User data: ${JSON.stringify(user)}
        
        Elaborate on the rival's personality traits, communication style, motivations, and how they would interact with the user.
        Make the rival feel like a real person with depth and nuance.`,
      metadata: {
        userId: user.id,
        rivalId: rival.id
      }
    };
    
    return prompt;
  }

  /**
   * Build a badge description prompt
   * @param {Object} params - Parameters for the prompt
   * @param {Object} params.badge - Badge data
   * @param {Object} params.user - User data
   * @returns {Object} Prompt object
   */
  buildBadgeDescriptionPrompt(params) {
    const { badge, user } = params;
    
    const prompt = {
      type: promptTypesExtended.BADGE_DESCRIPTION,
      content: `Create a compelling description for the following badge:
        - Badge data: ${JSON.stringify(badge)}
        - User context: ${JSON.stringify(user)}
        
        The description should be motivating and explain the significance of the achievement.
        Include what the badge represents and why it matters in the user's cognitive development journey.`,
      metadata: {
        userId: user.id,
        badgeId: badge.id,
        badgeCategory: badge.category
      }
    };
    
    return prompt;
  }

  /**
   * Build a badge achievement message prompt
   * @param {Object} params - Parameters for the prompt
   * @param {Object} params.badge - Badge data
   * @param {Object} params.user - User data
   * @param {Object} params.achievement - Achievement data
   * @returns {Object} Prompt object
   */
  buildBadgeAchievementMessagePrompt(params) {
    const { badge, user, achievement } = params;
    
    const prompt = {
      type: promptTypesExtended.BADGE_ACHIEVEMENT_MESSAGE,
      content: `Create a celebratory message for the user who just earned this badge:
        - Badge data: ${JSON.stringify(badge)}
        - User data: ${JSON.stringify(user)}
        - Achievement details: ${JSON.stringify(achievement)}
        
        The message should be congratulatory, personalized, and highlight the significance of this achievement.
        Include how this achievement relates to their cognitive development journey.`,
      metadata: {
        userId: user.id,
        badgeId: badge.id,
        achievementId: achievement.id
      }
    };
    
    return prompt;
  }

  /**
   * Build a leaderboard insight prompt
   * @param {Object} params - Parameters for the prompt
   * @param {Object} params.user - User data
   * @param {Object} params.leaderboard - Leaderboard data
   * @param {Object} params.userRank - User's rank data
   * @returns {Object} Prompt object
   */
  buildLeaderboardInsightPrompt(params) {
    const { user, leaderboard, userRank } = params;
    
    const prompt = {
      type: promptTypesExtended.LEADERBOARD_INSIGHT,
      content: `Provide insightful analysis of the user's performance on this leaderboard:
        - User data: ${JSON.stringify(user)}
        - Leaderboard data: ${JSON.stringify(leaderboard)}
        - User's rank information: ${JSON.stringify(userRank)}
        
        Include observations about their performance trends, areas where they excel compared to others,
        and suggestions for how they might improve their ranking. Make the insights personalized and actionable.`,
      metadata: {
        userId: user.id,
        leaderboardId: leaderboard.id,
        leaderboardType: leaderboard.type
      }
    };
    
    return prompt;
  }

  /**
   * Build a network insight prompt
   * @param {Object} params - Parameters for the prompt
   * @param {Object} params.user - User data
   * @param {Object} params.network - Network data
   * @param {Array} params.progressHistory - Progress history data
   * @returns {Object} Prompt object
   */
  buildNetworkInsightPrompt(params) {
    const { user, network, progressHistory } = params;
    
    const prompt = {
      type: promptTypesExtended.NETWORK_INSIGHT,
      content: `Analyze the user's neural network progression and provide meaningful insights:
        - User data: ${JSON.stringify(user)}
        - Network data: ${JSON.stringify(network)}
        - Progress history: ${JSON.stringify(progressHistory)}
        
        Identify patterns in their cognitive development, highlight areas of significant growth,
        point out potential areas for improvement, and suggest specific activities or challenges
        that would help strengthen underdeveloped areas of their neural network.`,
      metadata: {
        userId: user.id,
        networkId: network.id
      }
    };
    
    return prompt;
  }

  /**
   * Build a network comparison prompt
   * @param {Object} params - Parameters for the prompt
   * @param {Object} params.user - User data
   * @param {Object} params.userNetwork - User's network data
   * @param {Object} params.rival - Rival data
   * @param {Object} params.rivalNetwork - Rival's network data
   * @returns {Object} Prompt object
   */
  buildNetworkComparisonPrompt(params) {
    const { user, userNetwork, rival, rivalNetwork } = params;
    
    const prompt = {
      type: promptTypesExtended.NETWORK_COMPARISON,
      content: `Compare the user's neural network with their rival's network:
        - User data: ${JSON.stringify(user)}
        - User's network: ${JSON.stringify(userNetwork)}
        - Rival data: ${JSON.stringify(rival)}
        - Rival's network: ${JSON.stringify(rivalNetwork)}
        
        Provide a detailed comparison highlighting where the user is stronger, where the rival is stronger,
        and specific strategies the user could employ to overcome the rival's advantages. Make the comparison
        motivating and actionable.`,
      metadata: {
        userId: user.id,
        rivalId: rival.id
      }
    };
    
    return prompt;
  }
}

export default FeaturePromptBuilders;
