# Server Startup Guide

## Quick Start
The easiest way to start the server is by using the provided start script:

```bash
./start-server.sh
```

This script ensures the server is started from the correct directory with the proper environment variables.

## Manual Start
If you need to start the server manually, follow these steps:

1. Always navigate to the backend directory first:
   ```bash
   cd backend
   ```

2. Start the server with the correct port:
   ```bash
   PORT=3081 npm run start
   ```

## Checking Server Status
To verify the server is running correctly:

```bash
curl http://localhost:3081/api/v1/health
```

You should see a JSON response indicating the server is healthy.

## Troubleshooting

### Port Issues
If the server fails to start due to port conflicts:
- Check that no other services are using port 3081
- Kill any existing node processes: `pkill -f "node src/index.js"`
- Try using an alternative port: `PORT=3082 npm run start`

### Environment Variables
- All environment variables should be defined in `backend/.env`
- Do NOT create `.env` files in the root directory

### Server Won't Start
If the server won't start:
1. Check the logs for errors
2. Ensure all dependencies are installed: `cd backend && npm install`
3. Verify that the Supabase credentials are correct in `backend/.env`

## Available URLs
When the server is running:
- API: http://localhost:3081/api/v1
- API Documentation: http://localhost:3081/api-docs
- API Tester UI: http://localhost:3081/tester 