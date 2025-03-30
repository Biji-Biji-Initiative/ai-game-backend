'use strict';

import FocusArea from "../../models/config/FocusArea.js";
import focusAreaMapper from "../../mappers/FocusAreaMapper.js";
import { challengeLogger } from "../../../infra/logging/domainLogger.js";
import { supabaseClient } from "../../../infra/db/supabaseClient.js";
import { ValidationError, DatabaseError, EntityNotFoundError } from "../../../infra/repositories/BaseRepository.js";
import { withRepositoryErrorHandling, createErrorMapper } from "../../../infra/errors/errorStandardization.js";
import challengeErrors from "../../errors/ChallengeErrors.js";

// Import domain-specific error classes
const { 
  ChallengeError, 
  ChallengeNotFoundError, 
  ChallengeValidationError, 
  ChallengeProcessingError 
} = challengeErrors;

// Define error mapper for focus area repository
const focusAreaErrorMapper = createErrorMapper({
    EntityNotFoundError: ChallengeNotFoundError,
    ValidationError: ChallengeValidationError,
    DatabaseError: ChallengeProcessingError,
}, ChallengeProcessingError);

/**
 * Repository for managing the catalog of available focus areas for challenges
 * This is distinct from user-specific focus areas which are managed in the FocusAreaRepository
 */
class FocusAreaConfigRepository {
    /**
     * Create a new FocusAreaConfigRepository
     * @param {Object} supabase - Supabase client instance for database operations
     * @param {Object} logger - Logger instance for recording repository operations
     */
    constructor(supabase, logger) {
        this.supabase = supabase || supabaseClient;
        this.tableName = 'challenge_focus_areas';
        this.logger = logger || challengeLogger.child({ component: 'repository:focusAreaConfig' });
        this.domainName = 'challenge:focusAreaConfig';
        
        // Apply repository error handling with standardized pattern
        this.findAll = withRepositoryErrorHandling(
          this.findAll.bind(this),
          {
            methodName: 'findAll',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
        
        this.findByCode = withRepositoryErrorHandling(
          this.findByCode.bind(this),
          {
            methodName: 'findByCode',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
        
        this.findById = withRepositoryErrorHandling(
          this.findById.bind(this),
          {
            methodName: 'findById',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
        
        this.findByPrerequisite = withRepositoryErrorHandling(
          this.findByPrerequisite.bind(this),
          {
            methodName: 'findByPrerequisite',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
        
        this.findByRelatedArea = withRepositoryErrorHandling(
          this.findByRelatedArea.bind(this),
          {
            methodName: 'findByRelatedArea',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
        
        this.save = withRepositoryErrorHandling(
          this.save.bind(this),
          {
            methodName: 'save',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
        
        this.delete = withRepositoryErrorHandling(
          this.delete.bind(this),
          {
            methodName: 'delete',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
        
        this.seed = withRepositoryErrorHandling(
          this.seed.bind(this),
          {
            methodName: 'seed',
            domainName: this.domainName,
            logger: this.logger,
            errorMapper: focusAreaErrorMapper
          }
        );
    }
    /**
     * Find all active focus areas in the catalog
     * @returns {Promise<Array<FocusArea>>} Array of focus areas
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async findAll() {
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
        return focusAreaMapper.toDomainCollection(data || []);
    }
    /**
     * Find a focus area in the catalog by its code
     * @param {string} code - Focus area code
     * @returns {Promise<FocusArea|null>} Focus area or null if not found
     * @throws {ChallengeValidationError} If code is invalid
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async findByCode(code) {
        if (!code) {
            throw new ValidationError('Focus area code is required', {
                entityType: this.domainName
            });
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
        return focusAreaMapper.toDomain(data);
    }
    /**
     * Find a focus area in the catalog by its ID
     * @param {string} id - Focus area ID
     * @returns {Promise<FocusArea|null>} Focus area or null if not found
     * @throws {ChallengeValidationError} If ID is invalid
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async findById(id) {
        if (!id) {
            throw new ValidationError('Focus area ID is required', {
                entityType: this.domainName
            });
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
        return focusAreaMapper.toDomain(data);
    }
    /**
     * Find focus areas in the catalog with specific prerequisites
     * @param {string} prerequisiteCode - Prerequisite focus area code
     * @returns {Promise<Array<FocusArea>>} Array of focus areas
     * @throws {ChallengeValidationError} If prerequisiteCode is invalid
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async findByPrerequisite(prerequisiteCode) {
        if (!prerequisiteCode) {
            throw new ValidationError('Prerequisite code is required', {
                entityType: this.domainName
            });
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
        return focusAreaMapper.toDomainCollection(data || []);
    }
    /**
     * Find focus areas related to another area in the catalog
     * @param {string} relatedAreaCode - Related area code
     * @returns {Promise<Array<FocusArea>>} Array of focus areas
     * @throws {ChallengeValidationError} If relatedAreaCode is invalid
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async findByRelatedArea(relatedAreaCode) {
        if (!relatedAreaCode) {
            throw new ValidationError('Related area code is required', {
                entityType: this.domainName
            });
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
        return focusAreaMapper.toDomainCollection(data || []);
    }
    /**
     * Save a focus area to the catalog
     * @param {FocusArea} focusArea - Focus area to save
     * @returns {Promise<FocusArea>} Saved focus area
     * @throws {ChallengeValidationError} If focus area is invalid
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async save(focusArea) {
        if (!(focusArea instanceof FocusArea)) {
            throw new ValidationError('Can only save FocusArea instances to the catalog', {
                entityType: this.domainName
            });
        }
        
        try {
            const dbData = focusAreaMapper.toPersistence(focusArea);
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
                    this.logger.error('Error updating focus area in catalog', { id: focusArea.id, error });
                    throw new DatabaseError(`Failed to update focus area in catalog: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save.update',
                        metadata: { id: focusArea.id }
                    });
                }
                result = data;
            }
            else {
                // Insert
                const { data, error } = await this.supabase
                    .from(this.tableName)
                    .insert(dbData)
                    .select()
                    .single();
                if (error) {
                    this.logger.error('Error creating focus area in catalog', { code: focusArea.code, error });
                    throw new DatabaseError(`Failed to create focus area in catalog: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save.insert',
                        metadata: { code: focusArea.code }
                    });
                }
                result = data;
            }
            return focusAreaMapper.toDomain(result);
        } catch (error) {
            // If it's already one of our known error types, just rethrow it
            if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
                throw error;
            }
            
            // Otherwise, wrap it in a database error
            this.logger.error('Unexpected error saving focus area', {
                code: focusArea.code,
                error: error.message,
                stack: error.stack
            });
            
            throw new DatabaseError(`Failed to save focus area: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'save',
                metadata: { code: focusArea.code }
            });
        }
    }
    /**
     * Delete a focus area from the catalog
     * @param {string} code - Focus area code
     * @returns {Promise<boolean>} True if deleted
     * @throws {ChallengeValidationError} If code is invalid
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async delete(code) {
        if (!code) {
            throw new ValidationError('Focus area code is required', {
                entityType: this.domainName
            });
        }
        
        try {
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
            return true;
        } catch (error) {
            // If it's already one of our known error types, just rethrow it
            if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
                throw error;
            }
            
            // Otherwise, wrap it in a database error
            this.logger.error('Unexpected error deleting focus area', {
                code,
                error: error.message,
                stack: error.stack
            });
            
            throw new DatabaseError(`Failed to delete focus area: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'delete',
                metadata: { code }
            });
        }
    }
    /**
     * Seed the catalog with initial focus areas
     * @param {Array<Object>} focusAreas - Focus areas to seed
     * @returns {Promise<Array<FocusArea>>} Array of seeded focus areas
     * @throws {ChallengeValidationError} If seed data is invalid
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async seed(focusAreas) {
        if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
            throw new ValidationError('Valid focus areas array is required for seeding', {
                entityType: this.domainName
            });
        }
        
        try {
            // Create FocusArea instances
            const areas = focusAreas.map(data => new FocusArea(data));
            
            // Save each area using Promise.all for parallel execution
            const results = await Promise.all(areas.map(area => this.save(area)));
            
            this.logger.info('Successfully seeded focus areas catalog', { count: areas.length });
            return results;
        } catch (error) {
            // If it's already one of our known error types, just rethrow it
            if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof EntityNotFoundError) {
                throw error;
            }
            
            // Otherwise, wrap it in a database error
            this.logger.error('Error seeding focus areas catalog', {
                error: error.message,
                stack: error.stack,
                count: focusAreas.length
            });
            
            throw new DatabaseError(`Failed to seed focus areas: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'seed'
            });
        }
    }
}
export default FocusAreaConfigRepository;
