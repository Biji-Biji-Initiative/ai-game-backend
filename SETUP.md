# Setup Guide

This guide will walk you through setting up the AI Fight Club API locally for development or testing.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

You will also need:

- An OpenAI API key
- A Supabase project with appropriate permissions

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-fight-club-api.git
cd ai-fight-club-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

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
NODE_ENV=development
LOG_LEVEL=info
```

You can also copy the `.env.template` file and fill in your values:

```bash
cp .env.template .env
# Now edit .env with your values
```

### 4. Database Setup

This application uses Supabase as the database provider. You need to:

1. Create a Supabase project via the Supabase dashboard
2. Run the database migrations to set up the schema

```bash
# Apply database migrations
npm run db:migrate
```

### 5. Start the Development Server

```bash
npm run dev
```

This will start the server with hot reloading enabled.

## Verify Installation

To verify that your installation is working:

1. Check that the server is running on http://localhost:3000
2. Make a request to the health check endpoint:

```bash
curl http://localhost:3000/api/health
```

You should receive a response indicating the API is running.

## Running Tests

To run the automated tests:

```bash
# Run all tests
npm test

# Run specific test groups
npm run test:unit
npm run test:integration
npm run test:e2e
```

See [TESTING.md](./TESTING.md) for more details on testing.

## Troubleshooting

### Common Issues

1. **API Key Problems**: If you see authentication errors with OpenAI, verify your API key is correct and has sufficient permissions.

2. **Database Connection Issues**: Ensure your Supabase URL and keys are correct. Check that your IP is allowed in Supabase.

3. **Port Conflicts**: If port 3000 is already in use, change the PORT value in your .env file.

### Getting Help

If you encounter any issues not covered here, please check the [GitHub Issues](https://github.com/yourusername/ai-fight-club-api/issues) or create a new issue. 