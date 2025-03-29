'use strict';

/**
 * Focus Area Configuration Repository
 * 
 * Manages data access for the global catalog of focus areas available for challenges.
 * Acts as the bridge between the domain model and the challenge focus area configuration database.
 */

const FocusArea = require('../../models/config/FocusArea');
const focusAreaConfigMapper = require('../../mappers/FocusAreaConfigMapper');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');
const { supabaseClient } = require('../../../../core/infra/db/supabaseClient');
const { withRepositoryErrorHandling } = require('../../../../core/infra/errors/ErrorHandler');
const {
  ValidationError,
  DatabaseError
} = require('../../../../core/infra/repositories/BaseRepository');
const {
  ChallengeValidationError,
  ChallengePersistenceError
} = require('../../errors/ChallengeErrors');
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

// Cache TTL constants
const CACHE_TTL = {
  ALL: 3600, // 1 hour
  SINGLE: 1800 // 30 minutes
};

/**
 * Repository for managing the catalog of available focus areas for challenges
 * This is distinct from user-specific focus areas which are managed in the FocusAreaRepository
 */
class FocusAreaConfigRepository {
  /**
   * Create a new FocusAreaConfigRepository
   * @param {Object} supabase - Supabase client instance for database operations
   * @param {Object} logger - Logger instance for recording repository operations
   * @param {Object} cache - Cache service for storing frequently accessed data
   */
  constructor(supabase, logger, cache) {
    this.supabase = supabase || supabaseClient;
    this.tableName = 'challenge_focus_areas';
    this.logger = logger || challengeLogger.child({ component: 'repository:focusAreaConfig' });
    this.domainName = 'challenge:focusAreaConfig';
    this.cache = cache; // Store cache service if provided
    
    // Apply repository error handling
    const methodsToWrap = [
      'findAll', 
      'findByCode', 
      'findById', 
      'findByPrerequisite', 
      'findByRelatedArea',
      'save',
      'delete',
      'seed'
    ];
    
    withRepositoryErrorHandling(
      this, 
      challengeRepositoryErrorMapper, 
      methodsToWrap
    );
  }

  /**
   * Find all active focus areas in the catalog
   * @returns {Promise<Array<FocusArea>>} Array of focus areas
   * @throws {ChallengePersistenceError} If database operation fails
   */
  findAll() {
    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = 'focusArea:all';
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Retrieved focus areas from cache', { count: cachedData.length });
        return focusAreaConfigMapper.toDomainCollection(cachedData);
      }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      this.logger.error('Error fetching focus areas from catalog', { error });
      throw new DatabaseError(`Failed to fetch focus areas from catalog: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findAll'
      });
    }

    // Cache the result if cache is available
    if (this.cache && data) {
      await this.cache.set('focusArea:all', data, CACHE_TTL.ALL);
      this.logger.debug('Cached focus areas', { count: data.length });
    }

    return focusAreaConfigMapper.toDomainCollection(data || []);
  }

  /**
   * Find a focus area in the catalog by its code
   * @param {string} code - Focus area code
   * @returns {Promise<FocusArea|null>} Focus area or null if not found
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengePersistenceError} If database operation fails
   */
  findByCode(code) {
    if (!code) {
      throw new ValidationError('Focus area code is required', {
        entityType: this.domainName
      });
    }

    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = `focusArea:code:${code}`;
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Retrieved focus area from cache', { code });
        return cachedData ? focusAreaConfigMapper.toDomain(cachedData) : null;
      }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      this.logger.error('Error fetching focus area from catalog by code', { code, error });
      throw new DatabaseError(`Failed to fetch focus area from catalog: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByCode',
        metadata: { code }
      });
    }

    // Cache the result if cache is available
    if (this.cache) {
      await this.cache.set(`focusArea:code:${code}`, data, CACHE_TTL.SINGLE);
      this.logger.debug('Cached focus area', { code });
    }

    return data ? focusAreaConfigMapper.toDomain(data) : null;
  }

  /**
   * Find a focus area in the catalog by its ID
   * @param {string} id - Focus area ID
   * @returns {Promise<FocusArea|null>} Focus area or null if not found
   * @throws {ChallengeValidationError} If ID is invalid
   * @throws {ChallengePersistenceError} If database operation fails
   */
  findById(id) {
    if (!id) {
      throw new ValidationError('Focus area ID is required', {
        entityType: this.domainName
      });
    }

    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = `focusArea:id:${id}`;
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Retrieved focus area from cache', { id });
        return cachedData ? focusAreaConfigMapper.toDomain(cachedData) : null;
      }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error('Error fetching focus area from catalog by ID', { id, error });
      throw new DatabaseError(`Failed to fetch focus area from catalog: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findById',
        metadata: { id }
      });
    }

    // Cache the result if cache is available
    if (this.cache) {
      await this.cache.set(`focusArea:id:${id}`, data, CACHE_TTL.SINGLE);
      this.logger.debug('Cached focus area', { id });
    }

    return data ? focusAreaConfigMapper.toDomain(data) : null;
  }

  /**
   * Find focus areas in the catalog with specific prerequisites
   * @param {string} prerequisiteCode - Prerequisite focus area code
   * @returns {Promise<Array<FocusArea>>} Array of focus areas
   * @throws {ChallengeValidationError} If prerequisiteCode is invalid
   * @throws {ChallengePersistenceError} If database operation fails
   */
  findByPrerequisite(prerequisiteCode) {
    if (!prerequisiteCode) {
      throw new ValidationError('Prerequisite code is required', {
        entityType: this.domainName
      });
    }

    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = `focusArea:prerequisite:${prerequisiteCode}`;
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Retrieved focus areas from cache', { prerequisiteCode, count: cachedData.length });
        return focusAreaConfigMapper.toDomainCollection(cachedData);
      }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .contains('prerequisites', [prerequisiteCode])
      .eq('is_active', true);

    if (error) {
      this.logger.error('Error fetching focus areas from catalog by prerequisite', { prerequisiteCode, error });
      throw new DatabaseError(`Failed to fetch focus areas from catalog: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByPrerequisite',
        metadata: { prerequisiteCode }
      });
    }

    // Cache the result if cache is available
    if (this.cache && data) {
      await this.cache.set(`focusArea:prerequisite:${prerequisiteCode}`, data, CACHE_TTL.SINGLE);
      this.logger.debug('Cached focus areas by prerequisite', { prerequisiteCode, count: data.length });
    }

    return focusAreaConfigMapper.toDomainCollection(data || []);
  }

  /**
   * Find focus areas related to another area in the catalog
   * @param {string} relatedAreaCode - Related area code
   * @returns {Promise<Array<FocusArea>>} Array of focus areas
   * @throws {ChallengeValidationError} If relatedAreaCode is invalid
   * @throws {ChallengePersistenceError} If database operation fails
   */
  findByRelatedArea(relatedAreaCode) {
    if (!relatedAreaCode) {
      throw new ValidationError('Related area code is required', {
        entityType: this.domainName
      });
    }

    // If cache is available, try to get from cache first
    if (this.cache) {
      const cacheKey = `focusArea:related:${relatedAreaCode}`;
      const cachedData = await this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Retrieved focus areas from cache', { relatedAreaCode, count: cachedData.length });
        return focusAreaConfigMapper.toDomainCollection(cachedData);
      }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .contains('related_areas', [relatedAreaCode])
      .eq('is_active', true);

    if (error) {
      this.logger.error('Error fetching focus areas from catalog by related area', { relatedAreaCode, error });
      throw new DatabaseError(`Failed to fetch focus areas from catalog: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByRelatedArea',
        metadata: { relatedAreaCode }
      });
    }

    // Cache the result if cache is available
    if (this.cache && data) {
      await this.cache.set(`focusArea:related:${relatedAreaCode}`, data, CACHE_TTL.SINGLE);
      this.logger.debug('Cached focus areas by related area', { relatedAreaCode, count: data.length });
    }

    return focusAreaConfigMapper.toDomainCollection(data || []);
  }

  /**
   * Save a focus area to the catalog
   * @param {FocusArea} focusArea - Focus area to save
   * @returns {Promise<FocusArea>} Saved focus area
   * @throws {ChallengeValidationError} If focus area is invalid
   * @throws {ChallengePersistenceError} If database operation fails
   */
  save(focusArea) {
    if (!(focusArea instanceof FocusArea)) {
      throw new ValidationError('Can only save FocusArea instances to the catalog', {
        entityType: this.domainName
      });
    }

    const dbData = focusAreaConfigMapper.toPersistence(focusArea);
    
    // Check if this is an update or insert
    const existing = await this.findByCode(focusArea.code);
    
    let result;
    if (existing) {
      // Update
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', focusArea.id)
        .select()
        .single();
        
      if (error) {
        this.logger.error('Error updating focus area in catalog', { code: focusArea.code, error });
        throw new DatabaseError(`Failed to update focus area in catalog: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'save',
          metadata: { code: focusArea.code }
        });
      }
      
      result = data;
    } else {
      // Insert
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(dbData)
        .select()
        .single();
        
      if (error) {
        this.logger.error('Error inserting focus area into catalog', { code: focusArea.code, error });
        throw new DatabaseError(`Failed to insert focus area into catalog: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'save',
          metadata: { code: focusArea.code }
        });
      }
      
      result = data;
    }
    
    // Invalidate relevant cache keys
    if (this.cache) {
      // Clear specific cache entries
      await this.cache.delete('focusArea:all');
      await this.cache.delete(`focusArea:code:${focusArea.code}`);
      if (focusArea.id) {
        await this.cache.delete(`focusArea:id:${focusArea.id}`);
      }
      
      // Attempt to clear pattern-based keys if the cache supports it
      if (typeof this.cache.deletePattern === 'function') {
        await this.cache.deletePattern('focusArea:prerequisite:*');
        await this.cache.deletePattern('focusArea:related:*');
      }
      
      this.logger.debug('Invalidated focus area cache entries', { code: focusArea.code });
    }
    
    return focusAreaConfigMapper.toDomain(result);
  }

  /**
   * Delete a focus area from the catalog
   * @param {string} code - Focus area code
   * @returns {Promise<boolean>} True if successful
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengePersistenceError} If database operation fails
   */
  delete(code) {
    if (!code) {
      throw new ValidationError('Focus area code is required', {
        entityType: this.domainName
      });
    }
    
    // Get the focus area first to check if it exists
    const focusArea = await this.findByCode(code);
    if (!focusArea) {
      this.logger.warn('Focus area not found for deletion', { code });
      return false;
    }
    
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('code', code);
      
    if (error) {
      this.logger.error('Error deleting focus area from catalog', { code, error });
      throw new DatabaseError(`Failed to delete focus area from catalog: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'delete',
        metadata: { code }
      });
    }
    
    // Invalidate relevant cache keys
    if (this.cache) {
      // Clear specific cache entries
      await this.cache.delete('focusArea:all');
      await this.cache.delete(`focusArea:code:${code}`);
      if (focusArea.id) {
        await this.cache.delete(`focusArea:id:${focusArea.id}`);
      }
      
      // Attempt to clear pattern-based keys if the cache supports it
      if (typeof this.cache.deletePattern === 'function') {
        await this.cache.deletePattern('focusArea:prerequisite:*');
        await this.cache.deletePattern('focusArea:related:*');
      }
      
      this.logger.debug('Invalidated focus area cache entries after deletion', { code });
    }
    
    return true;
  }

  /**
   * Seed the focus area catalog with initial data
   * @param {Array<Object>} focusAreas - Focus area data to seed
   * @returns {Promise<Array<FocusArea>>} Array of saved focus areas
   * @throws {ChallengePersistenceError} If database operation fails
   */
  seed(focusAreas) {
    if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
      this.logger.warn('No focus areas provided for seeding');
      return [];
    }
    
    try {
      const results = [];
      
      for (const areaData of focusAreas) {
        // Convert to domain model
        const focusArea = new FocusArea(areaData);
        
        // Save to database
        const savedArea = await this.save(focusArea);
        results.push(savedArea);
      }
      
      this.logger.info('Seeded focus area catalog', { count: results.length });
      return results;
    } catch (error) {
      this.logger.error('Error seeding focus area catalog', { error: error.message });
      throw new DatabaseError(`Failed to seed focus area catalog: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'seed'
      });
    }
  }
  
  /**
   * Invalidate all focus area cache entries
   * @returns {Promise<void>}
   */
  invalidateCache() {
    if (!this.cache) {
      return;
    }
    
    try {
      // Clear specific cache entry
      await this.cache.delete('focusArea:all');
      
      // Attempt to clear pattern-based keys if the cache supports it
      if (typeof this.cache.deletePattern === 'function') {
        await this.cache.deletePattern('focusArea:code:*');
        await this.cache.deletePattern('focusArea:id:*');
        await this.cache.deletePattern('focusArea:prerequisite:*');
        await this.cache.deletePattern('focusArea:related:*');
      } else {
        // If pattern deletion is not supported, get all keys and delete matching ones
        const allKeys = await this.cache.keys('focusArea:*');
        for (const key of allKeys) {
          await this.cache.delete(key);
        }
      }
      
      this.logger.info('Invalidated all focus area cache entries');
    } catch (error) {
      this.logger.error('Error invalidating focus area cache', { error: error.message });
    }
  }
}

// Export singleton instance and class
const focusAreaConfigRepository = new FocusAreaConfigRepository();

module.exports = {
  FocusAreaConfigRepository,
  focusAreaConfigRepository
}; 