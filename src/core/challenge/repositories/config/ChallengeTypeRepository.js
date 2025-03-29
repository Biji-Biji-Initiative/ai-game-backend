'use strict';

/**
 * Challenge Type Repository
 * 
 * Manages data access for challenge type configuration.
 * Acts as the bridge between the domain model and database.
 */

const ChallengeType = require('../../models/config/ChallengeType');
const challengeTypeMapper = require('../../mappers/ChallengeTypeMapper');
const {
  withRepositoryErrorHandling
} = require('../../../../core/infra/errors/ErrorHandler');
const { 
  ValidationError, 
  DatabaseError,
  EntityNotFoundError
} = require('../../../../core/infra/errors/CoreErrors');
const {
  ChallengeTypeNotFoundError,
  ChallengeTypeValidationError,
  ChallengeTypePersistenceError
} = require('../../errors/ChallengeErrors');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');

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
    this.supabase = supabase;
    this.tableName = 'challenge_types';
    this.logger = logger || challengeLogger.child({ component: 'repository:challengeType' });
    this.domainName = 'challenge:challengeType';
    
    // Apply repository error handling
    const methodsToWrap = [
      'findAll',
      'findByCode',
      'findById',
      'findByFormatType',
      'findByFocusArea',
      'save',
      'delete',
      'seed'
    ];
    
    withRepositoryErrorHandling(
      this,
      {
        entityNotFound: err => new ChallengeTypeNotFoundError(err.message, { cause: err }),
        validation: err => new ChallengeTypeValidationError(err.message, { cause: err }),
        database: err => new ChallengeTypePersistenceError(err.message, { cause: err }),
        default: err => new ChallengeTypePersistenceError(err.message, { cause: err })
      },
      methodsToWrap
    );
  }

  /**
   * Find all active challenge types
   * @returns {Promise<Array<ChallengeType>>} Array of challenge types
   * @throws {ChallengeTypePersistenceError} If database operation fails
   */
  async findAll() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (error) {
      this.logger.error('Error fetching challenge types', { error });
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
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      this.logger.error('Error fetching challenge type by code', { code, error });
      throw new DatabaseError(`Failed to fetch challenge type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByCode',
        metadata: { code }
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
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error('Error fetching challenge type by ID', { id, error });
      throw new DatabaseError(`Failed to fetch challenge type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findById',
        metadata: { id }
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
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .contains('format_types', [formatCode])
      .eq('is_active', true);

    if (error) {
      this.logger.error('Error fetching challenge types by format', { formatCode, error });
      throw new DatabaseError(`Failed to fetch challenge types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByFormatType',
        metadata: { formatCode }
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
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .contains('focus_areas', [focusAreaCode])
      .eq('is_active', true);

    if (error) {
      this.logger.error('Error fetching challenge types by focus area', { focusAreaCode, error });
      throw new DatabaseError(`Failed to fetch challenge types: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findByFocusArea',
        metadata: { focusAreaCode }
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
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(dbData)
          .eq('id', challengeType.id)
          .select()
          .single();

        if (error) {
          this.logger.error('Error updating challenge type', { code: challengeType.code, error });
          throw new DatabaseError(`Failed to update challenge type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save:update',
            metadata: { id: challengeType.id, code: challengeType.code }
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
          this.logger.error('Error inserting challenge type', { code: challengeType.code, error });
          throw new DatabaseError(`Failed to insert challenge type: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save:insert',
            metadata: { code: challengeType.code }
          });
        }
        result = data;
      }

      if (!result) {
        throw new DatabaseError('No data returned after save operation', {
          entityType: this.domainName,
          operation: 'save',
          metadata: { code: challengeType.code }
        });
      }

      return challengeTypeMapper.toDomain(result);
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || 
          error instanceof DatabaseError || 
          error instanceof EntityNotFoundError) {
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
        metadata: { code: challengeType.code }
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
    
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('code', code);

    if (error) {
      this.logger.error('Error deleting challenge type', { code, error });
      throw new DatabaseError(`Failed to delete challenge type: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'delete',
        metadata: { code }
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
      const results = await Promise.all(
        challengeTypes.map(challengeType => this.save(challengeType))
      );
      
      this.logger.info('Successfully seeded challenge types', { 
        count: results.length,
        codes: results.map(ct => ct.code)
      });
      
      return results;
    } catch (error) {
      // If it's already one of our known error types, just rethrow it
      if (error instanceof ValidationError || 
          error instanceof DatabaseError || 
          error instanceof EntityNotFoundError) {
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

module.exports = ChallengeTypeRepository; 