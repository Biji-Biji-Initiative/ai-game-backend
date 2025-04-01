'use strict';

import appError from "#app/core/common/errors/AppError.js";
import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Challenge Type Repository
 *
 * Repository for managing challenge types data
 * Follows Single Responsibility Principle by focusing only on challenge type data access
 *
 * @module ChallengeTypeRepository
 * @requires logger
 */
const { AppError } = appError;
/**
 * Repository for challenge types
 */
class ChallengeTypeRepository {
    /**
     * Create a new ChallengeTypeRepository
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.db - Database client
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ db, logger: customLogger }) {
        this.db = db;
        this.tableName = 'challenge_types';
        this.logger = customLogger || logger.child({ repository: 'ChallengeTypeRepository' });
    }
    /**
     * Find a challenge type by its code
     * @param {string} code - Challenge type code
     * @returns {Promise<Object>} Challenge type data
     */
    async findByCode(code) {
        try {
            this.logger.debug('Finding challenge type by code', { code });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('code', code)
                .single();
            if (error) {
                throw new AppError(`Database error: ${error.message}`, 500, {
                    errorCode: 'DATABASE_ERROR',
                    metadata: { operation: 'findByCode', code }
                });
            }
            return data;
        }
        catch (error) {
            this.logger.error('Error finding challenge type by code', {
                error: error.message,
                code
            });
            throw error;
        }
    }
    /**
     * Get all available challenge types
     * @returns {Promise<Array>} List of challenge types
     */
    async findAll() {
        try {
            this.logger.debug('Finding all challenge types');
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*');
            if (error) {
                throw new AppError(`Database error: ${error.message}`, 500, {
                    errorCode: 'DATABASE_ERROR',
                    metadata: { operation: 'findAll' }
                });
            }
            return data || [];
        }
        catch (error) {
            this.logger.error('Error finding all challenge types', {
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Create a new challenge type
     * @param {Object} challengeType - Challenge type data
     * @returns {Promise<Object>} Created challenge type
     */
    async create(challengeType) {
        try {
            this.logger.debug('Creating new challenge type', {
                code: challengeType.code,
                name: challengeType.name
            });
            if (!challengeType.code || !challengeType.name) {
                throw new AppError('Challenge type code and name are required', 400, {
                    errorCode: 'VALIDATION_ERROR',
                    metadata: { operation: 'create' }
                });
            }
            const { data, error } = await this.db
                .from(this.tableName)
                .insert(challengeType)
                .select()
                .single();
            if (error) {
                throw new AppError(`Database error: ${error.message}`, 500, {
                    errorCode: 'DATABASE_ERROR',
                    metadata: { operation: 'create' }
                });
            }
            return data;
        }
        catch (error) {
            this.logger.error('Error creating challenge type', {
                error: error.message,
                challengeType
            });
            throw error;
        }
    }
    /**
     * Update a challenge type
     * @param {string} code - Challenge type code
     * @param {Object} updates - Challenge type updates
     * @returns {Promise<Object>} Updated challenge type
     */
    async update(code, updates) {
        try {
            this.logger.debug('Updating challenge type', { code });
            const { data, error } = await this.db
                .from(this.tableName)
                .update(updates)
                .eq('code', code)
                .select()
                .single();
            if (error) {
                throw new AppError(`Database error: ${error.message}`, 500, {
                    errorCode: 'DATABASE_ERROR',
                    metadata: { operation: 'update', code }
                });
            }
            return data;
        }
        catch (error) {
            this.logger.error('Error updating challenge type', {
                error: error.message,
                code
            });
            throw error;
        }
    }
    /**
     * Delete a challenge type
     * @param {string} code - Challenge type code
     * @returns {Promise<boolean>} Success status
     */
    async delete(code) {
        try {
            this.logger.debug('Deleting challenge type', { code });
            const { error } = await this.db
                .from(this.tableName)
                .delete()
                .eq('code', code);
            if (error) {
                throw new AppError(`Database error: ${error.message}`, 500, {
                    errorCode: 'DATABASE_ERROR',
                    metadata: { operation: 'delete', code }
                });
            }
            return true;
        }
        catch (error) {
            this.logger.error('Error deleting challenge type', {
                error: error.message,
                code
            });
            throw error;
        }
    }
}
export default ChallengeTypeRepository;
