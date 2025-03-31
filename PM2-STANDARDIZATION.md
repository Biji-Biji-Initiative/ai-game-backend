# PM2 Standardization for AI Fight Club

## Overview

This project uses PM2 as the standard process manager for all services. PM2 provides:

- Process management across development and production
- Automatic restarts on crashes
- Load balancing in production
- Built-in monitoring and logging
- Process dependency management

## Quick Start

```bash
# One-time setup
./setup-pm2.sh

# Start development environment
pnpm dev

# Check status
pnpm status
```

## Architecture

The PM2 configuration uses a standardized approach:

### Process Structure

Each service runs as a separate PM2 process with:
- Consistent naming convention (`{service}-{environment}`)
- Fixed port assignments
- Dedicated log files
- Environment-specific settings

### Fixed Ports

| Service | Environment | Port |
|---------|-------------|------|
| API | Development | 3002 |
| API | Production | 3002 |
| UI Tester | Development | 5173 |
| UI Tester | Production | 5000 |

## Understanding PM2 Output

When you run `pnpm status` (which uses `pm2 status`), you'll see output like:

```
┌────┬────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name           │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ api-dev        │ fork     │ 0    │ online    │ 0.5%     │ 50.4mb   │
│ 1  │ ui-tester-dev  │ fork     │ 0    │ online    │ 0.2%     │ 36.2mb   │
└────┴────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

Understanding the columns:
- **id**: PM2 internal process ID
- **name**: Human-readable process name
- **mode**: Execution mode (fork or cluster)
- **↺**: Number of restarts (useful for debugging crashes)
- **status**: Current status (online, errored, stopped)
- **cpu**: CPU usage percentage
- **memory**: Memory consumption

## Common Commands

All commands use npm/pnpm scripts for consistency:

```bash
# Start development environment
pnpm dev

# Start production environment
pnpm start

# Stop all processes
pnpm stop

# View process status
pnpm status

# View logs from all processes
pnpm logs

# View logs from a specific process
npx pm2 logs api-dev

# Open interactive monitor
pnpm monitor

# Restart all processes
pnpm restart

# Restart a specific process
npx pm2 restart api-dev
```

## Viewing Logs

Logs are stored in the `logs/` directory with consistent naming:
- `logs/api-dev.log`: Combined logs
- `logs/api-dev-out.log`: Standard output
- `logs/api-dev-error.log`: Standard error

You can view logs in real-time with:
```bash
pnpm logs
```

## Troubleshooting

1. **Process won't start**:
   - Check the logs: `npx pm2 logs <process-name>`
   - Verify ports aren't in use: `lsof -i :<port>`

2. **High CPU/Memory usage**:
   - Identify the issue: `pnpm monitor`
   - Restart the problematic process: `npx pm2 restart <id>`

3. **All processes stopped**:
   - Restart the ecosystem: `pnpm dev` or `pnpm start`
   - Check the PM2 daemon: `npx pm2 ping`

4. **PM2 daemon crashes**:
   - Resurrect processes: `npx pm2 resurrect`
   - If that fails, restart from scratch: `./setup-pm2.sh` 
