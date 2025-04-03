# Email Verification System

This document explains how the email verification system works in our application and how to set it up.

## Overview

The email verification system allows users to verify their email addresses after registration. This helps ensure that users provide valid email addresses and can receive communications from the application.

The system consists of:

1. **Database Structure**: Email verification fields in the `users` table
2. **Email Service**: Integration with SendGrid for sending emails
3. **API Endpoints**: Routes for verifying emails and requesting verification emails
4. **Token Generation**: Secure token generation and verification for email links

## Setup Requirements

### 1. Configure SendGrid

To use the email verification system, you need a [SendGrid](https://sendgrid.com/) account:

1. Sign up for SendGrid and create an API key
2. Add the API key to your `.env` file:
   ```
   SENDGRID_API_KEY=your_api_key_here
   EMAIL_FROM=your_verified_sender_email@domain.com
   FRONTEND_URL=https://your-frontend-url.com
   ```

The `EMAIL_FROM` address must be a verified sender in your SendGrid account.

### 2. Database Migration

The system requires specific fields in the `users` table:

- `email_verification_token`: Stores the hashed verification token
- `email_verification_token_expires`: Timestamp when the token expires
- `is_email_verified`: Boolean flag indicating verification status

These fields are added via the migration file `20240602000000_add_email_verification.sql`.

## How It Works

### 1. Registration Process

When a user registers:

1. A Supabase authentication account is created
2. A verification token is generated
3. The token is hashed and stored in the database along with its expiration time
4. An email with the verification link is sent to the user

### 2. Verification Process

When a user clicks the verification link:

1. The frontend redirects to a verification page with the token in the URL
2. The frontend calls the `/api/v1/auth/verify-email?token={token}` endpoint
3. The backend verifies the token against the hashed value in the database
4. If valid, the user's email is marked as verified
5. A welcome email is sent to the user

### 3. Resending Verification Emails

If a user doesn't receive or loses the verification email:

1. They can request a new verification email via the frontend
2. The frontend calls `/api/v1/auth/send-verification-email` with the user's email
3. A new token is generated, stored, and sent to the user

## API Endpoints

### Verify Email

```
GET /api/v1/auth/verify-email?token={token}
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Email verified successfully"
}
```

**Response (Error - 400):**
```json
{
  "status": "error",
  "message": "Invalid or expired verification token"
}
```

### Request Verification Email

```
POST /api/v1/auth/send-verification-email
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Verification email sent successfully"
}
```

## Frontend Integration

The frontend should implement:

1. A verification page that extracts the token from the URL and calls the verify endpoint
2. A form or button for users to request a new verification email
3. UI elements to display the verification status and guide users through the process

Example verification page URL:
```
https://your-frontend-url.com/verify-email?token=abc123def456
```

## Security Considerations

1. Tokens are generated using cryptographically secure methods
2. Only hashed tokens are stored in the database
3. Tokens have a 24-hour expiration time
4. Verification requests are rate-limited
5. The system doesn't reveal if an email address exists in the system

## Testing

To test the system:

1. Create a test user account
2. Check the logs for the verification link (in development mode)
3. Visit the verification link
4. Confirm that the user's email is marked as verified in the database

For automated testing, use environment variables to disable actual email sending in test environments.

## Troubleshooting

- **Emails not sending**: Check SendGrid API key and sender verification status
- **Verification tokens not working**: Verify token expiration time and database connection
- **Frontend integration issues**: Check URL formatting and API endpoint paths

Contact the backend team for further assistance with email verification issues. 