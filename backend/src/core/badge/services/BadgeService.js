import { BadgeSchema, BadgeCollectionSchema, BadgeCheckSchema } from '../schemas/BadgeSchema.js';
import { getBadgeCollectionSchema, checkBadgesSchema, updateBadgeProgressSchema, getAllBadgesSchema } from '../schemas/badgeApiSchemas.js';
'use strict';

/**
 * Service for managing achievement badges
 * Handles badge collection, progress tracking, and unlocking
 */
class BadgeService {
  /**
   * Create a new BadgeService
   * @param {Object} config - Configuration for the service
   * @param {Object} config.repository - Repository for badge persistence
   * @param {Object} config.aiModule - AI module for badge recommendations
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.repository = config.repository;
    this.aiModule = config.aiModule;
    this.logger = config.logger || console;
  }

  /**
   * Get all available badges
   * @param {Object} params - Parameters for badge retrieval
   * @param {boolean} [params.includeSecret=false] - Whether to include secret badges
   * @param {string} [params.category] - Filter badges by category
   * @param {string} [params.tier] - Filter badges by tier
   * @returns {Promise<Array<Object>>} Available badges
   */
  async getAllBadges(params = {}) {
    try {
      // Validate parameters
      const validatedParams = getAllBadgesSchema.parse(params);
      
      // Get badges from repository
      const badges = await this.repository.getAllBadges();
      
      // Filter badges
      let filteredBadges = badges;
      
      // Filter out secret badges if not requested
      if (!validatedParams.includeSecret) {
        filteredBadges = filteredBadges.filter(badge => !badge.secret);
      }
      
      // Filter by category if specified
      if (validatedParams.category) {
        filteredBadges = filteredBadges.filter(badge => badge.category === validatedParams.category);
      }
      
      // Filter by tier if specified
      if (validatedParams.tier) {
        filteredBadges = filteredBadges.filter(badge => badge.tier === validatedParams.tier);
      }
      
      return filteredBadges;
    } catch (error) {
      this.logger.error('Error getting all badges', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a user's badge collection
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} User's badge collection
   */
  async getBadgeCollection(userId) {
    try {
      // Validate parameters
      const validatedParams = getBadgeCollectionSchema.parse({ userId });
      
      // Get badge collection from repository
      const collection = await this.repository.getBadgeCollectionByUserId(validatedParams.userId);
      
      // If no collection exists, create a new one
      if (!collection) {
        // Get all available badges
        const allBadges = await this.repository.getAllBadges();
        
        // Create new collection
        const newCollection = {
          userId: validatedParams.userId,
          unlockedBadges: [],
          inProgressBadges: allBadges.map(badge => ({
            badge,
            progress: 0
          })),
          totalBadges: allBadges.length,
          totalUnlocked: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Save new collection
        const savedCollection = await this.repository.saveBadgeCollection(newCollection);
        
        return savedCollection;
      }
      
      return collection;
    } catch (error) {
      this.logger.error('Error getting badge collection', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check for newly unlocked badges
   * @param {Object} params - Parameters for badge check
   * @param {string} params.userId - ID of the user
   * @param {string} params.eventType - Type of event that triggered the check
   * @param {Object} params.eventData - Data associated with the event
   * @returns {Promise<Object>} Check result with newly unlocked badges
   */
  async checkBadges(params) {
    try {
      // Validate parameters
      const validatedParams = checkBadgesSchema.parse(params);
      
      // Get user's badge collection
      const collection = await this.getBadgeCollection(validatedParams.userId);
      
      // Get in-progress badges
      const inProgressBadges = collection.inProgressBadges || [];
      
      // Track newly unlocked badges
      const newlyUnlocked = [];
      
      // Check each in-progress badge
      for (const badgeProgress of inProgressBadges) {
        const badge = badgeProgress.badge;
        
        // Skip if badge is already at 100% progress
        if (badgeProgress.progress >= 100) {
          continue;
        }
        
        // Check if badge conditions are met based on event
        const unlocked = await this.checkBadgeUnlockConditions(
          badge,
          validatedParams.userId,
          validatedParams.eventType,
          validatedParams.eventData
        );
        
        if (unlocked) {
          // Add to newly unlocked list
          newlyUnlocked.push({
            badge,
            unlockedAt: new Date().toISOString()
          });
          
          // Remove from in-progress
          const index = inProgressBadges.findIndex(bp => bp.badge.id === badge.id);
          if (index !== -1) {
            inProgressBadges.splice(index, 1);
          }
        }
      }
      
      // If any badges were unlocked, update the collection
      if (newlyUnlocked.length > 0) {
        // Update collection
        const updatedCollection = {
          ...collection,
          unlockedBadges: [...(collection.unlockedBadges || []), ...newlyUnlocked],
          inProgressBadges,
          totalUnlocked: (collection.unlockedBadges?.length || 0) + newlyUnlocked.length,
          updatedAt: new Date().toISOString()
        };
        
        // Save updated collection
        await this.repository.saveBadgeCollection(updatedCollection);
        
        this.logger.info('Badges unlocked', {
          userId: validatedParams.userId,
          badgeCount: newlyUnlocked.length,
          badgeIds: newlyUnlocked.map(b => b.badge.id)
        });
      }
      
      return {
        newlyUnlocked,
        totalUnlocked: collection.totalUnlocked + newlyUnlocked.length,
        totalBadges: collection.totalBadges
      };
    } catch (error) {
      this.logger.error('Error checking badges', {
        userId: params.userId,
        eventType: params.eventType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if a badge's unlock conditions are met
   * @param {Object} badge - Badge to check
   * @param {string} userId - ID of the user
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @returns {Promise<boolean>} Whether the badge is unlocked
   * @private
   */
  async checkBadgeUnlockConditions(badge, userId, eventType, eventData) {
    try {
      // Get unlock conditions
      const conditions = badge.unlockConditions || [];
      
      // If no conditions, badge cannot be unlocked
      if (conditions.length === 0) {
        return false;
      }
      
      // Check each condition
      for (const condition of conditions) {
        let conditionMet = false;
        
        switch (condition.type) {
          case 'score_threshold':
            if (eventType === 'challenge_completed' && eventData.score) {
              conditionMet = this.checkThresholdCondition(
                eventData.score,
                condition.threshold,
                condition.comparison || 'greater'
              );
            }
            break;
            
          case 'completion_count':
            if (eventType === 'challenge_completed') {
              const completionCount = await this.repository.getUserCompletionCount(userId, condition.metric);
              conditionMet = this.checkThresholdCondition(
                completionCount,
                condition.threshold,
                condition.comparison || 'greater'
              );
            }
            break;
            
          case 'streak_days':
            if (eventType === 'daily_login' || eventType === 'challenge_completed') {
              const streakDays = await this.repository.getUserStreakDays(userId);
              conditionMet = this.checkThresholdCondition(
                streakDays,
                condition.threshold,
                condition.comparison || 'greater'
              );
            }
            break;
            
          case 'trait_value':
            if (eventType === 'assessment_completed' && eventData.traits) {
              const trait = eventData.traits.find(t => t.name === condition.metric);
              if (trait) {
                conditionMet = this.checkThresholdCondition(
                  trait.value,
                  condition.threshold,
                  condition.comparison || 'greater'
                );
              }
            }
            break;
            
          case 'rival_victories':
            if (eventType === 'rival_comparison' && eventData.userWon) {
              const victories = await this.repository.getUserRivalVictories(userId);
              conditionMet = this.checkThresholdCondition(
                victories,
                condition.threshold,
                condition.comparison || 'greater'
              );
            }
            break;
            
          case 'perfect_round':
            if (eventType === 'round_completed' && eventData.score === 100) {
              const perfectRounds = await this.repository.getUserPerfectRounds(userId);
              conditionMet = this.checkThresholdCondition(
                perfectRounds,
                condition.threshold,
                condition.comparison || 'greater'
              );
            }
            break;
            
          default:
            conditionMet = false;
        }
        
        // If any condition is not met, badge is not unlocked
        if (!conditionMet) {
          return false;
        }
      }
      
      // All conditions met
      return true;
    } catch (error) {
      this.logger.error('Error checking badge unlock conditions', {
        badgeId: badge.id,
        userId,
        eventType,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if a value meets a threshold condition
   * @param {number} value - Value to check
   * @param {number} threshold - Threshold to compare against
   * @param {string} comparison - Comparison type (greater, equal, less)
   * @returns {boolean} Whether the condition is met
   * @private
   */
  checkThresholdCondition(value, threshold, comparison) {
    switch (comparison) {
      case 'greater':
        return value >= threshold;
      case 'equal':
        return value === threshold;
      case 'less':
        return value <= threshold;
      default:
        return false;
    }
  }

  /**
   * Update badge progress
   * @param {Object} params - Parameters for progress update
   * @param {string} params.userId - ID of the user
   * @param {string} params.badgeId - ID of the badge
   * @param {number} params.progress - New progress value (0-100)
   * @param {Object} [params.eventContext] - Additional context
   * @returns {Promise<Object>} Updated badge progress
   */
  async updateBadgeProgress(params) {
    try {
      // Validate parameters
      const validatedParams = updateBadgeProgressSchema.parse(params);
      
      // Get user's badge collection
      const collection = await this.getBadgeCollection(validatedParams.userId);
      
      // Find badge in collection
      const inProgressBadges = collection.inProgressBadges || [];
      const badgeProgressIndex = inProgressBadges.findIndex(bp => bp.badge.id === validatedParams.badgeId);
      
      // If badge is not in progress, check if it's already unlocked
      if (badgeProgressIndex === -1) {
        const unlockedBadges = collection.unlockedBadges || [];
        const isUnlocked = unlockedBadges.some(ub => ub.badge.id === validatedParams.badgeId);
        
        if (isUnlocked) {
          // Badge is already unlocked, no need to update progress
          return {
            badgeId: validatedParams.badgeId,
            progress: 100,
            status: 'unlocked'
          };
        }
        
        // Badge not found in collection
        throw new Error(`Badge not found in collection: ${validatedParams.badgeId}`);
      }
      
      // Update progress
      inProgressBadges[badgeProgressIndex].progress = validatedParams.progress;
      
      // Check if badge is now unlocked
      if (validatedParams.progress >= 100) {
        // Move badge from in-progress to unlocked
        const badge = inProgressBadges[badgeProgressIndex].badge;
        const unlockedBadge = {
          badge,
          unlockedAt: new Date().toISOString()
        };
        
        // Remove from in-progress
        inProgressBadges.splice(badgeProgressIndex, 1);
        
        // Add to unlocked
        const updatedCollection = {
          ...collection,
          unlockedBadges: [...(collection.unlockedBadges || []), unlockedBadge],
          inProgressBadges,
          totalUnlocked: (collection.unlockedBadges?.length || 0) + 1,
          updatedAt: new Date().toISOString()
        };
        
        // Save updated collection
        await this.repository.saveBadgeCollection(updatedCollection);
        
        this.logger.info('Badge unlocked through progress update', {
          userId: validatedParams.userId,
          badgeId: validatedParams.badgeId
        });
        
        return {
          badgeId: validatedParams.badgeId,
          progress: 100,
          status: 'unlocked'
        };
      }
      
      // Badge still in progress
      const updatedCollection = {
        ...collection,
        inProgressBadges,
        updatedAt: new Date().toISOString()
      };
      
      // Save updated collection
      await this.repository.saveBadgeCollection(updatedCollection);
      
      this.logger.info('Badge progress updated', {
        userId: validatedParams.userId,
        badgeId: validatedParams.badgeId,
        progress: validatedParams.progress
      });
      
      return {
        badgeId: validatedParams.badgeId,
        progress: validatedParams.progress,
        status: 'in_progress'
      };
    } catch (error) {
      this.logger.error('Error updating badge progress', {
        userId: params.userId,
        badgeId: params.badgeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get badge recommendations for a user
   * @param {string} userId - ID of the user
   * @returns {Promise<Array<Object>>} Recommended badges
   */
  async getBadgeRecommendations(userId) {
    try {
      // Get user's badge collection
      const collection = await this.getBadgeCollection(userId);
      
      // Get user history
      const userHistory = await this.repository.getUserHistory(userId);
      
      // Import prompt builder
      const { BadgePromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new BadgePromptBuilder();
      
      // Build prompt for badge recommendations
      const prompt = promptBuilder.buildBadgeRecommendationPrompt({
        userId,
        userHistory,
        currentBadges: collection.unlockedBadges?.map(ub => ub.badge) || []
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId,
        contextType: 'badge',
        contextId: `recommendations-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let recommendations;
      try {
        recommendations = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing badge recommendations response', {
          userId,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse badge recommendations response');
      }
      
      return recommendations;
    } catch (error) {
      this.logger.error('Error getting badge recommendations', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

export default BadgeService;
