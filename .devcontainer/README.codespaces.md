# Using GitHub Codespaces

This project is fully configured to work with GitHub Codespaces, providing you with a complete development environment in the cloud.

## Getting Started with Codespaces

1. **Create a new Codespace**:
   - Click the green "Code" button on the GitHub repository
   - Select the "Codespaces" tab
   - Click "Create codespace on main"

2. **Wait for setup to complete**:
   - The container will be built and configured automatically
   - All dependencies will be installed for all projects
   - This may take a few minutes the first time

3. **Set up environment variables**:
   - The setup script will create basic .env files from templates
   - For sensitive values, use GitHub Codespaces Secrets (see [ENV-VARIABLES.md](ENV-VARIABLES.md))
   - Review and update the .env files in each project directory

## Project Structure

This workspace contains multiple projects:

- **Backend** (`/backend`): The API server
- **Frontend** (`/frontend`): The web client
- **API Tester UI** (`/api-tester-ui`): UI for testing APIs
- **Admin** (`/admin`): Administrative interface

Each project may have its own dependencies and environment variables.

## Running the Projects

### Backend Server

```bash
cd backend
npm run dev
```

### Frontend Application

```bash
cd frontend
npm run dev
```

### API Tester UI

```bash
cd api-tester-ui
npm start
```

### Admin Interface

```bash
cd admin
npm start
```

You can run multiple projects simultaneously by opening different terminal windows in VS Code.

## Accessing the Applications

The following ports are forwarded automatically:

- **3000**: Frontend application
- **3001**: Additional frontend port
- **3080**: Backend API server
- **3081**: API Tester UI
- **3082**: Test port
- **9000**: Production port

Access these services via the "Ports" tab in VS Code.

## Environment Variables

This project uses multiple .env files for configuration:

- **Root**: `.env` in the workspace root
- **Backend**: `backend/.env`
- **Frontend**: `frontend/.env.local`
- **API Tester UI**: Uses the root .env file

See [ENV-VARIABLES.md](ENV-VARIABLES.md) for detailed instructions on managing environment variables securely.

## Troubleshooting

If you encounter any issues:

1. Check that all environment variables are set correctly in each project
2. Ensure all services are running in their own terminal
3. Review the terminal output for any error messages
4. Try restarting the services

For database or external API issues, verify that:
- Your Supabase credentials are correct
- Your OpenAI API key is valid
- All required services are accessible from Codespaces

## Persistence

Your Codespace will persist your changes across sessions. If you need to start fresh:

1. Delete your current Codespace from the GitHub Codespaces dashboard
2. Create a new Codespace

## Additional Resources

- [GitHub Codespaces documentation](https://docs.github.com/en/codespaces)
- [Managing Codespaces Secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-encrypted-secrets-for-your-codespaces)
- [VS Code in Codespaces](https://code.visualstudio.com/docs/remote/codespaces)
- [Developing in Codespaces](https://docs.github.com/en/codespaces/developing-in-codespaces) 