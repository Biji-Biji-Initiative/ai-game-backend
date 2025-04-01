import FormatType from "#app/core/challenge/models/config/FormatType.js";
import formatTypeMapper from "#app/core/challenge/mappers/FormatTypeMapper.js";
import { challengeLogger } from "#app/core/infra/logging/domainLogger.js";
import { supabaseClient } from "#app/core/infra/db/supabaseClient.js";
import { BaseRepository, ValidationError, DatabaseError, EntityNotFoundError } from "#app/core/infra/repositories/BaseRepository.js";
import { withRepositoryErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
import challengeErrors from "#app/core/challenge/errors/ChallengeErrors.js";
'use strict';
// Challenge domain errors - imported via error mapper but not directly used
// ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeRepositoryError
// Import domain-specific error classes
const {
  ChallengeError,
  ChallengeNotFoundError,
  ChallengeValidationError,
  ChallengeProcessingError
} = challengeErrors;
// Map repository errors to domain errors
const formatTypeErrorMapper = createErrorMapper({
  // Specific error mappings
  DatabaseError: ChallengeProcessingError,
  EntityNotFoundError: ChallengeNotFoundError,
  ValidationError: ChallengeValidationError
}, ChallengeProcessingError);
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
      logger: options.logger || challengeLogger.child({
        component: 'repository:formatType'
      }),
      maxRetries: 3
    });
    this.cache = options.cache;
    // Apply standardized error handling to methods
    this.findAll = withRepositoryErrorHandling(
      this.findAll.bind(this),
      {
        methodName: 'findAll',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: formatTypeErrorMapper
      }
    );
    this.findByCode = withRepositoryErrorHandling(
      this.findByCode.bind(this),
      {
        methodName: 'findByCode',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: formatTypeErrorMapper
      }
    );
    this.findById = withRepositoryErrorHandling(
      this.findById.bind(this),
      {
        methodName: 'findById',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: formatTypeErrorMapper
      }
    );
    this.findByResponseFormat = withRepositoryErrorHandling(
      this.findByResponseFormat.bind(this),
      {
        methodName: 'findByResponseFormat',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: formatTypeErrorMapper
      }
    );
    this.save = withRepositoryErrorHandling(
      this.save.bind(this),
      {
        methodName: 'save',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: formatTypeErrorMapper
      }
    );
    this.delete = withRepositoryErrorHandling(
      this.delete.bind(this),
      {
        methodName: 'delete',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: formatTypeErrorMapper
      }
    );
    this.seed = withRepositoryErrorHandling(
      this.seed.bind(this),
      {
        methodName: 'seed',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: formatTypeErrorMapper
      }
    );
  }
  /**
   * Find all active format types
   * @returns {Promise<Array<FormatType>>} Array of format types
   * @throws {ChallengeProcessingError} If database operation fails
   */
  /**
   * Method findAll
   */
  async findAll() {
    this._log('debug', 'Finding all active format types');
    const {
      data,
      error
    } = await this.db.from(this.tableName).select('*').eq('is_active', true).order('code');
    if (error) {
      this._log('error', 'Error fetching format types', {
        error
      });
      throw new DatabaseError(`Failed to fetch format types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findAll'
      });
    }
    return formatTypeMapper.toDomainCollection(data || []);
  }
  /**
   * Find a format type by its code
   * @param {string} code - Format type code
   * @returns {Promise<FormatType|null>} Format type or null if not found
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  /**
   * Method findByCode
   */
  async findByCode(code) {
    if (!code) {
      throw new ValidationError('Format type code is required', {
        entityType: this.domainName
      });
    }
    this._log('debug', 'Finding format type by code', {
      code
    });
    const {
      data,
      error
    } = await this.db.from(this.tableName).select('*').eq('code', code).maybeSingle();
    if (error) {
      this._log('error', 'Error fetching format type by code', {
        code,
        error
      });
      throw new DatabaseError(`Failed to fetch format type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByCode',
        metadata: {
          code
        }
      });
    }
    return formatTypeMapper.toDomain(data);
  }
  /**
   * Find a format type by its ID
   * @param {string} id - Format type ID
   * @returns {Promise<FormatType|null>} Format type or null if not found
   * @throws {ChallengeValidationError} If ID is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  /**
   * Method findById
   */
  async findById(id) {
    this._validateId(id);
    this._log('debug', 'Finding format type by ID', {
      id
    });
    const {
      data,
      error
    } = await this.db.from(this.tableName).select('*').eq('id', id).maybeSingle();
    if (error) {
      this._log('error', 'Error fetching format type by ID', {
        id,
        error
      });
      throw new DatabaseError(`Failed to fetch format type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findById',
        metadata: {
          id
        }
      });
    }
    return formatTypeMapper.toDomain(data);
  }
  /**
   * Find format types by response format
   * @param {string} responseFormat - Response format (e.g., 'open-text')
   * @returns {Promise<Array<FormatType>>} Array of format types
   * @throws {ChallengeValidationError} If responseFormat is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  /**
   * Method findByResponseFormat
   */
  async findByResponseFormat(responseFormat) {
    if (!responseFormat) {
      throw new ValidationError('Response format is required', {
        entityType: this.domainName
      });
    }
    this._log('debug', 'Finding format types by response format', {
      responseFormat
    });
    const {
      data,
      error
    } = await this.db.from(this.tableName).select('*').eq('response_format', responseFormat).eq('is_active', true);
    if (error) {
      this._log('error', 'Error fetching format types by response format', {
        responseFormat,
        error
      });
      throw new DatabaseError(`Failed to fetch format types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByResponseFormat',
        metadata: {
          responseFormat
        }
      });
    }
    return formatTypeMapper.toDomainCollection(data || []);
  }
  /**
   * Save a format type
   * @param {FormatType} formatType - Format type to save
   * @returns {Promise<FormatType>} Saved format type
   * @throws {ChallengeValidationError} If formatType is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  /**
   * Method save
   */
  async save(formatType) {
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
    this._log('debug', 'Saving format type', {
      code: formatType.code,
      id: formatType.id
    });
    const dbData = formatTypeMapper.toPersistence(formatType);
    try {
      // Check if this is an update or insert
      const existing = await this.findByCode(formatType.code);
      let result;
      if (existing) {
        // Update
        const {
          data,
          error
        } = await this.db.from(this.tableName).update(dbData).eq('id', formatType.id).select().single();
        if (error) {
          this._log('error', 'Error updating format type', {
            id: formatType.id,
            error
          });
          throw new DatabaseError(`Failed to update format type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'update',
            metadata: {
              id: formatType.id,
              code: formatType.code
            }
          });
        }
        result = data;
        this._log('info', 'Format type updated successfully', {
          id: formatType.id,
          code: formatType.code
        });
      } else {
        // Insert
        const {
          data,
          error
        } = await this.db.from(this.tableName).insert(dbData).select().single();
        if (error) {
          this._log('error', 'Error creating format type', {
            code: formatType.code,
            error
          });
          throw new DatabaseError(`Failed to create format type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'create',
            metadata: {
              code: formatType.code
            }
          });
        }
        result = data;
        this._log('info', 'Format type created successfully', {
          id: result.id,
          code: formatType.code
        });
      }
      // Invalidate cache if we're using caching
      if (this.cache) {
        try {
          await this.cache.delete(`format:all`);
          await this.cache.delete(`format:code:${formatType.code}`);
          await this.cache.delete(`format:id:${formatType.id}`);
          this._log('debug', 'Invalidated format type cache', {
            code: formatType.code
          });
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
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      // Otherwise, wrap it in a database error
      this._log('error', 'Error in save', {
        code: formatType?.code,
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(`Failed to save format type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'save',
        metadata: {
          code: formatType.code
        }
      });
    }
  }
  /**
   * Delete a format type
   * @param {string} code - Format type code
   * @returns {Promise<boolean>} True if deleted
   * @throws {ChallengeValidationError} If code is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  /**
   * Method delete
   */
  async delete(code) {
    if (!code) {
      throw new ValidationError('Format type code is required', {
        entityType: this.domainName
      });
    }
    this._log('debug', 'Deleting format type', {
      code
    });
    try {
      const {
        error
      } = await this.db.from(this.tableName).delete().eq('code', code);
      if (error) {
        this._log('error', 'Error deleting format type', {
          code,
          error
        });
        throw new DatabaseError(`Failed to delete format type: ${error.message}`, {
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
          await this.cache.delete(`format:all`);
          await this.cache.delete(`format:code:${code}`);
          this._log('debug', 'Invalidated format type cache', {
            code
          });
        } catch (cacheError) {
          this._log('warn', 'Failed to invalidate format type cache', {
            error: cacheError.message,
            code
          });
          // Non-critical error, don't throw
        }
      }
      this._log('info', 'Format type deleted successfully', {
        code
      });
      return true;
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      // Otherwise, wrap it in a database error
      this._log('error', 'Error in delete', {
        code,
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(`Failed to delete format type: ${error.message}`, {
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
   * Seed the database with initial format types
   * @param {Array<Object>} formatTypes - Format types to seed
   * @returns {Promise<void>}
   * @throws {ChallengeValidationError} If formatTypes is invalid
   * @throws {ChallengeProcessingError} If database operation fails
   */
  /**
   * Method seed
   */
  async seed(formatTypes) {
    if (!Array.isArray(formatTypes) || formatTypes.length === 0) {
      throw new ValidationError('Valid format types array is required for seeding', {
        entityType: this.domainName
      });
    }
    this._log('debug', 'Seeding format types', {
      count: formatTypes.length
    });
    try {
      // Create FormatType instances
      const types = formatTypes.map(data => new FormatType(data));
      // Use Promise.all to save types in parallel
      const results = await Promise.all(types.map(type => this.save(type)));
      this._log('info', 'Successfully seeded format types', {
        count: types.length
      });
      return results;
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      this._log('error', 'Error seeding format types', {
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(`Failed to seed format types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'seed'
      });
    }
  }
}
// Create singleton instance
const formatTypeRepository = new FormatTypeRepository();

// Fix exports to ensure the class is properly exported
export default FormatTypeRepository;
export { FormatTypeRepository };
export { formatTypeRepository };