# Managing Environment Variables in Codespaces

Since your project contains sensitive information in environment variables (API keys, database credentials, etc.), it's important to handle them securely in GitHub Codespaces.

## Options for Managing Environment Variables

### 1. Using GitHub Codespaces Secrets (Recommended)

For sensitive values (API keys, passwords), use GitHub Codespaces Secrets:

1. Go to your GitHub repository
2. Click on Settings > Secrets and variables > Codespaces
3. Click "New repository secret"
4. Add your secrets (e.g., OPENAI_API_KEY, SUPABASE_KEY, etc.)

These secrets will be automatically available as environment variables in your Codespace.

To use them in your projects, update your `.env` files to reference these variables:

```
OPENAI_API_KEY=${OPENAI_API_KEY}
SUPABASE_KEY=${SUPABASE_KEY}
```

### 2. Using .env Files (For Development Only)

For non-sensitive or development-only variables, you can use .env files:

1. The setup script will create .env files from templates automatically
2. Edit these files manually after creating your Codespace
3. Never commit these files with real values to your repository

### 3. Using Environment Variables in devcontainer.json

For variables that should be available immediately when your Codespace starts:

```json
{
  "containerEnv": {
    "NODE_ENV": "development",
    "PORT": "3080"
  }
}
```

## Environment Files for Each Project

Your workspace contains multiple projects, each potentially needing its own environment variables:

- **Root**: Used for global variables
- **Backend**: Database credentials, API keys, server configuration
- **Frontend**: API URLs and frontend-specific settings
- **API Tester UI**: Configuration for testing tools
- **Admin**: Administrative settings

## Security Best Practices

1. **Never commit real API keys or credentials** to your repository
2. Use GitHub Codespaces Secrets for all sensitive values
3. Keep templates with placeholder values for documentation
4. Consider using a `.env.vault` approach for additional security
5. Regularly rotate sensitive credentials

## Setting Up Environment Variables for a New Codespace

When you create a new Codespace:

1. The setup script will create .env files from templates
2. Any GitHub Codespaces Secrets will be automatically available
3. Edit the generated .env files to add any missing values
4. Restart services to pick up the new environment variables

For detailed instructions on GitHub Codespaces Secrets, see the [official documentation](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-encrypted-secrets-for-your-codespaces). 