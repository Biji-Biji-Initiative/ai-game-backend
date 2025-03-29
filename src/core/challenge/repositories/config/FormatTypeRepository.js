'use strict';

/**
 * Format Type Repository
 * 
 * Manages data access for format type configuration.
 * Acts as the bridge between the domain model and database.
 */

const FormatType = require('../../models/config/FormatType');
const formatTypeMapper = require('../../mappers/FormatTypeMapper');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');
const { supabaseClient } = require('../../../../core/infra/db/supabaseClient');
const { 
  BaseRepository,
  // EntityNotFoundError - Not directly used but available via error handling
  ValidationError,
  DatabaseError
} = require('../../../../core/infra/repositories/BaseRepository');
// Challenge domain errors - imported via error mapper but not directly used
// ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeRepositoryError
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
const { createErrorCollector } = require('../../../../core/infra/errors/errorStandardization');

/**
 * Repository for managing format type configuration data
 * @extends BaseRepository
 */
class FormatTypeRepository extends BaseRepository {
  /**
   * Create a new FormatTypeRepository
   * @param {Object} options - Repository options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.cache - Cache service for configuration data (optional)
   */
  /**
   * Method constructor
   */
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'format_types',
      domainName: 'challenge:format',
      logger: options.logger || challengeLogger.child({ component: 'repository:formatType' }),
      maxRetries: 3
    });
    
    this.cache = options.cache;
    
    // Apply standardized error handling to methods
    this.findAll = applyRepositoryErrorHandling(this, 'findAll');
    this.findByCode = applyRepositoryErrorHandling(this, 'findByCode');
    this.findById = applyRepositoryErrorHandling(this, 'findById');
    this.findByResponseFormat = applyRepositoryErrorHandling(this, 'findByResponseFormat');
    this.save = applyRepositoryErrorHandling(this, 'save');
    this.delete = applyRepositoryErrorHandling(this, 'delete');
    this.seed = applyRepositoryErrorHandling(this, 'seed');
  }

  /**
   * Find all active format types
   * @returns {Promise<Array<FormatType>>} Array of format types
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  /**
   * Method findAll
   */
  async findAll() {
    try {
      this._log('debug', 'Finding all active format types');
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) {
        this._log('error', 'Error fetching format types', { error });
        throw new DatabaseError(`Failed to fetch format types: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findAll'
        });
      }

      return formatTypeMapper.toDomainCollection(data || []);
    } catch (error) {
      this._log('error', 'Error in findAll', { error: error.message, stack: error.stack });
      throw error; // Let the error wrapper handle mapping
    }
  }

  /**
   * Find a format type by its code
   * @param {string} code - Format type code
   * @returns {Promise<FormatType|null>} Format type or null if not found
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  /**
   * Method findByCode
   */
  async findByCode(code) {
    try {
      if (!code) {
        throw new ValidationError('Format type code is required', {
          entityType: this.domainName
        });
      }
      
      this._log('debug', 'Finding format type by code', { code });
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        this._log('error', 'Error fetching format type by code', { code, error });
        throw new DatabaseError(`Failed to fetch format type: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findByCode',
          metadata: { code }
        });
      }

      return formatTypeMapper.toDomain(data);
    } catch (error) {
      this._log('error', 'Error in findByCode', { code, error: error.message, stack: error.stack });
      throw error; // Let the error wrapper handle mapping
    }
  }

  /**
   * Find a format type by its ID
   * @param {string} id - Format type ID
   * @returns {Promise<FormatType|null>} Format type or null if not found
   * @throws {ChallengeValidationError} If ID is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  /**
   * Method findById
   */
  async findById(id) {
    try {
      this._validateId(id);
      
      this._log('debug', 'Finding format type by ID', { id });
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this._log('error', 'Error fetching format type by ID', { id, error });
        throw new DatabaseError(`Failed to fetch format type: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findById',
          metadata: { id }
        });
      }

      return formatTypeMapper.toDomain(data);
    } catch (error) {
      this._log('error', 'Error in findById', { id, error: error.message, stack: error.stack });
      throw error; // Let the error wrapper handle mapping
    }
  }

  /**
   * Find format types by response format
   * @param {string} responseFormat - Response format (e.g., 'open-text')
   * @returns {Promise<Array<FormatType>>} Array of format types
   * @throws {ChallengeValidationError} If responseFormat is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  /**
   * Method findByResponseFormat
   */
  async findByResponseFormat(responseFormat) {
    try {
      if (!responseFormat) {
        throw new ValidationError('Response format is required', {
          entityType: this.domainName
        });
      }
      
      this._log('debug', 'Finding format types by response format', { responseFormat });
      
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('response_format', responseFormat)
        .eq('is_active', true);

      if (error) {
        this._log('error', 'Error fetching format types by response format', { responseFormat, error });
        throw new DatabaseError(`Failed to fetch format types: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findByResponseFormat',
          metadata: { responseFormat }
        });
      }

      return formatTypeMapper.toDomainCollection(data || []);
    } catch (error) {
      this._log('error', 'Error in findByResponseFormat', { 
        responseFormat, 
        error: error.message,
        stack: error.stack
      });
      throw error; // Let the error wrapper handle mapping
    }
  }

  /**
   * Save a format type
   * @param {FormatType} formatType - Format type to save
   * @returns {Promise<FormatType>} Saved format type
   * @throws {ChallengeValidationError} If formatType is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  /**
   * Method save
   */
  async save(formatType) {
    try {
      if (!formatType) {
        throw new ValidationError('Format type is required', {
          entityType: this.domainName
        });
      }
      
      if (!(formatType instanceof FormatType)) {
        throw new ValidationError('Can only save FormatType instances', {
          entityType: this.domainName
        });
      }
      
      this._log('debug', 'Saving format type', { code: formatType.code, id: formatType.id });
      
      const dbData = formatTypeMapper.toPersistence(formatType);
      
      // Check if this is an update or insert
      const existing = await this.findByCode(formatType.code);
      
      let result;
      if (existing) {
        // Update
        const { data, error } = await this.db
          .from(this.tableName)
          .update(dbData)
          .eq('id', formatType.id)
          .select()
          .single();

        if (error) {
          this._log('error', 'Error updating format type', { id: formatType.id, error });
          throw new DatabaseError(`Failed to update format type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'update',
            metadata: { id: formatType.id, code: formatType.code }
          });
        }
        
        result = data;
        this._log('info', 'Format type updated successfully', { id: formatType.id, code: formatType.code });
      } else {
        // Insert
        const { data, error } = await this.db
          .from(this.tableName)
          .insert(dbData)
          .select()
          .single();

        if (error) {
          this._log('error', 'Error creating format type', { code: formatType.code, error });
          throw new DatabaseError(`Failed to create format type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'create',
            metadata: { code: formatType.code }
          });
        }
        
        result = data;
        this._log('info', 'Format type created successfully', { id: result.id, code: formatType.code });
      }

      // Invalidate cache if we're using caching
      if (this.cache) {
        try {
          await this.cache.delete(`format:all`);
          await this.cache.delete(`format:code:${formatType.code}`);
          await this.cache.delete(`format:id:${formatType.id}`);
          this._log('debug', 'Invalidated format type cache', { code: formatType.code });
        } catch (cacheError) {
          this._log('warn', 'Failed to invalidate format type cache', { 
            error: cacheError.message,
            code: formatType.code
          });
          // Non-critical error, don't throw
        }
      }

      return formatTypeMapper.toDomain(result);
    } catch (error) {
      this._log('error', 'Error in save', { 
        code: formatType?.code, 
        error: error.message,
        stack: error.stack
      });
      throw error; // Let the error wrapper handle mapping
    }
  }

  /**
   * Delete a format type
   * @param {string} code - Format type code
   * @returns {Promise<boolean>} True if deleted
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  /**
   * Method delete
   */
  async delete(code) {
    try {
      if (!code) {
        throw new ValidationError('Format type code is required', {
          entityType: this.domainName
        });
      }
      
      this._log('debug', 'Deleting format type', { code });
      
      const { error } = await this.db
        .from(this.tableName)
        .delete()
        .eq('code', code);

      if (error) {
        this._log('error', 'Error deleting format type', { code, error });
        throw new DatabaseError(`Failed to delete format type: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'delete',
          metadata: { code }
        });
      }
      
      // Invalidate cache if we're using caching
      if (this.cache) {
        try {
          await this.cache.delete(`format:all`);
          await this.cache.delete(`format:code:${code}`);
          this._log('debug', 'Invalidated format type cache', { code });
        } catch (cacheError) {
          this._log('warn', 'Failed to invalidate format type cache', { 
            error: cacheError.message,
            code
          });
          // Non-critical error, don't throw
        }
      }
      
      this._log('info', 'Format type deleted successfully', { code });
      return true;
    } catch (error) {
      this._log('error', 'Error in delete', { code, error: error.message, stack: error.stack });
      throw error; // Let the error wrapper handle mapping
    }
  }

  /**
   * Seed the database with initial format types
   * @param {Array<Object>} formatTypes - Format types to seed
   * @returns {Promise<void>}
   * @throws {ChallengeValidationError} If formatTypes is invalid
   * @throws {ChallengeRepositoryError} If database operation fails
   */
  /**
   * Method seed
   */
  async seed(formatTypes) {
    try {
      if (!Array.isArray(formatTypes) || formatTypes.length === 0) {
        throw new ValidationError('Valid format types array is required for seeding', {
          entityType: this.domainName
        });
      }
      
      this._log('debug', 'Seeding format types', { count: formatTypes.length });
      
      // Create FormatType instances
      const types = formatTypes.map(data => new FormatType(data));
      
      // Use error collector to gather non-critical errors
      const errorCollector = createErrorCollector();
      
      // Save each type
      for (const type of types) {
        try {
          await this.save(type);
        } catch (saveError) {
          errorCollector.collect(
            saveError,
            `format_type_${type.code}`
          );
          this._log('warn', 'Error saving format type during seed', { 
            code: type.code,
            error: saveError.message 
          });
        }
      }
      
      // Log any errors that occurred during seeding
      if (errorCollector.hasErrors()) {
        this._log('warn', 'Some format types failed to seed', {
          errorCount: errorCollector.getErrors().length,
          totalCount: types.length
        });
      }
      
      this._log('info', 'Successfully seeded format types', { count: types.length });
    } catch (error) {
      this._log('error', 'Error seeding format types', { 
        error: error.message,
        stack: error.stack
      });
      throw error; // Let the error wrapper handle mapping
    }
  }
}

// Create singleton instance
const formatTypeRepository = new FormatTypeRepository();

// Export class and singleton
module.exports = {
  FormatTypeRepository,
  formatTypeRepository
}; 