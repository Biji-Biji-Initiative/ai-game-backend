# Deployment Guide

This document outlines the process for deploying the AI Fight Club API to different environments.

## Deployment Environments

The application supports the following deployment environments:

- **Development**: Local development environment
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

## Prerequisites

Before deploying, ensure you have:

1. Node.js v14+ installed
2. Access to the deployment environment
3. Required environment variables
4. Access to the Supabase project
5. OpenAI API credentials

## Environment Variables

Each environment requires specific environment variables. Create a `.env` file for local development or configure these in your hosting platform:

```
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORGANIZATION=your_organization_id_if_applicable

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Settings
PORT=3000
NODE_ENV=[development|staging|production]
LOG_LEVEL=[debug|info|warn|error]

# Optional Settings
CORS_ORIGIN=https://your-frontend-domain.com
```

## Deployment Methods

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Manual Deployment

Build and run the application:

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm start
```

### Containerized Deployment

The application includes a Dockerfile for containerized deployment:

```bash
# Build the Docker image
docker build -t ai-fight-club-api .

# Run the container
docker run -p 3000:3000 --env-file .env.production ai-fight-club-api
```

### Platform-Specific Deployments

#### Heroku

```bash
# Login to Heroku
heroku login

# Create a Heroku app
heroku create ai-fight-club-api

# Configure environment variables
heroku config:set OPENAI_API_KEY=your_openai_api_key
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_KEY=your_supabase_key
heroku config:set NODE_ENV=production

# Deploy the application
git push heroku main
```

#### Vercel

1. Connect your repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Deploy using the Vercel dashboard or CLI

```bash
# Using Vercel CLI
vercel
```

#### AWS Elastic Beanstalk

1. Create an Elastic Beanstalk environment
2. Configure environment variables
3. Deploy using the AWS CLI or console

```bash
# Using AWS CLI
eb init
eb create
eb deploy
```

## Database Migrations

Before deploying, ensure database migrations are applied:

```bash
# Apply migrations
npm run db:migrate
```

For Supabase, you can also manage migrations through the Supabase dashboard.

## Post-Deployment Verification

After deployment, verify that:

1. The API is accessible at the expected URL
2. Health check endpoint returns a successful response
3. API endpoints are functioning correctly
4. Logs show no critical errors

```bash
# Check the health endpoint
curl https://your-deployed-api.com/api/health
```

## Rollback Procedure

If issues are encountered after deployment:

1. Identify the issue through logs and monitoring
2. Revert to the previous version (platform-specific)
3. Apply any necessary database rollbacks
4. Verify the rollback was successful

## Monitoring and Logging

Monitor the deployed application using:

1. Application logs
2. Error tracking services
3. Performance monitoring tools

Logs are output to:
- Console (in development)
- Log files (in production)
- Log aggregation services (if configured) 