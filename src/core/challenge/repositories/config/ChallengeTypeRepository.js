import ChallengeType from "../../../challenge/models/config/ChallengeType.js";
import challengeTypeMapper from "../../../challenge/mappers/ChallengeTypeMapper.js";
import { withRepositoryErrorHandling, createErrorMapper } from "../../../infra/errors/errorStandardization.js";
import { supabaseClient } from "../../../infra/db/supabaseClient.js";
import { BaseRepository, ValidationError, DatabaseError, EntityNotFoundError } from "../../../infra/repositories/BaseRepository.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError } from "../../../challenge/errors/ChallengeErrors.js";
import { challengeLogger } from "../../../infra/logging/domainLogger.js";
import challengeErrors from "../../../challenge/errors/ChallengeErrors.js";
'use strict';

// Preserve the error types
const {
  ChallengeTypeNotFoundError,
  ChallengeTypeValidationError,
  ChallengeTypePersistenceError
} = challengeErrors;

/**
 * Repository for Challenge Type entities
 */
class ChallengeTypeRepository {
  /**
   * Create a new ChallengeTypeRepository
   * @param {Object} supabase - Supabase client
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger) {
    this.supabase = supabase || supabaseClient;
    this.tableName = 'challenge_types';
    this.logger = logger || challengeLogger.child({
      component: 'repository:challengeType'
    });
    this.domainName = 'challenge:challengeType';
    
    // Create an error mapper for the challenge type domain
    const challengeTypeErrorMapper = createErrorMapper({
      EntityNotFoundError: ChallengeTypeNotFoundError,
      ValidationError: ChallengeTypeValidationError,
      DatabaseError: ChallengeTypePersistenceError,
    }, ChallengeTypePersistenceError);
    
    // Apply standardized error handling to methods
    this.findAll = withRepositoryErrorHandling(
      this.findAll.bind(this),
      {
        methodName: 'findAll',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
    
    this.findByCode = withRepositoryErrorHandling(
      this.findByCode.bind(this),
      {
        methodName: 'findByCode',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
    
    this.findById = withRepositoryErrorHandling(
      this.findById.bind(this),
      {
        methodName: 'findById',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
    
    this.findByFormatType = withRepositoryErrorHandling(
      this.findByFormatType.bind(this),
      {
        methodName: 'findByFormatType',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
    
    this.findByFocusArea = withRepositoryErrorHandling(
      this.findByFocusArea.bind(this),
      {
        methodName: 'findByFocusArea',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
    
    this.save = withRepositoryErrorHandling(
      this.save.bind(this),
      {
        methodName: 'save',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
    
    this.delete = withRepositoryErrorHandling(
      this.delete.bind(this),
      {
        methodName: 'delete',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
    
    this.seed = withRepositoryErrorHandling(
      this.seed.bind(this),
      {
        methodName: 'seed',
        domainName: this.domainName,
        logger: this.logger,
        errorMapper: challengeTypeErrorMapper
      }
    );
  }
  /**
   * Find all active challenge types
   * @returns {Promise<Array<ChallengeType>>} Array of challenge types
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async findAll() {
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('is_active', true).order('code');
    if (error) {
      this.logger.error('Error fetching challenge types', {
        error
      });
      throw new DatabaseError(`Failed to fetch challenge types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findAll'
      });
    }
    return challengeTypeMapper.toDomainCollection(data || []);
  }
  /**
   * Find a challenge type by its code
   * @param {string} code - Challenge type code
   * @returns {Promise<ChallengeType|null>} Challenge type or null if not found
   * @throws {ChallengeTypeValidationError} If code is invalid
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async findByCode(code) {
    if (!code) {
      throw new ValidationError('Challenge type code is required', {
        entityType: this.domainName
      });
    }
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('code', code).maybeSingle();
    if (error) {
      this.logger.error('Error fetching challenge type by code', {
        code,
        error
      });
      throw new DatabaseError(`Failed to fetch challenge type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByCode',
        metadata: {
          code
        }
      });
    }
    return data ? challengeTypeMapper.toDomain(data) : null;
  }
  /**
   * Find a challenge type by its ID
   * @param {string} id - Challenge type ID
   * @returns {Promise<ChallengeType|null>} Challenge type or null if not found
   * @throws {ChallengeTypeValidationError} If id is invalid
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async findById(id) {
    if (!id) {
      throw new ValidationError('Challenge type ID is required', {
        entityType: this.domainName
      });
    }
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').eq('id', id).maybeSingle();
    if (error) {
      this.logger.error('Error fetching challenge type by ID', {
        id,
        error
      });
      throw new DatabaseError(`Failed to fetch challenge type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findById',
        metadata: {
          id
        }
      });
    }
    return data ? challengeTypeMapper.toDomain(data) : null;
  }
  /**
   * Find challenge types that support a specific format
   * @param {string} formatCode - Format type code
   * @returns {Promise<Array<ChallengeType>>} Array of challenge types
   * @throws {ChallengeTypeValidationError} If formatCode is invalid
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async findByFormatType(formatCode) {
    if (!formatCode) {
      throw new ValidationError('Format type code is required', {
        entityType: this.domainName
      });
    }
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').contains('format_types', [formatCode]).eq('is_active', true);
    if (error) {
      this.logger.error('Error fetching challenge types by format', {
        formatCode,
        error
      });
      throw new DatabaseError(`Failed to fetch challenge types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByFormatType',
        metadata: {
          formatCode
        }
      });
    }
    return challengeTypeMapper.toDomainCollection(data || []);
  }
  /**
   * Find challenge types related to a focus area
   * @param {string} focusAreaCode - Focus area code
   * @returns {Promise<Array<ChallengeType>>} Array of challenge types
   * @throws {ChallengeTypeValidationError} If focusAreaCode is invalid
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async findByFocusArea(focusAreaCode) {
    if (!focusAreaCode) {
      throw new ValidationError('Focus area code is required', {
        entityType: this.domainName
      });
    }
    const {
      data,
      error
    } = await this.supabase.from(this.tableName).select('*').contains('focus_areas', [focusAreaCode]).eq('is_active', true);
    if (error) {
      this.logger.error('Error fetching challenge types by focus area', {
        focusAreaCode,
        error
      });
      throw new DatabaseError(`Failed to fetch challenge types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByFocusArea',
        metadata: {
          focusAreaCode
        }
      });
    }
    return challengeTypeMapper.toDomainCollection(data || []);
  }
  /**
   * Save a challenge type
   * @param {ChallengeType} challengeType - Challenge type to save
   * @returns {Promise<ChallengeType>} Saved challenge type
   * @throws {ChallengeTypeValidationError} If challengeType is invalid
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async save(challengeType) {
    if (!(challengeType instanceof ChallengeType)) {
      throw new ValidationError('Can only save ChallengeType instances', {
        entityType: this.domainName
      });
    }
    const dbData = challengeTypeMapper.toPersistence(challengeType);
    try {
      // Check if this is an update or insert
      const existing = await this.findByCode(challengeType.code);
      let result;
      if (existing) {
        // Update
        const {
          data,
          error
        } = await this.supabase.from(this.tableName).update(dbData).eq('id', challengeType.id).select().single();
        if (error) {
          this.logger.error('Error updating challenge type', {
            code: challengeType.code,
            error
          });
          throw new DatabaseError(`Failed to update challenge type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save:update',
            metadata: {
              id: challengeType.id,
              code: challengeType.code
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
          this.logger.error('Error inserting challenge type', {
            code: challengeType.code,
            error
          });
          throw new DatabaseError(`Failed to insert challenge type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save:insert',
            metadata: {
              code: challengeType.code
            }
          });
        }
        result = data;
      }
      if (!result) {
        throw new DatabaseError('No data returned after save operation', {
          entityType: this.domainName,
          operation: 'save',
          metadata: {
            code: challengeType.code
          }
        });
      }
      return challengeTypeMapper.toDomain(result);
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      // Otherwise, wrap it in a database error
      this.logger.error('Unexpected error saving challenge type', {
        code: challengeType.code,
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(`Failed to save challenge type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'save',
        metadata: {
          code: challengeType.code
        }
      });
    }
  }
  /**
   * Delete a challenge type by code
   * @param {string} code - Challenge type code
   * @returns {Promise<boolean>} True if successful
   * @throws {ChallengeTypeValidationError} If code is invalid
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async delete(code) {
    if (!code) {
      throw new ValidationError('Challenge type code is required for deletion', {
        entityType: this.domainName
      });
    }
    // First check if it exists
    const existing = await this.findByCode(code);
    if (!existing) {
      return false;
    }
    const {
      error
    } = await this.supabase.from(this.tableName).delete().eq('code', code);
    if (error) {
      this.logger.error('Error deleting challenge type', {
        code,
        error
      });
      throw new DatabaseError(`Failed to delete challenge type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'delete',
        metadata: {
          code
        }
      });
    }
    return true;
  }
  /**
   * Seed challenge types
   * @param {Array<ChallengeType>} challengeTypes - Array of challenge types to seed
   * @returns {Promise<Array<ChallengeType>>} Array of seeded challenge types
   * @throws {ChallengeTypeValidationError} If challengeTypes is invalid
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async seed(challengeTypes) {
    if (!challengeTypes || !Array.isArray(challengeTypes)) {
      throw new ValidationError('Challenge types array is required for seeding', {
        entityType: this.domainName
      });
    }
    try {
      // Use Promise.all to run saves in parallel for better performance
      const results = await Promise.all(challengeTypes.map(challengeType => this.save(challengeType)));
      this.logger.info('Successfully seeded challenge types', {
        count: results.length,
        codes: results.map(ct => ct.code)
      });
      return results;
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
        throw error;
      }
      this.logger.error('Error seeding challenge types', {
        error: error.message,
        stack: error.stack,
        count: challengeTypes.length
      });
      throw new DatabaseError(`Failed to seed challenge types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'seed'
      });
    }
  }
}
export default ChallengeTypeRepository;