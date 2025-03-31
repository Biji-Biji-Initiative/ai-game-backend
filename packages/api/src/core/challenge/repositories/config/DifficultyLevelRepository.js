"../../../challenge/mappers/DifficultyLevelMapper.js;
""../../../infra/logging/domainLogger.js86;
""../../../infra/db/supabaseClient.js163;
""../../../infra/repositories/BaseRepository.js236;
""../../../infra/errors/errorStandardization.js356;
""../../../challenge/errors/ChallengeErrors.js471;
'use strict';

// Import domain-specific error classes
const { 
  ChallengeError, 
  ChallengeNotFoundError, 
  ChallengeValidationError, 
  ChallengeProcessingError 
} = challengeErrors;

// Define error mapper for difficulty level repository
const difficultyLevelErrorMapper = createErrorMapper({
    EntityNotFoundError: ChallengeNotFoundError,
    ValidationError: ChallengeValidationError,
    DatabaseError: ChallengeProcessingError,
}, ChallengeProcessingError);

/**
 * Repository for managing difficulty level configurations
 * Provides data access operations for difficulty levels in challenges
 */
class DifficultyLevelRepository {
  /**
   * Create a new DifficultyLevelRepository
   * @param {Object} supabase - Supabase client instance for database operations
   * @param {Object} logger - Logger instance for recording repository operations
   */
  constructor(supabase, logger) {
    this.supabase = supabase || supabaseClient;
    this.tableName = 'difficulty_levels';
    this.logger = logger || challengeLogger.child({ component: 'repository:difficultyLevel' });
    this.domainName = 'challenge:difficultyLevel';
    
    // Apply repository error handling with standardized pattern
    this.findAll = withRepositoryErrorHandling(
      this.findAll.bind(this),
      {
        methodName: 'findAll',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.findByCode = withRepositoryErrorHandling(
      this.findByCode.bind(this),
      {
        methodName: 'findByCode',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.findById = withRepositoryErrorHandling(
      this.findById.bind(this),
      {
        methodName: 'findById',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.findBySortOrderRange = withRepositoryErrorHandling(
      this.findBySortOrderRange.bind(this),
      {
        methodName: 'findBySortOrderRange',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.findEasiest = withRepositoryErrorHandling(
      this.findEasiest.bind(this),
      {
        methodName: 'findEasiest',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.findHardest = withRepositoryErrorHandling(
      this.findHardest.bind(this),
      {
        methodName: 'findHardest',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.save = withRepositoryErrorHandling(
      this.save.bind(this),
      {
        methodName: 'save',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.delete = withRepositoryErrorHandling(
      this.delete.bind(this),
      {
        methodName: 'delete',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
    
    this.seed = withRepositoryErrorHandling(
      this.seed.bind(this),
      {
        methodName: 'seed',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: difficultyLevelErrorMapper
      }
    );
  }
  
  /**
   * Find all active difficulty levels
   * @returns {Promise<Array<DifficultyLevel>>} Array of difficulty levels
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async findAll() {
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('is_active', true).order('sort_order');
    if (error) {
      this.logger.error('Error fetching difficulty levels', {
        error
      });
      throw new DatabaseError(`Failed to fetch difficulty levels: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findAll'
      });
    }
    return difficultyLevelMapper.toDomainCollection(data || []);
  }
  
  /**
   * Find a difficulty level by its code
   * @param {string} code - Difficulty level code
   * @returns {Promise<DifficultyLevel|null>} Difficulty level or null if not found
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async findByCode(code) {
    if (!code) {
      throw new ValidationError('Difficulty level code is required', {
        entityType: this.domainName
      });
    }
    
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('code', code).maybeSingle();
    if (error) {
      this.logger.error('Error fetching difficulty level by code', {
        code,
        error
      });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByCode',
        metadata: {
          code
        }
      });
    }
    return difficultyLevelMapper.toDomain(data);
  }
  
  /**
   * Find a difficulty level by its ID
   * @param {string} id - Difficulty level ID
   * @returns {Promise<DifficultyLevel|null>} Difficulty level or null if not found
   * @throws {ChallengeValidationError} If ID is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async findById(id) {
    if (!id) {
      throw new ValidationError('Difficulty level ID is required', {
        entityType: this.domainName
      });
    }
    
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('id', id).maybeSingle();
    if (error) {
      this.logger.error('Error fetching difficulty level by ID', {
        id,
        error
      });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findById',
        metadata: {
          id
        }
      });
    }
    return difficultyLevelMapper.toDomain(data);
  }
  
  /**
   * Find difficulty levels by sort order range
   * @param {number} minOrder - Minimum sort order (inclusive)
   * @param {number} maxOrder - Maximum sort order (inclusive)
   * @returns {Promise<Array<DifficultyLevel>>} Array of difficulty levels
   * @throws {ChallengeValidationError} If parameters are invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async findBySortOrderRange(minOrder, maxOrder) {
    if (minOrder === undefined || maxOrder === undefined) {
      throw new ValidationError('Min and max sort order are required', {
        entityType: this.domainName
      });
    }
    
    if (typeof minOrder !== 'number' || typeof maxOrder !== 'number') {
      throw new ValidationError('Sort order values must be numbers', {
        entityType: this.domainName
      });
    }
    
    if (minOrder > maxOrder) {
      throw new ValidationError('Min sort order cannot be greater than max sort order', {
        entityType: this.domainName
      });
    }
    
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').gte('sort_order', minOrder).lte('sort_order', maxOrder).eq('is_active', true).order('sort_order');
    
    if (error) {
      this.logger.error('Error fetching difficulty levels by sort order range', {
        minOrder,
        maxOrder,
        error
      });
      throw new DatabaseError(`Failed to fetch difficulty levels: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findBySortOrderRange',
        metadata: {
          minOrder,
          maxOrder
        }
      });
    }
    return difficultyLevelMapper.toDomainCollection(data || []);
  }
  
  /**
   * Find easiest difficulty level
   * @returns {Promise<DifficultyLevel|null>} Easiest difficulty level or null if none found
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async findEasiest() {
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('is_active', true).order('sort_order').limit(1).maybeSingle();
    if (error) {
      this.logger.error('Error fetching easiest difficulty level', {
        error
      });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findEasiest'
      });
    }
    return difficultyLevelMapper.toDomain(data);
  }
  
  /**
   * Find hardest difficulty level
   * @returns {Promise<DifficultyLevel|null>} Hardest difficulty level or null if none found
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async findHardest() {
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('is_active', true).order('sort_order', {
      ascending: false
    }).limit(1).maybeSingle();
    if (error) {
      this.logger.error('Error fetching hardest difficulty level', {
        error
      });
      throw new DatabaseError(`Failed to fetch difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findHardest'
      });
    }
    return difficultyLevelMapper.toDomain(data);
  }
  
  /**
   * Save a difficulty level
   * @param {DifficultyLevel} difficultyLevel - Difficulty level to save
   * @returns {Promise<DifficultyLevel>} Saved difficulty level
   * @throws {ChallengeValidationError} If difficulty level is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async save(difficultyLevel) {
    if (!difficultyLevel) {
      throw new ValidationError('Difficulty level is required', {
        entityType: this.domainName
      });
    }
    
    if (!(difficultyLevel instanceof DifficultyLevel)) {
      throw new ValidationError('Can only save DifficultyLevel instances', {
        entityType: this.domainName
      });
    }
    
    try {
      const dbData = difficultyLevelMapper.toPersistence(difficultyLevel);
      
      // Check if this is an update or insert
      const existing = await this.findByCode(difficultyLevel.code);
      let result;
      
      if (existing) {
        // Update
        const {
          data,
          error
        } = await this.supabase.from(this.tableName).update(dbData).eq('id', difficultyLevel.id).select().single();
        if (error) {
          this.logger.error('Error updating difficulty level', {
            id: difficultyLevel.id,
            error
          });
          throw new DatabaseError(`Failed to update difficulty level: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save.update',
            metadata: {
              id: difficultyLevel.id
            }
          });
        }
        result = data;
      } else {
        // Insert
        const {
          data,
          error
        } = await this.supabase.from(this.tableName).insert(dbData).select().single();
        if (error) {
          this.logger.error('Error creating difficulty level', {
            code: difficultyLevel.code,
            error
          });
          throw new DatabaseError(`Failed to create difficulty level: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save.insert',
            metadata: {
              code: difficultyLevel.code
            }
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
          this.logger.debug('Invalidated difficulty level caches', {
            code: difficultyLevel.code
          });
        } catch (cacheError) {
          this.logger.warn('Failed to invalidate difficulty level caches', {
            error: cacheError.message,
            code: difficultyLevel.code
          });
          // Non-critical error, don't throw
        }
      }
      
      return difficultyLevelMapper.toDomain(result);
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      
      // Otherwise, wrap it in a database error
      this.logger.error('Error in save', {
        code: difficultyLevel?.code,
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(`Failed to save difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'save',
        metadata: {
          code: difficultyLevel.code
        }
      });
    }
  }
  
  /**
   * Delete a difficulty level
   * @param {string} code - Difficulty level code
   * @returns {Promise<boolean>} True if deleted
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async delete(code) {
    if (!code) {
      throw new ValidationError('Difficulty level code is required', {
        entityType: this.domainName
      });
    }
    
    try {
      const {
        error
      } = await this.supabase.from(this.tableName).delete().eq('code', code);
      if (error) {
        this.logger.error('Error deleting difficulty level', {
          code,
          error
        });
        throw new DatabaseError(`Failed to delete difficulty level: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'delete',
          metadata: {
            code
          }
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
          this.logger.debug('Invalidated difficulty level caches', {
            code
          });
        } catch (cacheError) {
          this.logger.warn('Failed to invalidate difficulty level caches', {
            error: cacheError.message,
            code
          });
          // Non-critical error, don't throw
        }
      }
      
      return true;
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      
      // Otherwise, wrap it in a database error
      this.logger.error('Error in delete', {
        code,
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(`Failed to delete difficulty level: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'delete',
        metadata: {
          code
        }
      });
    }
  }
  
  /**
   * Seed the database with initial difficulty levels
   * @param {Array<Object>} difficultyLevels - Difficulty levels to seed
   * @returns {Promise<Array<DifficultyLevel>>} Array of seeded difficulty levels
   * @throws {ChallengeValidationError} If difficulty level data is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  async seed(difficultyLevels) {
    if (!Array.isArray(difficultyLevels) || difficultyLevels.length === 0) {
      throw new ValidationError('Valid difficulty levels array is required for seeding', {
        entityType: this.domainName
      });
    }
    
    try {
      // Create DifficultyLevel instances
      const levels = difficultyLevels.map(data => new DifficultyLevel(data));
      
      // Save each level using Promise.all for parallel execution
      const results = await Promise.all(levels.map(level => this.save(level)));
      
      // Invalidate all caches if we're using caching
      if (this.cache) {
        try {
          const allKeys = this.cache.keys('difficultyLevel:') || [];
          for (const key of allKeys) {
            await this.cache.delete(key);
          }
          this.logger.debug('Invalidated all difficulty level caches after seeding');
        } catch (cacheError) {
          this.logger.warn('Failed to invalidate difficulty level caches after seeding', {
            error: cacheError.message
          });
          // Non-critical error, don't throw
        }
      }
      
      this.logger.info('Successfully seeded difficulty levels', {
        count: levels.length
      });
      
      return results;
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      
      // Otherwise, wrap it in a database error
      this.logger.error('Error seeding difficulty levels', {
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(`Failed to seed difficulty levels: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'seed'
      });
    }
  }
  
  // Helper methods for validation
  
  _log(level, message, metadata = {}) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message, {
        ...metadata,
        component: 'repository:difficultyLevel'
      });
    }
  }
  
  _validateId(id) {
    if (!id) {
      throw new ValidationError('ID is required', {
        entityType: this.domainName
      });
    }
  }
  
  _validateRequiredParams(params, requiredParams) {
    if (!params || typeof params !== 'object') {
      throw new ValidationError('Parameters object is required', {
        entityType: this.domainName
      });
    }
    
    for (const param of requiredParams) {
      if (params[param] === undefined || params[param] === null) {
        throw new ValidationError(`Parameter '${param}' is required`, {
          entityType: this.domainName
        });
      }
    }
  }
  
  _validateRangeParams(params, requiredParams) {
    this._validateRequiredParams(params, requiredParams);
    
    const { minOrder, maxOrder } = params;
    if (typeof minOrder !== 'number' || typeof maxOrder !== 'number') {
      throw new ValidationError('Range parameters must be numbers', {
        entityType: this.domainName
      });
    }
    
    if (minOrder > maxOrder) {
      throw new ValidationError('Minimum order cannot be greater than maximum order', {
        entityType: this.domainName
      });
    }
  }
  
  _validateInstance(instance, expectedClass) {
    if (!instance) {
      throw new ValidationError(`${expectedClass.name} instance is required`, {
        entityType: this.domainName
      });
    }
    
    if (!(instance instanceof expectedClass)) {
      throw new ValidationError(`Can only save ${expectedClass.name} instances`, {
        entityType: this.domainName
      });
    }
  }
  
  _validateArray(array, name) {
    if (!Array.isArray(array)) {
      throw new ValidationError(`${name} must be an array`, {
        entityType: this.domainName
      });
    }
    
    if (array.length === 0) {
      throw new ValidationError(`${name} cannot be empty`, {
        entityType: this.domainName
      });
    }
  }
}

export default DifficultyLevelRepository;"