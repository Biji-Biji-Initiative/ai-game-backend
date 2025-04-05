'use strict';

import BaseCoordinator from '../BaseCoordinator.js';

/**
 * RivalCoordinator class
 * 
 * Coordinates operations related to AI rivals, orchestrating the interaction
 * between controllers, services, and repositories while maintaining separation of concerns.
 */
class RivalCoordinator extends BaseCoordinator {
  /**
   * Create a new RivalCoordinator
   * 
   * @param {Object} dependencies - Dependencies required by the coordinator
   * @param {Object} dependencies.rivalService - Service for managing rivals
   * @param {Object} dependencies.userService - Service for user operations
   * @param {Object} dependencies.personalityService - Service for personality operations
   * @param {Object} dependencies.promptService - Service for generating prompts
   * @param {Object} dependencies.challengeService - Service for challenge operations
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor(dependencies = {}) {
    super({ name: 'RivalCoordinator', logger: dependencies.logger });
    
    this.validateDependencies(dependencies, [
      'rivalService',
      'userService',
      'personalityService',
      'promptService',
      'challengeService'
    ]);
    
    this.rivalService = dependencies.rivalService;
    this.userService = dependencies.userService;
    this.personalityService = dependencies.personalityService;
    this.promptService = dependencies.promptService;
    this.challengeService = dependencies.challengeService;
  }
  
  /**
   * Generate a new rival for a user
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Options for rival generation
   * @returns {Promise<Object>} Generated rival
   */
  async generateRival(userId, options = {}) {
    return this.executeOperation(async () => {
      // Get user data needed for rival generation
      const user = await this.userService.getUserById(userId);
      const personality = await this.personalityService.getPersonalityByUserId(userId);
      const focusAreas = await this.userService.getUserFocusAreas(userId);
      const preferences = await this.userService.getUserPreferences(userId);
      
      // Generate prompt for rival creation
      const prompt = await this.promptService.createPrompt({
        type: 'rival_generation',
        user,
        personality,
        focusAreas,
        preferences,
        options
      });
      
      // Generate the rival using the service
      const rival = await this.rivalService.generateRival(userId, prompt, options);
      
      // Generate personality details for the rival
      const personalityPrompt = await this.promptService.createPrompt({
        type: 'rival_personality',
        user,
        rival
      });
      
      const rivalWithPersonality = await this.rivalService.enhanceRivalPersonality(
        rival.id,
        personalityPrompt
      );
      
      return rivalWithPersonality;
    }, 'generateRival', { userId, options });
  }
  
  /**
   * Get all rivals for a user
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of rivals
   */
  async getUserRivals(userId, options = {}) {
    return this.executeOperation(async () => {
      return this.rivalService.getRivalsByUserId(userId, options);
    }, 'getUserRivals', { userId, options });
  }
  
  /**
   * Get a specific rival by ID
   * 
   * @param {string} rivalId - ID of the rival
   * @param {string} userId - ID of the user (for authorization)
   * @returns {Promise<Object>} Rival data
   */
  async getRivalById(rivalId, userId) {
    return this.executeOperation(async () => {
      const rival = await this.rivalService.getRivalById(rivalId);
      
      // Verify ownership
      if (rival.userId !== userId) {
        throw new Error('Unauthorized access to rival');
      }
      
      return rival;
    }, 'getRivalById', { rivalId, userId });
  }
  
  /**
   * Challenge a rival to a specific challenge
   * 
   * @param {string} rivalId - ID of the rival
   * @param {string} userId - ID of the user
   * @param {Object} challengeOptions - Options for the challenge
   * @returns {Promise<Object>} Challenge result
   */
  async challengeRival(rivalId, userId, challengeOptions = {}) {
    return this.executeOperation(async () => {
      // Get rival data
      const rival = await this.rivalService.getRivalById(rivalId);
      
      // Verify ownership
      if (rival.userId !== userId) {
        throw new Error('Unauthorized access to rival');
      }
      
      // Generate challenge prompt
      const user = await this.userService.getUserById(userId);
      const prompt = await this.promptService.createPrompt({
        type: 'rival_challenge',
        user,
        rival,
        options: challengeOptions
      });
      
      // Create the challenge
      const challenge = await this.challengeService.createRivalChallenge(
        userId,
        rivalId,
        prompt,
        challengeOptions
      );
      
      // Record the challenge in rival history
      await this.rivalService.recordRivalChallenge(rivalId, challenge.id);
      
      return challenge;
    }, 'challengeRival', { rivalId, userId, challengeOptions });
  }
  
  /**
   * Update a rival's properties
   * 
   * @param {string} rivalId - ID of the rival
   * @param {string} userId - ID of the user
   * @param {Object} updates - Properties to update
   * @returns {Promise<Object>} Updated rival
   */
  async updateRival(rivalId, userId, updates = {}) {
    return this.executeOperation(async () => {
      // Get rival data
      const rival = await this.rivalService.getRivalById(rivalId);
      
      // Verify ownership
      if (rival.userId !== userId) {
        throw new Error('Unauthorized access to rival');
      }
      
      // Update the rival
      return this.rivalService.updateRival(rivalId, updates);
    }, 'updateRival', { rivalId, userId, updates });
  }
  
  /**
   * Delete a rival
   * 
   * @param {string} rivalId - ID of the rival
   * @param {string} userId - ID of the user
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteRival(rivalId, userId) {
    return this.executeOperation(async () => {
      // Get rival data
      const rival = await this.rivalService.getRivalById(rivalId);
      
      // Verify ownership
      if (rival.userId !== userId) {
        throw new Error('Unauthorized access to rival');
      }
      
      // Delete the rival
      return this.rivalService.deleteRival(rivalId);
    }, 'deleteRival', { rivalId, userId });
  }
  
  /**
   * Get challenge history for a rival
   * 
   * @param {string} rivalId - ID of the rival
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} Challenge history
   */
  async getRivalChallengeHistory(rivalId, userId, options = {}) {
    return this.executeOperation(async () => {
      // Get rival data
      const rival = await this.rivalService.getRivalById(rivalId);
      
      // Verify ownership
      if (rival.userId !== userId) {
        throw new Error('Unauthorized access to rival');
      }
      
      // Get challenge history
      return this.rivalService.getRivalChallengeHistory(rivalId, options);
    }, 'getRivalChallengeHistory', { rivalId, userId, options });
  }
}

export default RivalCoordinator;
