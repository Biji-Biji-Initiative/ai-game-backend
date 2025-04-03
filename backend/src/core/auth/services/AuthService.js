import { AuthError, AuthNotFoundError, AuthValidationError, AuthProcessingError } from "#app/core/auth/errors/AuthErrors.js";
import { withServiceErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
import { v4 as uuidv4 } from 'uuid';
import { ValidationError, DatabaseEntityNotFoundError } from "#app/core/infra/errors/InfraErrors.js";

// Create an error mapper for auth service
const authErrorMapper = createErrorMapper({
    AuthNotFoundError: AuthNotFoundError,
    AuthValidationError: AuthValidationError,
    Error: AuthProcessingError
}, AuthError);

/**
 * Authentication Service
 * 
 * Handles authentication operations using Supabase Auth
 * This service encapsulates authentication logic to separate it from repositories
 */
class AuthService {
    /**
     * Create a new AuthService
     * @param {Object} options - Service options
     * @param {Object} options.db - Supabase client
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.refreshTokenRepository - Repository for refresh tokens
     */
    constructor({ db, logger, refreshTokenRepository }) {
        if (!db) {
            throw new Error('db (Supabase client) is required for AuthService');
        }
        
        if (!refreshTokenRepository) {
            throw new Error('refreshTokenRepository is required for AuthService');
        }
        
        this.db = db;
        this.logger = logger || console;
        this.refreshTokenRepository = refreshTokenRepository;

        // Apply standardized error handling
        this.signUp = withServiceErrorHandling(this.signUp.bind(this), {
            methodName: 'signUp',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });

        this.login = withServiceErrorHandling(this.login.bind(this), {
            methodName: 'login',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });

        this.validateToken = withServiceErrorHandling(this.validateToken.bind(this), {
            methodName: 'validateToken',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });
        
        this.refreshToken = withServiceErrorHandling(this.refreshToken.bind(this), {
            methodName: 'refreshToken',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });
        
        this.generateRefreshToken = withServiceErrorHandling(this.generateRefreshToken.bind(this), {
            methodName: 'generateRefreshToken',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });
        
        this.validateRefreshToken = withServiceErrorHandling(this.validateRefreshToken.bind(this), {
            methodName: 'validateRefreshToken',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });
        
        this.revokeRefreshToken = withServiceErrorHandling(this.revokeRefreshToken.bind(this), {
            methodName: 'revokeRefreshToken',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });
        
        this.rotateRefreshToken = withServiceErrorHandling(this.rotateRefreshToken.bind(this), {
            methodName: 'rotateRefreshToken',
            domainName: 'auth',
            logger: this.logger,
            errorMapper: authErrorMapper
        });
    }

    /**
     * Sign up a new user with Supabase Auth
     * 
     * @param {Object} userData - User data
     * @param {string} userData.email - User email
     * @param {string} userData.password - User password (optional, will generate random if not provided)
     * @param {string} userData.name - User name
     * @returns {Promise<Object>} - The created auth user and session
     */
    async signUp({ email, password, name }) {
        this.logger.info('Signing up new user', { email });

        if (!email) {
            throw new AuthValidationError('Email is required for signup');
        }

        // Generate a random password if none provided (for minimal user registration)
        const userPassword = password || uuidv4(); 

        // Create the user in Supabase Auth
        const { data, error } = await this.db.auth.signUp({
            email,
            password: userPassword,
            options: {
                data: {
                    name
                }
            }
        });

        if (error) {
            this.logger.error('Error signing up user', { 
                email, 
                errorMessage: error.message,
                errorCode: error.code
            });
            throw new AuthError(`Auth signup failed: ${error.message}`, {
                cause: error,
                statusCode: error.status || 400
            });
        }

        this.logger.info('User signed up successfully', { email, userId: data.user.id });
        return data;
    }

    /**
     * Login a user with Supabase Auth
     * 
     * @param {Object} credentials - User credentials
     * @param {string} credentials.email - User email
     * @param {string} credentials.password - User password
     * @param {Object} [options] - Additional options
     * @param {string} [options.ipAddress] - IP address of the client
     * @param {string} [options.userAgent] - User agent of the client
     * @returns {Promise<Object>} - The auth session
     */
    async login({ email, password }, options = {}) {
        this.logger.info('Logging in user', { email });

        if (!email || !password) {
            throw new AuthValidationError('Email and password are required for login');
        }

        const { data, error } = await this.db.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            this.logger.error('Error logging in user', { 
                email, 
                errorMessage: error.message,
                errorCode: error.code
            });
            throw new AuthError(`Auth login failed: ${error.message}`, {
                cause: error,
                statusCode: error.status || 401
            });
        }
        
        // Store the refresh token in our database for better tracking and security
        if (data.session?.refresh_token) {
            try {
                // Store the refresh token with client info
                await this.generateRefreshToken({
                    userId: data.user.id,
                    token: data.session.refresh_token,
                    ipAddress: options.ipAddress,
                    userAgent: options.userAgent
                });
            } catch (tokenError) {
                // Log but don't fail the login if token storage fails
                this.logger.error('Failed to store refresh token', { 
                    userId: data.user.id,
                    error: tokenError.message 
                });
            }
        }

        this.logger.info('User logged in successfully', { email });
        return data;
    }

    /**
     * Validate a JWT token and get user data
     * 
     * @param {string} token - JWT token to validate
     * @returns {Promise<Object>} - The authenticated user data
     */
    async validateToken(token) {
        this.logger.debug('Validating auth token');

        if (!token) {
            throw new AuthValidationError('Token is required for validation');
        }

        const { data, error } = await this.db.auth.getUser(token);

        if (error) {
            this.logger.error('Token validation failed', { 
                errorMessage: error.message,
                errorCode: error.code
            });
            throw new AuthError(`Invalid token: ${error.message}`, {
                cause: error,
                statusCode: error.status || 401
            });
        }

        if (!data || !data.user) {
            this.logger.error('No user data returned from token validation');
            throw new AuthError('Invalid token: no user data returned', {
                statusCode: 401
            });
        }

        this.logger.debug('Token validated successfully', { 
            userId: data.user.id,
            email: data.user.email
        });
        return data;
    }
    
    /**
     * Refresh an access token using a refresh token
     * 
     * This method validates the refresh token, gets a new session from Supabase,
     * and implements token rotation for improved security.
     * 
     * @param {string} refreshToken - Refresh token to use
     * @param {Object} [options] - Additional options
     * @param {string} [options.ipAddress] - IP address of the client
     * @param {string} [options.userAgent] - User agent of the client
     * @returns {Promise<Object>} - The new session with rotated tokens
     * @throws {AuthError} - If token is invalid or refresh fails
     */
    async refreshToken(refreshToken, options = {}) {
        this.logger.debug('Refreshing access token');

        if (!refreshToken) {
            throw new AuthValidationError('Refresh token is required');
        }
        
        try {
            // Validate the token in our database first
            await this.validateRefreshToken(refreshToken);
            
            // If valid, use it with Supabase to get a new session
            const { data, error } = await this.db.auth.refreshSession({
                refresh_token: refreshToken
            });
            
            if (error) {
                this.logger.error('Refresh token rejected by Supabase', { 
                    errorMessage: error.message,
                    errorCode: error.code
                });
                
                // Revoke the invalid token
                await this.revokeRefreshToken(refreshToken);
                
                throw new AuthError(`Failed to refresh session: ${error.message}`, {
                    cause: error,
                    statusCode: error.status || 401
                });
            }
            
            // If successful, implement token rotation
            // 1. Revoke the old token
            // 2. Store the new refresh token
            const newToken = data.session.refresh_token;
            if (newToken) {
                await this.rotateRefreshToken(refreshToken, newToken, {
                    userId: data.user.id,
                    ipAddress: options.ipAddress,
                    userAgent: options.userAgent
                });
            }
            
            return data;
        } catch (error) {
            // Catch any validation or database errors
            if (error instanceof AuthError) {
                throw error;
            }
            
            this.logger.error('Error refreshing token', { error: error.message });
            throw new AuthError(`Failed to refresh token: ${error.message}`, {
                cause: error,
                statusCode: 401
            });
        }
    }
    
    /**
     * Generate and store a refresh token for a user
     * 
     * @param {Object} options - Token options
     * @param {string} options.userId - User ID
     * @param {string} [options.token] - Existing token (optional, will generate if not provided)
     * @param {number} [options.expiresIn] - Token lifetime in seconds (default: 7 days)
     * @param {string} [options.ipAddress] - IP address of the client
     * @param {string} [options.userAgent] - User agent of the client
     * @returns {Promise<Object>} - The generated token object
     */
    async generateRefreshToken({ userId, token = null, expiresIn = 7 * 24 * 60 * 60, ipAddress = null, userAgent = null }) {
        this.logger.debug('Generating refresh token', { userId });

        if (!userId) {
            throw new AuthValidationError('User ID is required to generate a refresh token');
        }
        
        return this.refreshTokenRepository.createToken({
            userId,
            token,
            expiresIn,
            ipAddress,
            userAgent
        });
    }
    
    /**
     * Validate a refresh token
     * 
     * @param {string} token - Token to validate
     * @returns {Promise<Object>} - Validated token data
     * @throws {AuthError} - If token is invalid, expired, or revoked
     */
    async validateRefreshToken(token) {
        this.logger.debug('Validating refresh token');

        if (!token) {
            throw new AuthValidationError('Refresh token is required for validation');
        }
        
        try {
            // This will throw appropriate errors if token is invalid
            return await this.refreshTokenRepository.validateToken(token);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw new AuthValidationError(`Invalid refresh token: ${error.message}`, {
                    cause: error
                });
            }
            
            if (error instanceof DatabaseEntityNotFoundError) {
                throw new AuthNotFoundError('Refresh token not found', {
                    cause: error
                });
            }
            
            throw new AuthError(`Error validating refresh token: ${error.message}`, {
                cause: error
            });
        }
    }
    
    /**
     * Revoke a refresh token
     * 
     * @param {string} token - Token to revoke
     * @returns {Promise<Object>} - Result of revocation
     */
    async revokeRefreshToken(token) {
        this.logger.debug('Revoking refresh token');

        if (!token) {
            throw new AuthValidationError('Refresh token is required for revocation');
        }
        
        try {
            return await this.refreshTokenRepository.revokeToken(token);
        } catch (error) {
            if (error instanceof DatabaseEntityNotFoundError) {
                // If token doesn't exist, consider it already revoked
                this.logger.warn('Attempted to revoke non-existent token');
                return { revoked: true };
            }
            
            throw new AuthError(`Failed to revoke refresh token: ${error.message}`, {
                cause: error
            });
        }
    }
    
    /**
     * Revoke all refresh tokens for a user
     * 
     * @param {string} userId - User ID to revoke tokens for
     * @returns {Promise<number>} - Number of tokens revoked
     */
    async revokeAllUserTokens(userId) {
        this.logger.debug('Revoking all refresh tokens for user', { userId });

        if (!userId) {
            throw new AuthValidationError('User ID is required');
        }
        
        return this.refreshTokenRepository.revokeAllForUser(userId);
    }
    
    /**
     * Rotate a refresh token (revoke old one and create new one)
     * 
     * @param {string} oldToken - Old token to revoke
     * @param {string} newToken - New token to create
     * @param {Object} options - Additional options
     * @param {string} options.userId - User ID
     * @param {string} [options.ipAddress] - IP address of the client
     * @param {string} [options.userAgent] - User agent of the client
     * @returns {Promise<Object>} - The new token data
     */
    async rotateRefreshToken(oldToken, newToken, { userId, ipAddress = null, userAgent = null }) {
        this.logger.debug('Rotating refresh token');

        if (!oldToken || !newToken || !userId) {
            throw new AuthValidationError('Old token, new token, and user ID are required for token rotation');
        }
        
        // Atomically revoke old token and create new one
        // Use a transaction when available to ensure consistency
        try {
            // Revoke the old token and mark it as replaced
            await this.refreshTokenRepository.revokeToken(oldToken, newToken);
            
            // Store the new token
            return await this.refreshTokenRepository.createToken({
                userId,
                token: newToken,
                ipAddress,
                userAgent
            });
        } catch (error) {
            this.logger.error('Failed to rotate refresh token', { error: error.message });
            throw new AuthError(`Failed to rotate refresh token: ${error.message}`, {
                cause: error
            });
        }
    }
    
    /**
     * Clean up expired and revoked tokens
     * 
     * @returns {Promise<number>} - Number of tokens cleaned up
     */
    async cleanupTokens() {
        this.logger.debug('Cleaning up expired and revoked tokens');
        
        try {
            const count = await this.refreshTokenRepository.cleanupTokens();
            this.logger.info(`Cleaned up ${count} tokens`);
            return count;
        } catch (error) {
            this.logger.error('Failed to clean up tokens', { error: error.message });
            throw new AuthError(`Failed to clean up tokens: ${error.message}`, {
                cause: error
            });
        }
    }
}

export default AuthService; 