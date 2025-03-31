# AI Fight Club API with PM2

This document explains how to run and manage the AI Fight Club API using PM2, a process manager for Node.js applications.

## Prerequisites

1. Node.js (v16+ recommended)
2. npm (v7+ recommended)
3. PM2 (install globally with `npm install -g pm2`)

## Getting Started

### Initial Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and update the values as needed:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Starting the Application

You can start the application using either of the following methods:

**Using our script:**
```bash
./start.sh
```

**Using npm script:**
```bash
npm run pm2:start
```

This will start the application in development mode using PM2.

### Stopping the Application

```bash
npm run pm2:stop
```
or
```bash
./stop.sh
```

### Restarting the Application

```bash
npm run pm2:restart
```
or
```bash
./restart.sh
```

### Viewing Logs

```bash
npm run pm2:logs
```
or directly using PM2:
```bash
pm2 logs ai-fight-club-api
```

### Monitoring the Application

You can use PM2's built-in monitoring:

```bash
npm run pm2:monitor
```
or
```bash
pm2 monit
```

### Checking Status

To check the status of the application:

```bash
npm run pm2:status
```
or
```bash
pm2 status
```

## Available Endpoints

When the application is running, the following endpoints are available:

- **API Endpoints**: http://localhost:3000/api/v1/
- **Swagger Documentation**: http://localhost:3000/api-docs/
- **API Tester UI**: http://localhost:3000/tester/

## Environment Configuration

The application is configured to run in different environments:

- **Development**: Default environment with mock data and debugging
- **Testing**: Used for running tests on port 3001
- **Production**: Optimized for production use

To switch environments, use:

```bash
pm2 start ecosystem.config.js --env production
```

## Troubleshooting

If you encounter any issues:

1. Check the logs:
   ```bash
   pm2 logs ai-fight-club-api
   ```

2. Try restarting with:
   ```bash
   pm2 restart ai-fight-club-api
   ```

3. If all else fails, delete and restart:
   ```bash
   pm2 delete ai-fight-club-api
   ./start.sh
   ```

## Additional PM2 Commands

- Save current process list:
  ```bash
  pm2 save
  ```

- Setup PM2 to start on system boot:
  ```bash
  pm2 startup
  ```

- List all processes:
  ```bash
  pm2 list
  ```

- Get process details:
  ```bash
  pm2 show ai-fight-club-api
  ```

- Monitor CPU/Memory usage:
  ```bash
  pm2 monit
  ``` 