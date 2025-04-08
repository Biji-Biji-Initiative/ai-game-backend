'use strict';

import { PROMPT_TYPES } from './promptTypes.js';

/**
 * Extended prompt types for new features
 */
export const promptTypesExtended = {
  ...PROMPT_TYPES,
  
  // AI Rival System prompt types
  RIVAL_GENERATION: 'rival_generation',
  RIVAL_PERSONALITY: 'rival_personality',
  RIVAL_CHALLENGE: 'rival_challenge',
  RIVAL_FEEDBACK: 'rival_feedback',
  
  // Achievement Badge System prompt types
  BADGE_DESCRIPTION: 'badge_description',
  BADGE_ACHIEVEMENT_MESSAGE: 'badge_achievement_message',
  BADGE_RECOMMENDATION: 'badge_recommendation',
  
  // Challenge Leaderboards prompt types
  LEADERBOARD_INSIGHT: 'leaderboard_insight',
  LEADERBOARD_MOTIVATION: 'leaderboard_motivation',
  LEADERBOARD_COMPETITION: 'leaderboard_competition',
  
  // Neural Network Progression prompt types
  NETWORK_INSIGHT: 'network_insight',
  NETWORK_GROWTH_RECOMMENDATION: 'network_growth_recommendation',
  NETWORK_COMPARISON: 'network_comparison',
  NETWORK_VISUALIZATION: 'network_visualization'
};

/**
 * Get all prompt types including extended ones
 * @returns {Object} Combined prompt types
 */
export function getAllPromptTypes() {
  return promptTypesExtended;
}

/**
 * Check if a prompt type is valid
 * @param {string} type - Prompt type to check
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidPromptType(type) {
  return Object.values(promptTypesExtended).includes(type);
}

export default promptTypesExtended;
