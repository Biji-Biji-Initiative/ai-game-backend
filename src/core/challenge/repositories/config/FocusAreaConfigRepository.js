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
  ChallengeNotFoundError, 
  ChallengeValidationError, 
  ChallengeProcessingError 
} = challengeErrors;

// Define error mapper for focus area config repository
const focusAreaConfigErrorMapper = createErrorMapper({
    EntityNotFoundError: ChallengeNotFoundError,
    ValidationError: ChallengeValidationError,
    DatabaseError: ChallengeProcessingError,
}, ChallengeProcessingError);

// Cache TTL constants if needed
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
     * @param {Object} cache - Optional cache instance for caching repository results
     */
    constructor(supabase, logger, cache) {
        this.supabase = supabase || supabaseClient;
        this.tableName = 'challenge_focus_areas';
        this.logger = logger || challengeLogger.child({ component: 'repository:focusAreaConfig' });
        this.domainName = 'challenge:focusAreaConfig';
        this.cache = cache;
        
        // Apply repository error handling with standardized pattern
        this.findAll = withRepositoryErrorHandling(
            this.findAll.bind(this),
            {
                methodName: 'findAll',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.findByCode = withRepositoryErrorHandling(
            this.findByCode.bind(this),
            {
                methodName: 'findByCode',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.findById = withRepositoryErrorHandling(
            this.findById.bind(this),
            {
                methodName: 'findById',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.findByPrerequisite = withRepositoryErrorHandling(
            this.findByPrerequisite.bind(this),
            {
                methodName: 'findByPrerequisite',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.findByRelatedArea = withRepositoryErrorHandling(
            this.findByRelatedArea.bind(this),
            {
                methodName: 'findByRelatedArea',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.save = withRepositoryErrorHandling(
            this.save.bind(this),
            {
                methodName: 'save',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.delete = withRepositoryErrorHandling(
            this.delete.bind(this),
            {
                methodName: 'delete',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.seed = withRepositoryErrorHandling(
            this.seed.bind(this),
            {
                methodName: 'seed',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
        
        this.invalidateCache = withRepositoryErrorHandling(
            this.invalidateCache.bind(this),
            {
                methodName: 'invalidateCache',
                domainName: this.domainName,
                logger: this.logger,
                errorMapper: focusAreaConfigErrorMapper
            }
        );
    }
    
    /**
     * Find all active focus areas in the catalog
     * @returns {Promise<Array<FocusArea>>} Array of focus areas
     * @throws {ChallengeProcessingError} If database operation fails
     */
    async findAll() {
        // If cache is available, try to get from cache first
        if (this.cache) {
            const cacheKey = 'focusArea:all';
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved focus areas from cache', {
                    count: cachedData.length
                });
                return focusAreaMapper.toDomainCollection(cachedData);
            }
        }
        
        const {
            data,
            error
        } = await this.supabase.from(this.tableName).select('*').eq('is_active', true).order('display_order');
        
        if (error) {
            this.logger.error('Error fetching focus areas from catalog', {
                error
            });
            throw new DatabaseError(`Failed to fetch focus areas from catalog: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findAll'
            });
        }
        
        // Cache the result if cache is available
        if (this.cache && data) {
            await this.cache.set('focusArea:all', data, CACHE_TTL.ALL);
            this.logger.debug('Cached focus areas', {
                count: data.length
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
        
        // If cache is available, try to get from cache first
        if (this.cache) {
            const cacheKey = `focusArea:code:${code}`;
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved focus area from cache', {
                    code
                });
                return cachedData ? focusAreaMapper.toDomain(cachedData) : null;
            }
        }
        
        const {
            data,
            error
        } = await this.supabase.from(this.tableName).select('*').eq('code', code).maybeSingle();
        
        if (error) {
            this.logger.error('Error fetching focus area from catalog by code', {
                code,
                error
            });
            throw new DatabaseError(`Failed to fetch focus area from catalog: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByCode',
                metadata: {
                    code
                }
            });
        }
        
        // Cache the result if cache is available
        if (this.cache) {
            await this.cache.set(`focusArea:code:${code}`, data, CACHE_TTL.SINGLE);
            this.logger.debug('Cached focus area', {
                code
            });
        }
        
        return data ? focusAreaMapper.toDomain(data) : null;
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
        
        // If cache is available, try to get from cache first
        if (this.cache) {
            const cacheKey = `focusArea:id:${id}`;
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved focus area from cache', {
                    id
                });
                return cachedData ? focusAreaMapper.toDomain(cachedData) : null;
            }
        }
        
        const {
            data,
            error
        } = await this.supabase.from(this.tableName).select('*').eq('id', id).maybeSingle();
        
        if (error) {
            this.logger.error('Error fetching focus area from catalog by ID', {
                id,
                error
            });
            throw new DatabaseError(`Failed to fetch focus area from catalog: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findById',
                metadata: {
                    id
                }
            });
        }
        
        // Cache the result if cache is available
        if (this.cache) {
            await this.cache.set(`focusArea:id:${id}`, data, CACHE_TTL.SINGLE);
            this.logger.debug('Cached focus area', {
                id
            });
        }
        
        return data ? focusAreaMapper.toDomain(data) : null;
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
        
        // If cache is available, try to get from cache first
        if (this.cache) {
            const cacheKey = `focusArea:prerequisite:${prerequisiteCode}`;
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved focus areas from cache', {
                    prerequisiteCode,
                    count: cachedData.length
                });
                return focusAreaMapper.toDomainCollection(cachedData);
            }
        }
        
        const {
            data,
            error
        } = await this.supabase.from(this.tableName).select('*').contains('prerequisites', [prerequisiteCode]).eq('is_active', true);
        
        if (error) {
            this.logger.error('Error fetching focus areas from catalog by prerequisite', {
                prerequisiteCode,
                error
            });
            throw new DatabaseError(`Failed to fetch focus areas from catalog: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByPrerequisite',
                metadata: {
                    prerequisiteCode
                }
            });
        }
        
        // Cache the result if cache is available
        if (this.cache && data) {
            await this.cache.set(`focusArea:prerequisite:${prerequisiteCode}`, data, CACHE_TTL.SINGLE);
            this.logger.debug('Cached focus areas by prerequisite', {
                prerequisiteCode,
                count: data.length
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
        
        // If cache is available, try to get from cache first
        if (this.cache) {
            const cacheKey = `focusArea:related:${relatedAreaCode}`;
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved focus areas from cache', {
                    relatedAreaCode,
                    count: cachedData.length
                });
                return focusAreaMapper.toDomainCollection(cachedData);
            }
        }
        
        const {
            data,
            error
        } = await this.supabase.from(this.tableName).select('*').contains('related_areas', [relatedAreaCode]).eq('is_active', true);
        
        if (error) {
            this.logger.error('Error fetching focus areas from catalog by related area', {
                relatedAreaCode,
                error
            });
            throw new DatabaseError(`Failed to fetch focus areas from catalog: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByRelatedArea',
                metadata: {
                    relatedAreaCode
                }
            });
        }
        
        // Cache the result if cache is available
        if (this.cache && data) {
            await this.cache.set(`focusArea:related:${relatedAreaCode}`, data, CACHE_TTL.SINGLE);
            this.logger.debug('Cached focus areas by related area', {
                relatedAreaCode,
                count: data.length
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
                    this.logger.error('Error updating focus area in catalog', {
                        code: focusArea.code,
                        error
                    });
                    throw new DatabaseError(`Failed to update focus area in catalog: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save.update',
                        metadata: {
                            code: focusArea.code
                        }
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
                    this.logger.error('Error inserting focus area into catalog', {
                        code: focusArea.code,
                        error
                    });
                    throw new DatabaseError(`Failed to insert focus area into catalog: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save.insert',
                        metadata: {
                            code: focusArea.code
                        }
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
                this.logger.debug('Invalidated focus area cache entries', {
                    code: focusArea.code
                });
            }
            
            return focusAreaMapper.toDomain(result);
        } catch (error) {
            // If it's already one of our known error types, just rethrow it
            if (error instanceof ValidationError || 
                error instanceof DatabaseError || 
                error instanceof EntityNotFoundError) {
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
                metadata: { 
                    code: focusArea.code 
                }
            });
        }
    }
    
    /**
     * Delete a focus area from the catalog
     * @param {string} code - Focus area code
     * @returns {Promise<boolean>} True if successful
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
                this.logger.warn('Focus area not found for deletion', {
                    code
                });
                return false;
            }
            
            const { error } = await this.supabase
                .from(this.tableName)
                .delete()
                .eq('code', code);
                
            if (error) {
                this.logger.error('Error deleting focus area from catalog', {
                    code,
                    error
                });
                throw new DatabaseError(
                    `Failed to delete focus area from catalog: ${error.message}`, 
                    {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'delete',
                        metadata: {
                            code
                        }
                    }
                );
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
                this.logger.debug('Invalidated focus area cache entries after deletion', {
                    code
                });
            }
            
            return true;
        } catch (error) {
            // If it's already one of our known error types, just rethrow it
            if (error instanceof ValidationError || 
                error instanceof DatabaseError || 
                error instanceof EntityNotFoundError) {
                throw error;
            }
            
            // Otherwise, wrap it in a database error
            this.logger.error('Unexpected error deleting focus area', {
                code,
                error: error.message,
                stack: error.stack
            });
            
            throw new DatabaseError(
                `Failed to delete focus area: ${error.message}`, 
                {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'delete',
                    metadata: {
                        code
                    }
                }
            );
        }
    }
    
    /**
     * Seed the focus area catalog with initial data
     * @param {Array<Object>} focusAreas - Focus area data to seed
     * @returns {Promise<Array<FocusArea>>} Array of saved focus areas
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
            
            this.logger.info('Successfully seeded focus areas catalog', {
                count: areas.length
            });
            
            return results;
        } catch (error) {
            // If it's already one of our known error types, just rethrow it
            if (error instanceof ValidationError || 
                error instanceof DatabaseError || 
                error instanceof EntityNotFoundError) {
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
    
    /**
     * Invalidate all focus area cache entries
     * @returns {Promise<void>}
     */
    async invalidateCache() {
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
            this.logger.error('Error invalidating focus area cache', {
                error: error.message,
                stack: error.stack
            });
            
            throw new DatabaseError(`Failed to invalidate focus area cache: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'invalidateCache'
            });
        }
    }
}

// Use lazy initialization for the singleton
let _instance = null;
function getRepositoryInstance() {
    if (!_instance) {
        _instance = new FocusAreaConfigRepository();
    }
    return _instance;
}

// Export singleton instance and class
export const focusAreaConfigRepository = getRepositoryInstance();
export { FocusAreaConfigRepository };
export default {
    FocusAreaConfigRepository,
    focusAreaConfigRepository
};