'use strict';

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { BaseRepository } from '#app/core/infra/repositories/BaseRepository.js';
import { AuthRepositoryError } from '#app/core/auth/errors/AuthErrors.js';
import { ValidationError, DatabaseError, DatabaseEntityNotFoundError } from '#app/core/infra/errors/InfraErrors.js';

/**
 * Repository for managing refresh tokens
 * 
 * This repository provides methods to create, find, validate, and revoke
 * refresh tokens used in the authentication flow.
 * 
 * @extends BaseRepository
 */
class RefreshTokenRepository extends BaseRepository {
    /**
     * Create a new RefreshTokenRepository instance
     * 
     * @param {Object} options - Repository options
     * @param {Object} options.db - Database client (Supabase)
     * @param {Object} options.logger - Logger instance
     */
    constructor({ db, logger }) {
        super({
            db,
            tableName: 'refresh_tokens',
            domainName: 'auth',
            logger: logger?.child({ repository: 'refresh-token' }) || logger,
            maxRetries: 3,
            validateUuids: true
        });
    }

    /**
     * Create a new refresh token for a user
     * 
     * @param {Object} options - Token creation options
     * @param {string} options.userId - User ID
     * @param {string} options.token - Token string from Supabase (if reusing existing token)
     * @param {number} options.expiresIn - Token expiration time in seconds (default: 7 days)
     * @param {string} options.ipAddress - IP address of the client
     * @param {string} options.userAgent - User agent of the client
     * @returns {Promise<Object>} Created token record
     * @throws {AuthRepositoryError} If token creation fails
     */
    async createToken({ userId, token = null, expiresIn = 60 * 60 * 24 * 7, ipAddress = null, userAgent = null }) {
        try {
            this._validateId(userId, 'userId');
            
            // Generate token if not provided
            const tokenValue = token || this._generateToken();
            
            // Calculate expiration date
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
            
            const tokenData = {
                id: uuidv4(),
                user_id: userId,
                token: tokenValue,
                created_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                revoked: false,
                ip_address: ipAddress,
                user_agent: userAgent
            };
            
            this._log('debug', 'Creating refresh token', { userId });
            
            const { data, error } = await this.db
                .from(this.tableName)
                .insert(tokenData)
                .select()
                .single();
                
            if (error) {
                throw new DatabaseError(`Failed to create refresh token: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'createToken',
                    metadata: { userId }
                });
            }
            
            return {
                id: data.id,
                userId: data.user_id,
                token: data.token,
                createdAt: data.created_at,
                expiresAt: data.expires_at
            };
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            
            throw new AuthRepositoryError(`Failed to create refresh token: ${error.message}`, {
                cause: error,
                metadata: { userId }
            });
        }
    }
    
    /**
     * Find a refresh token by its value
     * 
     * @param {string} token - Token value to find
     * @param {boolean} includeRevoked - Whether to include revoked tokens (default: false)
     * @returns {Promise<Object|null>} Token record or null if not found
     * @throws {AuthRepositoryError} If database operation fails
     */
    async findByToken(token, includeRevoked = false) {
        try {
            if (!token || typeof token !== 'string') {
                throw new ValidationError('Token is required and must be a string', {
                    entityType: this.domainName,
                    validationErrors: { token: 'Required parameter is missing or invalid' }
                });
            }
            
            this._log('debug', 'Finding refresh token');
            
            let query = this.db
                .from(this.tableName)
                .select('*')
                .eq('token', token);
                
            if (!includeRevoked) {
                query = query.eq('revoked', false);
            }
            
            const { data, error } = await query.maybeSingle();
                
            if (error) {
                throw new DatabaseError(`Failed to find refresh token: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByToken'
                });
            }
            
            if (!data) {
                return null;
            }
            
            return {
                id: data.id,
                userId: data.user_id,
                token: data.token,
                createdAt: data.created_at,
                expiresAt: data.expires_at,
                revoked: data.revoked,
                revokedAt: data.revoked_at,
                replacedBy: data.replaced_by,
                ipAddress: data.ip_address,
                userAgent: data.user_agent
            };
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            
            throw new AuthRepositoryError(`Failed to find refresh token: ${error.message}`, {
                cause: error
            });
        }
    }
    
    /**
     * Find all refresh tokens for a user
     * 
     * @param {string} userId - User ID to find tokens for
     * @param {boolean} includeRevoked - Whether to include revoked tokens (default: false)
     * @param {boolean} includeExpired - Whether to include expired tokens (default: false)
     * @returns {Promise<Array<Object>>} Array of token records
     * @throws {AuthRepositoryError} If database operation fails
     */
    async findByUserId(userId, includeRevoked = false, includeExpired = false) {
        try {
            this._validateId(userId, 'userId');
            
            this._log('debug', 'Finding refresh tokens for user', { userId });
            
            let query = this.db
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId);
                
            if (!includeRevoked) {
                query = query.eq('revoked', false);
            }
            
            if (!includeExpired) {
                query = query.gte('expires_at', new Date().toISOString());
            }
            
            const { data, error } = await query;
                
            if (error) {
                throw new DatabaseError(`Failed to find refresh tokens: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByUserId',
                    metadata: { userId }
                });
            }
            
            return (data || []).map(token => ({
                id: token.id,
                userId: token.user_id,
                token: token.token,
                createdAt: token.created_at,
                expiresAt: token.expires_at,
                revoked: token.revoked,
                revokedAt: token.revoked_at,
                replacedBy: token.replaced_by,
                ipAddress: token.ip_address,
                userAgent: token.user_agent
            }));
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            
            throw new AuthRepositoryError(`Failed to find refresh tokens: ${error.message}`, {
                cause: error,
                metadata: { userId }
            });
        }
    }
    
    /**
     * Validate a refresh token
     * 
     * Checks if the token exists, is not revoked, and has not expired.
     * 
     * @param {string} token - Token value to validate
     * @returns {Promise<Object>} Validated token record
     * @throws {DatabaseEntityNotFoundError} If token is not found
     * @throws {ValidationError} If token is revoked or expired
     * @throws {AuthRepositoryError} If database operation fails
     */
    async validateToken(token) {
        try {
            if (!token || typeof token !== 'string') {
                throw new ValidationError('Token is required and must be a string', {
                    entityType: this.domainName,
                    validationErrors: { token: 'Required parameter is missing or invalid' }
                });
            }
            
            this._log('debug', 'Validating refresh token');
            
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('token', token)
                .maybeSingle();
                
            if (error) {
                throw new DatabaseError(`Failed to validate refresh token: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'validateToken'
                });
            }
            
            if (!data) {
                throw new DatabaseEntityNotFoundError('refresh_token', { token }, {
                    entityType: this.domainName
                });
            }
            
            if (data.revoked) {
                throw new ValidationError('Refresh token has been revoked', {
                    entityType: this.domainName,
                    validationErrors: { token: 'Token revoked' }
                });
            }
            
            const expiresAt = new Date(data.expires_at);
            if (expiresAt < new Date()) {
                throw new ValidationError('Refresh token has expired', {
                    entityType: this.domainName,
                    validationErrors: { token: 'Token expired' }
                });
            }
            
            return {
                id: data.id,
                userId: data.user_id,
                token: data.token,
                createdAt: data.created_at,
                expiresAt: data.expires_at,
                ipAddress: data.ip_address,
                userAgent: data.user_agent
            };
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof DatabaseEntityNotFoundError) {
                throw error;
            }
            
            throw new AuthRepositoryError(`Failed to validate refresh token: ${error.message}`, {
                cause: error
            });
        }
    }
    
    /**
     * Revoke a refresh token
     * 
     * @param {string} token - Token value to revoke
     * @param {string} replacedBy - Optional token that replaces this one (for token rotation)
     * @returns {Promise<Object>} Updated token record
     * @throws {DatabaseEntityNotFoundError} If token is not found
     * @throws {AuthRepositoryError} If database operation fails
     */
    async revokeToken(token, replacedBy = null) {
        try {
            if (!token || typeof token !== 'string') {
                throw new ValidationError('Token is required and must be a string', {
                    entityType: this.domainName,
                    validationErrors: { token: 'Required parameter is missing or invalid' }
                });
            }
            
            this._log('debug', 'Revoking refresh token');
            
            // First check if token exists
            const { data: existingToken, error: findError } = await this.db
                .from(this.tableName)
                .select('id')
                .eq('token', token)
                .maybeSingle();
                
            if (findError) {
                throw new DatabaseError(`Failed to find refresh token for revocation: ${findError.message}`, {
                    cause: findError,
                    entityType: this.domainName,
                    operation: 'revokeToken'
                });
            }
            
            if (!existingToken) {
                throw new DatabaseEntityNotFoundError('refresh_token', { token }, {
                    entityType: this.domainName
                });
            }
            
            // Update token to revoke it
            const updateData = {
                revoked: true,
                revoked_at: new Date().toISOString()
            };
            
            if (replacedBy) {
                updateData.replaced_by = replacedBy;
            }
            
            const { data, error } = await this.db
                .from(this.tableName)
                .update(updateData)
                .eq('token', token)
                .select()
                .single();
                
            if (error) {
                throw new DatabaseError(`Failed to revoke refresh token: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'revokeToken'
                });
            }
            
            return {
                id: data.id,
                userId: data.user_id,
                revoked: data.revoked,
                revokedAt: data.revoked_at,
                replacedBy: data.replaced_by
            };
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof DatabaseEntityNotFoundError) {
                throw error;
            }
            
            throw new AuthRepositoryError(`Failed to revoke refresh token: ${error.message}`, {
                cause: error
            });
        }
    }
    
    /**
     * Revoke all refresh tokens for a user
     * 
     * @param {string} userId - User ID to revoke tokens for
     * @returns {Promise<number>} Number of tokens revoked
     * @throws {AuthRepositoryError} If database operation fails
     */
    async revokeAllForUser(userId) {
        try {
            this._validateId(userId, 'userId');
            
            this._log('debug', 'Revoking all refresh tokens for user', { userId });
            
            const { data, error } = await this.db
                .from(this.tableName)
                .update({
                    revoked: true,
                    revoked_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('revoked', false)
                .select('id');
                
            if (error) {
                throw new DatabaseError(`Failed to revoke all refresh tokens: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'revokeAllForUser',
                    metadata: { userId }
                });
            }
            
            return data?.length || 0;
        } catch (error) {
            if (error instanceof ValidationError || error instanceof DatabaseError) {
                throw error;
            }
            
            throw new AuthRepositoryError(`Failed to revoke all refresh tokens: ${error.message}`, {
                cause: error,
                metadata: { userId }
            });
        }
    }
    
    /**
     * Clean up expired or used tokens
     * 
     * @returns {Promise<number>} Number of tokens cleaned up
     * @throws {AuthRepositoryError} If database operation fails
     */
    async cleanupTokens() {
        try {
            this._log('debug', 'Cleaning up expired and revoked refresh tokens');
            
            // Delete tokens that are expired or have been revoked for more than a day
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const { data, error } = await this.db
                .from(this.tableName)
                .delete()
                .or(`expires_at.lt.${new Date().toISOString()},and(revoked.eq.true,revoked_at.lt.${yesterday.toISOString()})`)
                .select('id');
                
            if (error) {
                throw new DatabaseError(`Failed to clean up refresh tokens: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'cleanupTokens'
                });
            }
            
            this._log('info', `Cleaned up ${data?.length || 0} expired or revoked refresh tokens`);
            
            return data?.length || 0;
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error;
            }
            
            throw new AuthRepositoryError(`Failed to clean up refresh tokens: ${error.message}`, {
                cause: error
            });
        }
    }
    
    /**
     * Generate a secure random token
     * 
     * @returns {string} Random token string
     * @private
     */
    _generateToken() {
        return crypto.randomBytes(40).toString('hex');
    }
}

export default RefreshTokenRepository; 