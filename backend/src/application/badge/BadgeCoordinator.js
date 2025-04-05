'use strict';

import BaseCoordinator from '../BaseCoordinator.js';

/**
 * BadgeCoordinator class
 * 
 * Coordinates operations related to achievement badges, orchestrating the interaction
 * between controllers, services, and repositories while maintaining separation of concerns.
 */
class BadgeCoordinator extends BaseCoordinator {
  /**
   * Create a new BadgeCoordinator
   * 
   * @param {Object} dependencies - Dependencies required by the coordinator
   * @param {Object} dependencies.badgeService - Service for managing badges
   * @param {Object} dependencies.userService - Service for user operations
   * @param {Object} dependencies.progressService - Service for progress operations
   * @param {Object} dependencies.promptService - Service for generating prompts
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor(dependencies = {}) {
    super({ name: 'BadgeCoordinator', logger: dependencies.logger });
    
    this.validateDependencies(dependencies, [
      'badgeService',
      'userService',
      'progressService',
      'promptService'
    ]);
    
    this.badgeService = dependencies.badgeService;
    this.userService = dependencies.userService;
    this.progressService = dependencies.progressService;
    this.promptService = dependencies.promptService;
  }
  
  /**
   * Get all badges for a user
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of badges
   */
  async getUserBadges(userId, options = {}) {
    return this.executeOperation(async () => {
      return this.badgeService.getBadgesByUserId(userId, options);
    }, 'getUserBadges', { userId, options });
  }
  
  /**
   * Get all available badge types
   * 
   * @returns {Promise<Array<Object>>} List of badge types
   */
  async getBadgeTypes() {
    return this.executeOperation(async () => {
      return this.badgeService.getBadgeTypes();
    }, 'getBadgeTypes');
  }
  
  /**
   * Get badge progress for a user
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Badge progress data
   */
  async getBadgeProgress(userId, options = {}) {
    return this.executeOperation(async () => {
      return this.badgeService.getBadgeProgress(userId, options);
    }, 'getBadgeProgress', { userId, options });
  }
  
  /**
   * Get a specific badge by ID
   * 
   * @param {string} badgeId - ID of the badge
   * @param {string} userId - ID of the user (for authorization)
   * @returns {Promise<Object>} Badge data
   */
  async getBadgeById(badgeId, userId) {
    return this.executeOperation(async () => {
      const badge = await this.badgeService.getBadgeById(badgeId);
      
      // If it's a user-specific badge, verify ownership
      if (badge.userId && badge.userId !== userId) {
        throw new Error('Unauthorized access to badge');
      }
      
      return badge;
    }, 'getBadgeById', { badgeId, userId });
  }
  
  /**
   * Get badges by category
   * 
   * @param {string} category - Badge category
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of badges in the category
   */
  async getBadgesByCategory(category, userId, options = {}) {
    return this.executeOperation(async () => {
      return this.badgeService.getBadgesByCategory(category, userId, options);
    }, 'getBadgesByCategory', { category, userId, options });
  }
  
  /**
   * Check for newly unlocked badges
   * 
   * @param {string} userId - ID of the user
   * @param {Object} context - Context data for badge checking
   * @returns {Promise<Array<Object>>} Newly unlocked badges
   */
  async checkUnlockedBadges(userId, context = {}) {
    return this.executeOperation(async () => {
      // Get user data
      const user = await this.userService.getUserById(userId);
      
      // Get user progress data
      const progress = await this.progressService.getUserProgress(userId);
      
      // Check for unlocked badges
      const unlockedBadges = await this.badgeService.checkUnlockedBadges(userId, {
        user,
        progress,
        context
      });
      
      // Generate achievement messages for each unlocked badge
      const badgesWithMessages = await Promise.all(unlockedBadges.map(async (badge) => {
        const prompt = await this.promptService.createPrompt({
          type: 'badge_achievement_message',
          user,
          badge,
          achievement: {
            timestamp: new Date().toISOString(),
            context
          }
        });
        
        const message = await this.badgeService.generateBadgeAchievementMessage(badge.id, prompt);
        return {
          ...badge,
          achievementMessage: message
        };
      }));
      
      return badgesWithMessages;
    }, 'checkUnlockedBadges', { userId, context });
  }
  
  /**
   * Mark a badge as viewed/acknowledged
   * 
   * @param {string} badgeId - ID of the badge
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Updated badge
   */
  async acknowledgeBadge(badgeId, userId) {
    return this.executeOperation(async () => {
      // Verify badge ownership
      const badge = await this.badgeService.getBadgeById(badgeId);
      
      if (badge.userId && badge.userId !== userId) {
        throw new Error('Unauthorized access to badge');
      }
      
      // Acknowledge the badge
      return this.badgeService.acknowledgeBadge(badgeId, userId);
    }, 'acknowledgeBadge', { badgeId, userId });
  }
  
  /**
   * Get badge statistics for a user
   * 
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Badge statistics
   */
  async getBadgeStats(userId) {
    return this.executeOperation(async () => {
      return this.badgeService.getBadgeStats(userId);
    }, 'getBadgeStats', { userId });
  }
}

export default BadgeCoordinator;
