/**
 * Challenge Repository
 * 
 * Responsible for data access operations related to challenges.
 * Follows the repository pattern to abstract database access from domain logic.
 * 
 * @module challengeRepository
 * @requires logger
 * @requires Challenge
 */

const { logger } = require('../../../core/infra/logging/logger');
const Challenge = require('../models/Challenge');

class ChallengeRepository {
  constructor() {
    // Simulation of database in memory for this example
    // In a real application, this would be replaced with database calls
    this.challengesDb = new Map();
    this.idCounter = 1;
  }

  /**
   * Helper function for logging if logger exists
   */
  log(level, message, meta = {}) {
    if (logger && typeof logger[level] === 'function') {
      logger[level](message, meta);
    } else {
      console[level === 'error' ? 'error' : 'log'](message, meta);
    }
  }

  /**
   * Find a challenge by its ID
   * @param {string} id - Challenge ID
   * @returns {Promise<Challenge|null>} Challenge object or null if not found
   */
  async findById(id) {
    try {
      const challenge = this.challengesDb.get(id);
      
      if (!challenge) {
        return null;
      }
      
      return challenge instanceof Challenge 
        ? challenge 
        : new Challenge(challenge);
    } catch (error) {
      this.log('error', 'Error finding challenge by ID', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find challenges by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array<Challenge>>} Array of challenges
   */
  async findByUserId(userId) {
    try {
      const challenges = [];
      
      for (const challenge of this.challengesDb.values()) {
        if (challenge.userId === userId) {
          challenges.push(
            challenge instanceof Challenge 
              ? challenge 
              : new Challenge(challenge)
          );
        }
      }
      
      return challenges;
    } catch (error) {
      this.log('error', 'Error finding challenges by user ID', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find challenges by focus area
   * @param {string} focusArea - Focus area name
   * @returns {Promise<Array<Challenge>>} Array of challenges
   */
  async findByFocusArea(focusArea) {
    try {
      const challenges = [];
      
      for (const challenge of this.challengesDb.values()) {
        if (challenge.focusArea === focusArea) {
          challenges.push(
            challenge instanceof Challenge 
              ? challenge 
              : new Challenge(challenge)
          );
        }
      }
      
      return challenges;
    } catch (error) {
      this.log('error', 'Error finding challenges by focus area', { 
        focusArea, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Save a challenge to the database
   * @param {Challenge} challenge - Challenge to save
   * @returns {Promise<Challenge>} Saved challenge
   */
  async save(challenge) {
    try {
      if (!(challenge instanceof Challenge)) {
        throw new Error('Can only save Challenge instances');
      }
      
      // If it's a new challenge without an ID, generate one
      if (!challenge.id) {
        challenge.id = (this.idCounter++).toString();
      }
      
      // Update the updatedAt timestamp
      challenge.updatedAt = new Date().toISOString();
      
      // Store in our mock database
      this.challengesDb.set(challenge.id, challenge);
      
      this.log('debug', 'Saved challenge', { 
        id: challenge.id, 
        title: challenge.title 
      });
      
      return challenge;
    } catch (error) {
      this.log('error', 'Error saving challenge', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete a challenge by ID
   * @param {string} id - Challenge ID to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteById(id) {
    try {
      const existed = this.challengesDb.has(id);
      
      if (existed) {
        this.challengesDb.delete(id);
        
        this.log('debug', 'Deleted challenge', { id });
      }
      
      return existed;
    } catch (error) {
      this.log('error', 'Error deleting challenge', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find challenges by various criteria
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.userId] - User ID
   * @param {string} [criteria.focusArea] - Focus area
   * @param {string} [criteria.difficulty] - Difficulty level
   * @param {boolean} [criteria.active] - Active status
   * @param {string} [criteria.type] - Challenge type
   * @param {Object} [options] - Search options
   * @param {number} [options.limit] - Maximum number of results
   * @param {number} [options.offset] - Offset for pagination
   * @param {string} [options.sortBy] - Field to sort by
   * @param {string} [options.sortOrder] - Sort order ('asc' or 'desc')
   * @returns {Promise<Array<Challenge>>} Array of matching challenges
   */
  async findByCriteria(criteria = {}, options = {}) {
    try {
      let matches = Array.from(this.challengesDb.values());
      
      // Filter by criteria
      if (criteria.userId) {
        matches = matches.filter(challenge => challenge.userId === criteria.userId);
      }
      
      if (criteria.focusArea) {
        matches = matches.filter(challenge => challenge.focusArea === criteria.focusArea);
      }
      
      if (criteria.difficulty) {
        matches = matches.filter(challenge => challenge.difficulty === criteria.difficulty);
      }
      
      if (criteria.active !== undefined) {
        matches = matches.filter(challenge => challenge.active === criteria.active);
      }
      
      if (criteria.type) {
        matches = matches.filter(challenge => challenge.type === criteria.type);
      }
      
      // Sort results if specified
      if (options.sortBy) {
        const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
        
        matches.sort((a, b) => {
          if (a[options.sortBy] < b[options.sortBy]) return -1 * sortOrder;
          if (a[options.sortBy] > b[options.sortBy]) return 1 * sortOrder;
          return 0;
        });
      }
      
      // Apply pagination if specified
      if (options.offset || options.limit) {
        const offset = options.offset || 0;
        const limit = options.limit || matches.length;
        
        matches = matches.slice(offset, offset + limit);
      }
      
      // Ensure all returned items are Challenge instances
      return matches.map(challenge => 
        challenge instanceof Challenge 
          ? challenge 
          : new Challenge(challenge)
      );
    } catch (error) {
      this.log('error', 'Error finding challenges by criteria', { 
        criteria, 
        options, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new ChallengeRepository(); 