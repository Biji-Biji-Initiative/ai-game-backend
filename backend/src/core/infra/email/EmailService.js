'use strict';

import crypto from 'crypto';
import sendgrid from '@sendgrid/mail';

/**
 * Email Service for sending transactional emails
 * Uses SendGrid API for email delivery
 */
export class EmailService {
    /**
     * Create a new EmailService instance
     * @param {Object} options - Service options
     * @param {Object} options.config - Application configuration
     * @param {Object} options.logger - Logger instance
     */
    constructor({ config, logger }) {
        this.config = config;
        this.logger = logger;
        
        // Configure SendGrid if API key is available
        if (config.sendgrid && config.sendgrid.apiKey) {
            sendgrid.setApiKey(config.sendgrid.apiKey);
            this.enabled = true;
        } else if (process.env.SENDGRID_API_KEY) {
            sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
            this.enabled = true;
        } else {
            this.enabled = false;
            this.logger.warn('SendGrid API key not configured. Email sending is disabled.');
        }
        
        // Get sender email from config or env vars
        this.sender = (config.sendgrid && config.sendgrid.from) || 
                      process.env.EMAIL_FROM || 
                      'noreply@yourdomain.com';
                      
        // Get frontend URL for email links
        this.frontendUrl = (config.frontend && config.frontend.url) || 
                          process.env.FRONTEND_URL || 
                          'http://localhost:3000';
    }
    
    /**
     * Send an email
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text body
     * @param {string} options.html - HTML body (optional)
     * @returns {Promise<Object>} SendGrid response
     */
    async sendEmail({ to, subject, text, html }) {
        if (!this.enabled) {
            this.logger.warn('Attempted to send email while email service is disabled', { to, subject });
            return { success: false, message: 'Email service is disabled' };
        }
        
        try {
            const msg = {
                to,
                from: this.sender,
                subject,
                text,
                html: html || text
            };
            
            const response = await sendgrid.send(msg);
            this.logger.info('Email sent successfully', { to, subject });
            return { success: true, response };
        } catch (error) {
            this.logger.error('Failed to send email', { 
                to, 
                subject, 
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Send a welcome email to a newly verified user
     * @param {Object} options - Email options
     * @param {string} options.toEmail - User's email
     * @param {string} options.fullName - User's name
     * @returns {Promise<Object>} SendGrid response
     */
    async sendWelcomeEmail({ toEmail, fullName }) {
        const subject = 'Welcome to our platform!';
        const text = `
            Hello ${fullName || 'there'},
            
            Thank you for verifying your email address. Your account is now fully activated.
            
            You can now access all features of our platform.
            
            Best regards,
            The Team
        `;
        
        return this.sendEmail({ to: toEmail, subject, text });
    }
    
    /**
     * Send a verification email with token link
     * @param {Object} options - Email options
     * @param {string} options.toEmail - User's email
     * @param {string} options.token - Verification token
     * @param {string} options.fullName - User's name
     * @returns {Promise<Object>} SendGrid response
     */
    async sendVerificationEmail({ toEmail, token, fullName }) {
        const verificationLink = `${this.frontendUrl}/verify-email?token=${token}`;
        const subject = 'Please verify your email address';
        const text = `
            Hello ${fullName || 'there'},
            
            Please verify your email address by clicking the link below:
            
            ${verificationLink}
            
            This link will expire in 24 hours.
            
            If you did not create an account, please ignore this email.
            
            Best regards,
            The Team
        `;
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Email Verification</h2>
                <p>Hello ${fullName || 'there'},</p>
                <p>Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p>Alternatively, you can copy and paste the following link into your browser:</p>
                <p style="word-break: break-all;">${verificationLink}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not create an account, please ignore this email.</p>
                <p>Best regards,<br>The Team</p>
            </div>
        `;
        
        return this.sendEmail({ to: toEmail, subject, text, html });
    }
    
    /**
     * Generate a secure random token for email verification
     * @returns {string} Random token
     */
    generateVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    /**
     * Hash a token for secure storage
     * @param {string} token - Plain token
     * @returns {string} Hashed token
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}

// Default export for the EmailService class
export default EmailService; 