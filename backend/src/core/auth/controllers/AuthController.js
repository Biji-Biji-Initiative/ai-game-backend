import { withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { AuthError, AuthNotFoundError, AuthValidationError, AuthProcessingError } from "#app/core/auth/errors/authErrors.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
import User from "#app/core/user/models/User.js";
import { v4 as uuidv4 } from 'uuid';
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
     * @param {Object} dependencies.emailService - Email service for sending emails
     * @param {Object} dependencies.authService - Authentication service
     */
    /**
     * Method constructor
     */
    constructor({ userRepository, supabase, logger, emailService, authService }) {
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
        
        if (!authService) {
            if (isProd) {
                throw new ConfigurationError('authService is required for AuthController in production mode', {
                    service: 'AuthController',
                    dependency: 'authService'
                });
            } else {
                throw new Error('authService is required for AuthController');
            }
        }
        
        this.userRepository = userRepository;
        this.supabase = supabase;
        this.logger = logger;
        this.emailService = emailService;
        this.authService = authService;
        
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
        this.verifyEmail = withControllerErrorHandling(
            this.verifyEmail.bind(this), 
            {
                methodName: 'verifyEmail',
                domainName: 'auth',
                logger: this.logger,
                errorMappings: authControllerErrorMappings
            }
        );
        this.sendVerificationEmail = withControllerErrorHandling(
            this.sendVerificationEmail.bind(this), 
            {
                methodName: 'sendVerificationEmail',
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
        
        try {
            // Use Supabase auth to sign in - focus only on authentication
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
            
            // Authentication successful - user exists in Supabase
            const accessToken = data.session.access_token;
            const refreshToken = data.session.refresh_token;
            
            // Capture client information for security tracking
            const clientInfo = {
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            
            // Store refresh token with client info for security tracking
            try {
                await this.authService.generateRefreshToken({
                    userId: data.user.id,
                    token: refreshToken,
                    ipAddress: clientInfo.ipAddress,
                    userAgent: clientInfo.userAgent
                });
            } catch (tokenError) {
                // Log but don't fail the login if token storage fails
                this.logger.error('Failed to store refresh token', {
                    userId: data.user.id,
                    error: tokenError.message
                });
            }
            
            // Set secure cookie with refresh token
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
            });
            
            // Get basic user info from Supabase
            const userInfo = {
                email: data.user.email,
                fullName: data.user.user_metadata?.full_name || 'User',
                emailVerified: data.user.email_confirmed_at ? true : false,
            };
            
            this.logger.info('User authenticated successfully', { email });
            
            // Return auth token and basic user info
            return res.status(200).json({
                status: 'success',
                data: {
                    user: userInfo,
                    accessToken
                }
            });
        } catch (error) {
            this.logger.error('Unexpected error during login', {
                email,
                error: error.message
            });
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred during login'
            });
        }
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
        
        try {
            // Check if user already exists in Supabase (via lookup)
            const { data: existingUser } = await this.supabase.auth.admin.getUserByEmail(email);
            if (existingUser) {
                this.logger.warn('Signup attempt for existing user', { email });
                return res.status(400).json({
                    status: 'error',
                    message: 'User with this email already exists'
                });
            }
            
            // Register the user with Supabase auth - focus on authentication
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
            
            // Set secure cookie with refresh token if session exists
            if (data.session) {
                const refreshToken = data.session.refresh_token;
                
                // Capture client information for security tracking
                const clientInfo = {
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent']
                };
                
                // Store refresh token with client info for security tracking
                try {
                    await this.authService.generateRefreshToken({
                        userId: data.user.id,
                        token: refreshToken,
                        ipAddress: clientInfo.ipAddress,
                        userAgent: clientInfo.userAgent
                    });
                } catch (tokenError) {
                    // Log but don't fail the signup if token storage fails
                    this.logger.error('Failed to store refresh token', {
                        userId: data.user.id,
                        error: tokenError.message
                    });
                }
                
                res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
                });
            }
            
            // Basic user info from Supabase
            const userInfo = {
                email: data.user.email,
                fullName: fullName || 'User',
                emailVerified: data.user.email_confirmed_at ? true : false
            };
            
            // Generate verification token and send email for our custom verification
            let verificationSent = false;
            try {
                // Only if the EmailService is available and configured
                if (this.emailService && this.emailService.isEnabled) {
                    // Generate verification token
                    const token = this.emailService.generateVerificationToken();
                    const hashedToken = this.emailService.hashToken(token);
                    
                    // Set expiration time (24 hours from now)
                    const expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + 24);
                    
                    // Save token to database for the user
                    const { error: updateError } = await this.supabase
                        .from('users')
                        .update({
                            email_verification_token: hashedToken,
                            email_verification_token_expires: expiresAt.toISOString(),
                            is_email_verified: false,
                            updated_at: new Date().toISOString()
                        })
                        .eq('email', email);
                        
                    if (updateError) {
                        this.logger.error('Failed to save verification token', {
                            email,
                            error: updateError.message,
                            code: updateError.code
                        });
                    } else {
                        // Send verification email
                        await this.emailService.sendVerificationEmail({
                            toEmail: email,
                            token: token,
                            fullName: fullName
                        });
                        verificationSent = true;
                        this.logger.info('Verification email sent during signup', { email });
                    }
                }
            } catch (emailError) {
                this.logger.error('Failed to send verification email during signup', {
                    email,
                    error: emailError.message
                });
                // Don't fail signup if email sending fails
            }
            
            this.logger.info('User signup successful', { 
                email,
                verificationEmailSent: verificationSent
            });
            
            return res.status(201).json({
                status: 'success',
                data: {
                    user: userInfo,
                    accessToken: data.session?.access_token,
                    message: verificationSent ? 
                        'Signup successful. Please check your email to verify your account.' : 
                        (data.session ? 'Signup successful' : 'Confirmation email sent, please verify your email')
                }
            });
        } catch (error) {
            this.logger.error('Unexpected error during signup', {
                email,
                error: error.message
            });
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred during signup'
            });
        }
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
        
        // Get the refresh token from cookie or request body
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        
        // Revoke the refresh token if it exists
        if (refreshToken) {
            try {
                await this.authService.revokeRefreshToken(refreshToken);
                this.logger.debug('Refresh token revoked successfully');
            } catch (error) {
                // Log but don't fail the logout if token revocation fails
                this.logger.error('Failed to revoke refresh token', { error: error.message });
            }
        }
        
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
        // Try to get refresh token from cookies first, then from request body
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        
        if (!refreshToken) {
            this.logger.warn('Token refresh attempt with missing token');
            return res.status(401).json({
                status: 'error',
                message: 'Refresh token not found',
                details: 'Please provide a refresh token in either cookies or request body'
            });
        }
        
        this.logger.debug('Token refresh attempt');
        
        try {
            // Capture client information for security tracking
            const clientInfo = {
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            
            // Use the AuthService to handle token validation and rotation
            const data = await this.authService.refreshToken(refreshToken, clientInfo);
            
            if (!data || !data.session) {
                throw new Error('Invalid response from token refresh');
            }
            
            // Update refresh token cookie if we're using cookies
            if (req.cookies?.refreshToken) {
                res.cookie('refreshToken', data.session.refresh_token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
                });
            }
            
            this.logger.info('Token refreshed successfully');
            
            return res.status(200).json({
                status: 'success',
                data: {
                    accessToken: data.session.access_token,
                    refreshToken: req.cookies?.refreshToken ? undefined : data.session.refresh_token,
                    expiresIn: 3600, // Default 1 hour for Supabase JWT tokens
                    tokenType: 'Bearer'
                }
            });
        } catch (error) {
            // Clear cookie on error as a precaution
            if (req.cookies?.refreshToken) {
                res.clearCookie('refreshToken');
            }
            
            if (error.name === 'AuthValidationError' || error.name === 'AuthNotFoundError') {
                this.logger.warn('Invalid refresh token', {
                    error: error.message,
                    name: error.name
                });
                
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid or expired refresh token',
                    code: 'AUTH_REFRESH_FAILED'
                });
            }
            
            this.logger.error('Unexpected error during token refresh', {
                error: error.message,
                stack: error.stack
            });
            
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred during token refresh'
            });
        }
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
    /**
     * Verify a user's email using the verification token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async verifyEmail(req, res, next) {
        const { token } = req.query;
        
        if (!token) {
            this.logger.warn('Email verification attempt with missing token');
            return res.status(400).json({
                status: 'error',
                message: 'Verification token is required'
            });
        }
        
        this.logger.debug('Processing email verification token');
        
        try {
            // Hash the token for comparison with stored token
            const hashedToken = this.emailService.hashToken(token);
            
            // Look up the user with this token
            const { data: users, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email_verification_token', hashedToken)
                .gt('email_verification_token_expires', new Date().toISOString());
                
            if (error) {
                this.logger.error('Database error during email verification', {
                    error: error.message,
                    code: error.code
                });
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to verify email due to a server error'
                });
            }
            
            if (!users || users.length === 0) {
                this.logger.warn('Invalid or expired verification token used');
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid or expired verification token'
                });
            }
            
            const user = users[0];
            
            // Update the user record to mark email as verified
            const { error: updateError } = await this.supabase
                .from('users')
                .update({
                    is_email_verified: true,
                    email_verification_token: null,
                    email_verification_token_expires: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
                
            if (updateError) {
                this.logger.error('Failed to update user verification status', {
                    userId: user.id,
                    error: updateError.message,
                    code: updateError.code
                });
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to verify email due to a server error'
                });
            }
            
            // Send welcome email
            try {
                await this.emailService.sendWelcomeEmail({
                    toEmail: user.email,
                    fullName: user.name
                });
            } catch (emailError) {
                // Log but don't fail the verification if welcome email fails
                this.logger.warn('Failed to send welcome email', {
                    userId: user.id,
                    error: emailError.message
                });
            }
            
            this.logger.info('Email successfully verified', { userId: user.id, email: user.email });
            
            return res.status(200).json({
                status: 'success',
                message: 'Email verified successfully'
            });
        } catch (error) {
            this.logger.error('Unexpected error during email verification', {
                error: error.message,
                stack: error.stack
            });
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred during email verification'
            });
        }
    }
    
    /**
     * Send a verification email to a user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async sendVerificationEmail(req, res, next) {
        const { email } = req.body;
        
        if (!email) {
            this.logger.warn('Email verification request with missing email');
            return res.status(400).json({
                status: 'error',
                message: 'Email address is required'
            });
        }
        
        this.logger.debug('Processing verification email request', { email });
        
        try {
            // Check if user exists
            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
                
            if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
                this.logger.error('Database error during user lookup for verification email', {
                    email,
                    error: userError.message,
                    code: userError.code
                });
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to process verification request due to a server error'
                });
            }
            
            if (!userData) {
                // Don't reveal if user exists or not for security reasons
                this.logger.info('Verification email requested for non-existent user', { email });
                return res.status(200).json({
                    status: 'success',
                    message: 'If an account exists with this email, a verification link has been sent'
                });
            }
            
            // If user is already verified, no need to send email
            if (userData.is_email_verified) {
                this.logger.info('Verification email requested for already verified user', { email });
                return res.status(200).json({
                    status: 'success',
                    message: 'If an account exists with this email, a verification link has been sent'
                });
            }
            
            // Generate verification token
            const token = this.emailService.generateVerificationToken();
            const hashedToken = this.emailService.hashToken(token);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
            
            // Update user record with verification token
            const { error: updateError } = await this.supabase
                .from('users')
                .update({
                    email_verification_token: hashedToken,
                    email_verification_token_expires: expiresAt.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userData.id);
                
            if (updateError) {
                this.logger.error('Failed to update user with verification token', {
                    userId: userData.id,
                    error: updateError.message,
                    code: updateError.code
                });
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to generate verification token due to a server error'
                });
            }
            
            // Send verification email
            await this.emailService.sendVerificationEmail({
                toEmail: email,
                token: token,
                fullName: userData.name
            });
            
            this.logger.info('Verification email sent successfully', { email });
            
            return res.status(200).json({
                status: 'success',
                message: 'Verification email sent successfully'
            });
        } catch (error) {
            this.logger.error('Unexpected error sending verification email', {
                email,
                error: error.message,
                stack: error.stack
            });
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred while sending verification email'
            });
        }
    }
}
export default AuthController;
