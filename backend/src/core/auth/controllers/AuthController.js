import { withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { AuthError, AuthNotFoundError, AuthValidationError, AuthProcessingError } from "#app/core/auth/errors/AuthErrors.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
'use strict';
// Error mappings for controllers
const authControllerErrorMappings = [
    { errorClass: AuthNotFoundError, statusCode: 404 },
    { errorClass: AuthValidationError, statusCode: 400 },
    { errorClass: AuthProcessingError, statusCode: 500 },
    { errorClass: AuthError, statusCode: 500 },
];
/**
 * Auth Controller
 *
 * Authentication controller fully integrated with Supabase
 */
/**
 *
 */
class AuthController {
    /**
     * Create a new AuthController
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.userRepository - Repository for user operations
     * @param {Object} dependencies.supabase - Supabase client
     * @param {Object} dependencies.logger - Logger instance
     */
    /**
     * Method constructor
     */
    constructor({ userRepository, supabase, logger }) {
        // In production, fail fast if required dependencies are missing
        const isProd = process.env.NODE_ENV === 'production';
        
        if (!userRepository) {
            if (isProd) {
                throw new ConfigurationError('userRepository is required for AuthController in production mode', {
                    service: 'AuthController',
                    dependency: 'userRepository'
                });
            } else {
                throw new Error('userRepository is required for AuthController');
            }
        }
        
        if (!supabase) {
            if (isProd) {
                throw new ConfigurationError('supabase client is required for AuthController in production mode', {
                    service: 'AuthController',
                    dependency: 'supabase'
                });
            } else {
                throw new Error('supabase client is required for AuthController');
            }
        }
        
        this.userRepository = userRepository;
        this.supabase = supabase;
        this.logger = logger;
        // Apply standardized error handling to methods using withControllerErrorHandling
        this.login = withControllerErrorHandling(
            this.login.bind(this), 
            {
                methodName: 'login',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
        this.signup = withControllerErrorHandling(
            this.signup.bind(this), 
            {
                methodName: 'signup',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
        this.logout = withControllerErrorHandling(
            this.logout.bind(this), 
            {
                methodName: 'logout',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
        this.forgotPassword = withControllerErrorHandling(
            this.forgotPassword.bind(this), 
            {
                methodName: 'forgotPassword',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
        this.resetPassword = withControllerErrorHandling(
            this.resetPassword.bind(this), 
            {
                methodName: 'resetPassword',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
        this.requestPasswordReset = withControllerErrorHandling(
            this.requestPasswordReset.bind(this), 
            {
                methodName: 'requestPasswordReset',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
        this.refreshToken = withControllerErrorHandling(
            this.refreshToken.bind(this), 
            {
                methodName: 'refreshToken',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
    }
    /**
     * Login with Supabase authentication
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    /**
     * Method login
     */
    async login(req, res, next) {
        const { email, password } = req.body;
        if (!email || !password) {
            this.logger.warn('Login attempt with missing credentials', {
                hasEmail: !!email,
                hasPassword: !!password
            });
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required'
            });
        }
        this.logger.debug('Login attempt', { email });
        // Use Supabase auth to sign in
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            this.logger.warn('Login failed', {
                email,
                error: error.message,
                errorCode: error.code
            });
            return res.status(401).json({
                status: 'error',
                message: error.message
            });
        }
        // Get user profile from our database or create if not exists
        let user = await this.userRepository.findByEmail(email);
        if (!user) {
            // Create user record if it exists in Supabase but not in our DB
            const userData = {
                email,
                fullName: data.user.user_metadata?.full_name || 'User',
                supabaseId: data.user.id,
                emailVerified: data.user.email_confirmed_at ? true : false,
                lastLogin: new Date().toISOString()
            };
            user = await this.userRepository.save(userData);
            this.logger.info('Created user record for existing Supabase user', { email });
        }
        else {
            // Update last login time
            await this.userRepository.updateUser(user.id, {
                lastLogin: new Date().toISOString(),
                supabaseId: user.supabaseId || data.user.id // Ensure supabaseId is set
            });
        }
        const accessToken = data.session.access_token;
        const refreshToken = data.session.refresh_token;
        // Set secure cookie with refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
        });
        this.logger.info('User logged in successfully', { email, userId: user.id });
        return res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    roles: user.roles || [],
                    profileComplete: Boolean(user.fullName && user.professionalTitle)
                },
                accessToken
            }
        });
    }
    /**
     * Register a new user with Supabase
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    /**
     * Method signup
     */
    async signup(req, res, next) {
        const { email, password, fullName } = req.body;
        if (!email || !password) {
            this.logger.warn('Signup attempt with missing credentials', {
                hasEmail: !!email,
                hasPassword: !!password
            });
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required'
            });
        }
        this.logger.debug('Signup attempt', { email });
        // Check if user already exists in our database
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            this.logger.warn('Signup attempt for existing user', { email });
            return res.status(400).json({
                status: 'error',
                message: 'User with this email already exists'
            });
        }
        // Register the user with Supabase auth
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName || 'User'
                },
                emailRedirectTo: `${process.env.FRONTEND_URL}/auth/email-confirmed`
            }
        });
        if (error) {
            this.logger.error('Error in signup with Supabase', {
                email,
                error: error.message,
                errorCode: error.code
            });
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
        // Create user record in our database
        const userData = {
            email,
            fullName: fullName || 'User',
            supabaseId: data.user.id,
            emailVerified: false,
            roles: ['user'],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        const newUser = await this.userRepository.save(userData);
        this.logger.info('Created new user', { email, userId: newUser.id });
        // Set secure cookie with refresh token if session exists
        if (data.session) {
            res.cookie('refreshToken', data.session.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
            });
        }
        return res.status(201).json({
            status: 'success',
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    roles: newUser.roles || [],
                    emailVerified: data.user.email_confirmed_at ? true : false
                },
                accessToken: data.session?.access_token,
                message: data.session ? 'Signup successful' : 'Confirmation email sent, please verify your email'
            }
        });
    }
    /**
     * Logout user and invalidate session
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    /**
     * Method logout
     */
    async logout(req, res, next) {
        this.logger.debug('Logout attempt');
        // Clear the refresh token cookie
        res.clearCookie('refreshToken');
        // Invalidate the session in Supabase
        await this.supabase.auth.signOut();
        this.logger.info('User logged out successfully');
        return res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    }
    /**
     * Reset password request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    /**
     * Method requestPasswordReset
     */
    async requestPasswordReset(req, res, next) {
        const { email } = req.body;
        if (!email) {
            this.logger.warn('Password reset request with missing email');
            return res.status(400).json({
                status: 'error',
                message: 'Email is required'
            });
        }
        this.logger.debug('Password reset request', { email });
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
        });
        if (error) {
            this.logger.warn('Password reset request failed', {
                email,
                error: error.message,
                errorCode: error.code
            });
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
        this.logger.info('Password reset email sent', { email });
        return res.status(200).json({
            status: 'success',
            message: 'Password reset email sent'
        });
    }
    /**
     * Refresh the access token using refresh token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    /**
     * Method refreshToken
     */
    async refreshToken(req, res, next) {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            this.logger.warn('Token refresh attempt with missing token');
            return res.status(401).json({
                status: 'error',
                message: 'Refresh token not found'
            });
        }
        this.logger.debug('Token refresh attempt');
        const { data, error } = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken
        });
        if (error) {
            // Clear invalid token
            res.clearCookie('refreshToken');
            this.logger.warn('Invalid refresh token', {
                error: error.message,
                errorCode: error.code
            });
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired refresh token'
            });
        }
        // Update refresh token cookie
        res.cookie('refreshToken', data.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
        });
        this.logger.info('Token refreshed successfully');
        return res.status(200).json({
            status: 'success',
            data: {
                accessToken: data.session.access_token
            }
        });
    }
    /**
     * Handle forgot password request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    async forgotPassword(req, res, next) {
        const { email } = req.body;
        
        if (!email) {
            this.logger.warn('Forgot password request with missing email');
            return res.status(400).json({
                status: 'error',
                message: 'Email is required'
            });
        }
        
        this.logger.debug('Forgot password request', { email });
        
        // Use Supabase's built-in password reset functionality
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
        });
        
        if (error) {
            this.logger.warn('Forgot password request failed', {
                email,
                error: error.message,
                errorCode: error.code
            });
            
            // Don't reveal if the email exists or not for security reasons
            return res.status(200).json({
                status: 'success',
                message: 'If a user with that email exists, a password reset link has been sent'
            });
        }
        
        this.logger.info('Password reset email sent', { email });
        
        return res.status(200).json({
            status: 'success',
            message: 'Password reset instructions sent to your email'
        });
    }
    
    /**
     * Reset password with token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    async resetPassword(req, res, next) {
        const { password } = req.body;
        const { token } = req.query;
        
        if (!password) {
            this.logger.warn('Reset password attempt with missing password');
            return res.status(400).json({
                status: 'error',
                message: 'New password is required'
            });
        }
        
        if (!token) {
            this.logger.warn('Reset password attempt with missing token');
            return res.status(400).json({
                status: 'error',
                message: 'Reset token is required'
            });
        }
        
        this.logger.debug('Reset password attempt');
        
        // Update the user's password with Supabase
        const { error } = await this.supabase.auth.updateUser({
            password: password
        });
        
        if (error) {
            this.logger.error('Password reset failed', {
                error: error.message,
                errorCode: error.code
            });
            
            return res.status(400).json({
                status: 'error',
                message: error.message || 'Failed to reset password'
            });
        }
        
        this.logger.info('Password reset successful');
        
        return res.status(200).json({
            status: 'success',
            message: 'Password has been reset successfully'
        });
    }
}
export default AuthController;
