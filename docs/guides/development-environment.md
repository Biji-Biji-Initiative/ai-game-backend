# Development Environment Setup Guide

This guide provides step-by-step instructions for setting up your development environment for working on the AI Gaming Backend project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Setup](#repository-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [External Service Configuration](#external-service-configuration)
- [Running the Application](#running-the-application)
- [Development Tools](#development-tools)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before beginning, ensure you have the following installed on your system:

- **Node.js** (v16.x or higher)
- **npm** (v8.x or higher)
- **Git** (v2.30 or higher)
- **MongoDB** (v5.0 or higher)
- **Docker** (optional, for containerized development)
- **Visual Studio Code** (recommended) or another code editor

### Installing Prerequisites

#### On macOS:

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and npm
brew install node@16

# Install Git
brew install git

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@5.0

# Start MongoDB service
brew services start mongodb-community@5.0

# Install Docker (optional)
brew install --cask docker
```

#### On Windows:

1. **Node.js and npm**: Download from [Node.js website](https://nodejs.org/)
2. **Git**: Download from [Git website](https://git-scm.com/download/win)
3. **MongoDB**: Download from [MongoDB website](https://www.mongodb.com/try/download/community)
4. **Docker**: Download from [Docker website](https://www.docker.com/products/docker-desktop/)

#### On Ubuntu/Debian:

```bash
# Update package lists
sudo apt update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install git

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Docker (optional)
sudo apt-get install docker-ce docker-ce-cli containerd.io
```

## Repository Setup

1. **Clone the repository**:

```bash
git clone https://github.com/yourusername/ai-gaming-backend.git
cd ai-gaming-backend
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up Git hooks** (to ensure code quality):

```bash
npm run prepare
```

## Environment Configuration

1. **Copy the example environment file**:

```bash
cp .env.example .env
```

2. **Edit the `.env` file** with your local configuration:

```
# Server Configuration
PORT=9000
NODE_ENV=development
API_VERSION=v1

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/ai_gaming

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=24h

# External Services
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key

# Logging
LOG_LEVEL=debug
```

## Database Setup

1. **Ensure MongoDB is running**:

```bash
# Check MongoDB status
mongo --eval "db.serverStatus()"
```

2. **Initialize the database** (creates required collections and indexes):

```bash
npm run db:setup
```

3. **Seed the database** with sample data (optional):

```bash
npm run db:seed
```

## External Service Configuration

### Supabase
If your project uses Supabase for authentication or storage:

1. Sign up for a Supabase account at [Supabase](https://supabase.com/)
2. Create a new project
3. Navigate to the "Settings" > "API" in your Supabase dashboard
4. Copy your API URL and anon key to your `.env` file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

#### OpenAI API (for AI Game Features)
If your project uses OpenAI's API:

1. Go to OpenAI's website and sign up for an account
2. Navigate to the "API Keys" section in your dashboard
3. Create a new API key
4. Add your API key to your `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

## Running the Application

### Standard Development Mode

```bash
# Start the application in development mode
npm run dev

# The server will be available at http://localhost:9000
```

### Docker Development Mode (Optional)

```bash
# Build and start containers
docker-compose up -d

# The server will be available at http://localhost:9000
```

### Available Scripts

- `npm run dev`: Start the development server with hot reloading
- `npm run build`: Build the project
- `npm start`: Start the production server
- `npm test`: Run all tests
- `npm run test:unit`: Run unit tests only
- `npm run test:integration`: Run integration tests only
- `npm run lint`: Run linting checks
- `npm run lint:fix`: Fix linting issues automatically

## Development Tools

### Recommended VS Code Extensions

For an optimal development experience, install these VS Code extensions:

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **GitLens**: Enhanced Git integration
- **MongoDB for VS Code**: MongoDB integration
- **REST Client**: Test API endpoints from VS Code
- **Thunder Client**: API client alternative

### API Testing

The project includes Swagger documentation for API testing:

1. Start the development server
2. Navigate to `http://localhost:9000/api-docs` in your browser

Alternatively, you can use Postman:

1. Import the Postman collection from `docs/postman/AI_Gaming_API.postman_collection.json`
2. Set up environment variables for your local setup

## Troubleshooting

### Common Issues

#### MongoDB Connection Failure

**Symptoms**: Server fails to start with MongoDB connection errors

**Solution**:
1. Ensure MongoDB service is running
2. Check your MongoDB connection string in `.env`
3. Verify MongoDB port is not blocked by firewall

```bash
# Restart MongoDB service
sudo systemctl restart mongod   # Linux
brew services restart mongodb-community  # macOS
```

#### Node.js Version Issues

**Symptoms**: `Error: Cannot find module` or unexpected syntax errors

**Solution**: Ensure you're using Node.js v16 or higher

```bash
# Check Node.js version
node -v

# If needed, install nvm to manage Node.js versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 16
nvm use 16
```

#### Port Already in Use

**Symptoms**: Error message about port 9000 already in use

**Solution**: Change port in `.env` or kill the process using port 9000

```bash
# Find process using port 9000
lsof -i :9000   # macOS/Linux
netstat -ano | findstr :9000  # Windows

# Kill the process
kill -9 <PID>   # macOS/Linux
taskkill /PID <PID> /F   # Windows
```

### Getting Help

If you encounter issues not covered here, please:

1. Check the [Troubleshooting Guide](./troubleshooting.md) for more detailed solutions
2. Ask for help in the #dev-support Slack channel
3. Create a GitHub issue with detailed error information

## Next Steps

After setting up your development environment:

1. Complete the [Onboarding Guide](./onboarding-guide.md)
2. Explore the [Architecture Documentation](../architecture/README.md)
3. Review the [API Documentation](../api/README.md)
4. Read the [Contribution Workflow](./contribution-workflow.md) 