'use strict';

/**
 * Difficulty Level Repository
 * 
 * Manages data access for difficulty level configuration.
 * Acts as the bridge between the domain model and database.
 */

const DifficultyLevel = require('../../models/config/DifficultyLevel');
const difficultyLevelMapper = require('../../mappers/DifficultyLevelMapper');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');
const { 
  BaseRepository,
  DatabaseError 
} = require('../../../../core/infra/repositories/BaseRepository');
const { supabaseClient } = require('../../../../core/infra/db/supabaseClient');
const {
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling,
  createErrorMapper
} = require('../../../core/infra/errors/centralizedErrorUtils');

// Import domain-specific error classes
const {
  ChallengeError,
  ChallengeNotFoundError,
  ChallengeValidationError,
  ChallengeProcessingError,
} = require('../errors/ChallengeErrors');

// Create an error mapper for repositories
const challengeRepositoryErrorMapper = createErrorMapper(
  {
    EntityNotFoundError: ChallengeNotFoundError,
    ValidationError: ChallengeValidationError,
    DatabaseError: ChallengeError,
  },
  ChallengeError
);

// Cache TTL constants
const CACHE_TTL = {
  ALL: 3600, // 1 hour
  SINGLE: 1800 // 30 minutes
};

/**
 * Repository for managing difficulty level configurations
 * Provides data access operations for difficulty levels in challenges
 * @extends BaseRepository
 */
class DifficultyLevelRepository extends BaseRepository {
  /**
   * Create a new DifficultyLevelRepository
   * @param {Object} options - Repository options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.cache - Cache service for configuration data (optional)
   */
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'difficulty_levels',
      domainName: 'challenge:difficultyLevel',
      logger: options.logger || challengeLogger.child({ component: 'repository:difficultyLevel' }),
      maxRetries: 3
    });
    
    this.cache = options.cache;
    
    // Apply standardized error handling to methods
    this.findAll = applyRepositoryErrorHandling(this, 'findAll');
    this.findByCode = applyRepositoryErrorHandling(this, 'findByCode');
    this.findById = applyRepositoryErrorHandling(this, 'findById');
    this.findBySortOrderRange = applyRepositoryErrorHandling(this, 'findBySortOrderRange');
    this.findEasiest = applyRepositoryErrorHandling(this, 'findEasiest');
    this.findHardest = applyRepositoryErrorHandling(this, 'findHardest');
    this.save = applyRepositoryErrorHandling(this, 'save');
    this.delete = applyRepositoryErrorHandling(this, 'delete');
    this.seed = applyRepositoryErrorHandling(this, 'seed');
  }

  /**
   * Find all active difficulty levels
   * @returns {Promise<Array<DifficultyLevel>>} Array of difficulty levels
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  findAll() {
    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = 'difficultyLevel:all';
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this._log('debug', 'Retrieved difficulty levels from cache', { count: cachedData.length });
        return difficultyLevelMapper.toDomainCollection(cachedData);
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      this._log('error', 'Error fetching difficulty levels', { error });
      throw new DatabaseError(`Failed to fetch difficulty levels: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findAll'
      });
    }

    // Cache the result if cache is available
    if (this.cache && data) {
      await this.cache.set('difficultyLevel:all', data, CACHE_TTL.ALL);
      this._log('debug', 'Cached difficulty levels', { count: data.length });
    }

    return difficultyLevelMapper.toDomainCollection(data || []);
  }

  /**
   * Find a difficulty level by its code
   * @param {string} code - Difficulty level code
   * @returns {Promise<DifficultyLevel|null>} Difficulty level or null if not found
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  findByCode(code) {
    this._validateRequiredParams({ code }, ['code']);

    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = `difficultyLevel:code:${code}`;
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this._log('debug', 'Retrieved difficulty level from cache', { code });
        return difficultyLevelMapper.toDomain(cachedData);
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      this._log('error', 'Error fetching difficulty level by code', { code, error });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByCode',
        metadata: { code }
      });
    }

    // Cache the result if cache is available
    if (this.cache) {
      await this.cache.set(`difficultyLevel:code:${code}`, data, CACHE_TTL.SINGLE);
      this._log('debug', 'Cached difficulty level', { code });
    }

    return difficultyLevelMapper.toDomain(data);
  }

  /**
   * Find a difficulty level by its ID
   * @param {string} id - Difficulty level ID
   * @returns {Promise<DifficultyLevel|null>} Difficulty level or null if not found
   * @throws {ChallengeValidationError} If ID is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  findById(id) {
    this._validateId(id);

    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = `difficultyLevel:id:${id}`;
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this._log('debug', 'Retrieved difficulty level from cache', { id });
        return difficultyLevelMapper.toDomain(cachedData);
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this._log('error', 'Error fetching difficulty level by ID', { id, error });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findById',
        metadata: { id }
      });
    }

    // Cache the result if cache is available
    if (this.cache) {
      await this.cache.set(`difficultyLevel:id:${id}`, data, CACHE_TTL.SINGLE);
      this._log('debug', 'Cached difficulty level', { id });
    }

    return difficultyLevelMapper.toDomain(data);
  }

  /**
   * Find difficulty levels by sort order range
   * @param {number} minOrder - Minimum sort order (inclusive)
   * @param {number} maxOrder - Maximum sort order (inclusive)
   * @returns {Promise<Array<DifficultyLevel>>} Array of difficulty levels
   * @throws {ChallengeValidationError} If parameters are invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  findBySortOrderRange(minOrder, maxOrder) {
    this._validateRangeParams({ minOrder, maxOrder }, ['minOrder', 'maxOrder']);

    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = `difficultyLevel:range:${minOrder}-${maxOrder}`;
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this._log('debug', 'Retrieved difficulty levels from cache', { 
          minOrder, maxOrder, count: cachedData.length 
        });
        return difficultyLevelMapper.toDomainCollection(cachedData);
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .gte('sort_order', minOrder)
      .lte('sort_order', maxOrder)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      this._log('error', 'Error fetching difficulty levels by sort order range', { minOrder, maxOrder, error });
      throw new DatabaseError(`Failed to fetch difficulty levels: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findBySortOrderRange',
        metadata: { minOrder, maxOrder }
      });
    }

    // Cache the result if cache is available
    if (this.cache && data) {
      await this.cache.set(`difficultyLevel:range:${minOrder}-${maxOrder}`, data, CACHE_TTL.SINGLE);
      this._log('debug', 'Cached difficulty levels by range', { 
        minOrder, maxOrder, count: data.length 
      });
    }

    return difficultyLevelMapper.toDomainCollection(data || []);
  }

  /**
   * Find easiest difficulty level
   * @returns {Promise<DifficultyLevel|null>} Easiest difficulty level or null if none found
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  findEasiest() {
    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = 'difficultyLevel:easiest';
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this._log('debug', 'Retrieved easiest difficulty level from cache');
        return difficultyLevelMapper.toDomain(cachedData);
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .maybeSingle();

    if (error) {
      this._log('error', 'Error fetching easiest difficulty level', { error });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findEasiest'
      });
    }

    // Cache the result if cache is available
    if (this.cache) {
      await this.cache.set('difficultyLevel:easiest', data, CACHE_TTL.SINGLE);
      this._log('debug', 'Cached easiest difficulty level');
    }

    return difficultyLevelMapper.toDomain(data);
  }

  /**
   * Find hardest difficulty level
   * @returns {Promise<DifficultyLevel|null>} Hardest difficulty level or null if none found
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  findHardest() {
    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = 'difficultyLevel:hardest';
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this._log('debug', 'Retrieved hardest difficulty level from cache');
        return difficultyLevelMapper.toDomain(cachedData);
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this._log('error', 'Error fetching hardest difficulty level', { error });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findHardest'
      });
    }

    // Cache the result if cache is available
    if (this.cache) {
      await this.cache.set('difficultyLevel:hardest', data, CACHE_TTL.SINGLE);
      this._log('debug', 'Cached hardest difficulty level');
    }

    return difficultyLevelMapper.toDomain(data);
  }

  /**
   * Save a difficulty level
   * @param {DifficultyLevel} difficultyLevel - Difficulty level to save
   * @returns {Promise<DifficultyLevel>} Saved difficulty level
   * @throws {ChallengeValidationError} If difficulty level is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  save(difficultyLevel) {
    this._validateInstance(difficultyLevel, DifficultyLevel);

    const dbData = difficultyLevelMapper.toPersistence(difficultyLevel);
    
    // Check if this is an update or insert
    const existing = await this.findByCode(difficultyLevel.code);
    
    let result;
    if (existing) {
      // Update
      const { data, error } = await this.db
        .from(this.tableName)
        .update(dbData)
        .eq('id', difficultyLevel.id)
        .select()
        .single();

      if (error) {
        this._log('error', 'Error updating difficulty level', { id: difficultyLevel.id, error });
        throw new DatabaseError(`Failed to update difficulty level: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'save.update',
          metadata: { id: difficultyLevel.id }
        });
      }
      
      result = data;
    } else {
      // Insert
      const { data, error } = await this.db
        .from(this.tableName)
        .insert(dbData)
        .select()
        .single();

      if (error) {
        this._log('error', 'Error creating difficulty level', { code: difficultyLevel.code, error });
        throw new DatabaseError(`Failed to create difficulty level: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'save.insert',
          metadata: { code: difficultyLevel.code }
        });
      }
      
      result = data;
    }

    // Invalidate cache if we're using caching
    if (this.cache) {
      try {
        // Clear specific cache keys
        await this.cache.delete('difficultyLevel:all');
        await this.cache.delete(`difficultyLevel:code:${difficultyLevel.code}`);
        await this.cache.delete(`difficultyLevel:id:${difficultyLevel.id}`);
        await this.cache.delete('difficultyLevel:easiest');
        await this.cache.delete('difficultyLevel:hardest');
        
        // Clear range caches since order might have changed
        const rangeKeys = this.cache.keys('difficultyLevel:range:') || [];
        for (const key of rangeKeys) {
          await this.cache.delete(key);
        }
        
        this._log('debug', 'Invalidated difficulty level caches', { code: difficultyLevel.code });
      } catch (cacheError) {
        this._log('warn', 'Failed to invalidate difficulty level caches', { 
          error: cacheError.message, 
          code: difficultyLevel.code 
        });
        // Non-critical error, don't throw
      }
    }

    return difficultyLevelMapper.toDomain(result);
  }

  /**
   * Delete a difficulty level
   * @param {string} code - Difficulty level code
   * @returns {Promise<boolean>} True if deleted
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  delete(code) {
    this._validateRequiredParams({ code }, ['code']);

    const { error } = await this.db
      .from(this.tableName)
      .delete()
      .eq('code', code);

    if (error) {
      this._log('error', 'Error deleting difficulty level', { code, error });
      throw new DatabaseError(`Failed to delete difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'delete',
        metadata: { code }
      });
    }

    // Invalidate cache if we're using caching
    if (this.cache) {
      try {
        // Clear specific cache keys
        await this.cache.delete('difficultyLevel:all');
        await this.cache.delete(`difficultyLevel:code:${code}`);
        await this.cache.delete('difficultyLevel:easiest');
        await this.cache.delete('difficultyLevel:hardest');
        
        // Clear range caches since order might have changed
        const rangeKeys = this.cache.keys('difficultyLevel:range:') || [];
        for (const key of rangeKeys) {
          await this.cache.delete(key);
        }
        
        this._log('debug', 'Invalidated difficulty level caches', { code });
      } catch (cacheError) {
        this._log('warn', 'Failed to invalidate difficulty level caches', { 
          error: cacheError.message, 
          code 
        });
        // Non-critical error, don't throw
      }
    }

    return true;
  }

  /**
   * Seed the database with initial difficulty levels
   * @param {Array<Object>} difficultyLevels - Difficulty levels to seed
   * @returns {Promise<void>} Promise that resolves when seeding is complete
   * @throws {ChallengeValidationError} If difficulty level data is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  seed(difficultyLevels) {
    this._validateArray(difficultyLevels, 'difficultyLevels');

    // Create DifficultyLevel instances
    const levels = difficultyLevels.map(data => new DifficultyLevel(data));
    
    // Save each level
    for (const level of levels) {
      await this.save(level);
    }

    // Invalidate all caches if we're using caching
    if (this.cache) {
      try {
        const allKeys = this.cache.keys('difficultyLevel:') || [];
        for (const key of allKeys) {
          await this.cache.delete(key);
        }
        this._log('debug', 'Invalidated all difficulty level caches after seeding');
      } catch (cacheError) {
        this._log('warn', 'Failed to invalidate difficulty level caches after seeding', { 
          error: cacheError.message
        });
        // Non-critical error, don't throw
      }
    }
    
    this._log('info', 'Successfully seeded difficulty levels', { count: levels.length });
  }
}

module.exports = DifficultyLevelRepository; 