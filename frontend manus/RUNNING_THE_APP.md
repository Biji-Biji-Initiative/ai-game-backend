# Running the AI Fight Club Frontend

This guide provides instructions on how to run the frontend application, including fixes for common issues.

## Quick Start (Recommended Method)

The easiest way to start the application is using our one-step fix script:

```bash
# Make the script executable (only needed once)
chmod +x fix-and-run.sh

# Run the application with all fixes automatically applied
./fix-and-run.sh
```

This script will:
1. Patch all necessary Next.js modules
2. Clean the Next.js cache
3. Apply the exports/module polyfill
4. Configure Hot Module Replacement (HMR) for better development
5. Start the server on port 3333

Once running, you can access the application at:
```
http://localhost:3333
```

## Hot Module Replacement Improvements

The application now includes several improvements to Hot Module Replacement (HMR) and Fast Refresh:

1. React-friendly polyfill provider that works better with Fast Refresh
2. Enhanced CORS handling for HMR updates
3. Optimized webpack configuration for fewer full reloads

If you experience HMR issues or see the warning about Fast Refresh performing a full reload, follow these best practices:

- Keep React components and non-React utilities in separate files
- Avoid exporting both React components and regular utilities from the same file
- Ensure parent components are function components (not class components)
- Verify CORS is properly configured in your browser

## Test Pages

Two test pages are available to verify basic functionality:

1. Basic test page: `http://localhost:3333/test`
2. Built-in test components in the React component hierarchy

The test page will display the status of exports/module globals and other polyfills.

## Alternative Methods

If you prefer to run the application step by step, you have several options:

### Run with Patching Script

```bash
# Apply patches and run with exports fix
npm run dev:patched
```

### Run with the Interactive Script

```bash
# Make the script executable (only needed once)
chmod +x run.sh

# Run the interactive script
./run.sh
```

## Troubleshooting

### _interop_require_default._ is not a function Error

If you encounter this error:
```
TypeError: _interop_require_default._ is not a function
```

Run our patching script before starting the server:
```bash
npm run patch
```

### HMR/Fast Refresh Issues

If you see warnings about Fast Refresh performing a full reload:

1. Make sure you're using the improved React provider setup
2. Try running with the enhanced HMR configuration:
   ```bash
   NEXT_HMR_ALLOW_ORIGIN='*' npm run dev
   ```

### Port Already in Use

If port 3333 is already in use, you can:

1. Kill the process using the port:
   ```bash
   lsof -i :3333
   kill -9 [PID]
   ```

2. Or modify package.json to use a different port:
   ```json
   "scripts": {
     "dev": "next dev -p [NEW_PORT]",
     "dev:fix": "NODE_OPTIONS='--require ./fix-exports.js' next dev -p [NEW_PORT]"
   }
   ```

### Build Errors

If you encounter build errors, try:

1. Clearing Next.js cache:
   ```bash
   rm -rf .next
   ```

2. Reinstalling dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

## API Configuration

The frontend expects the API to be available at the same host and port. The proxy configuration in `next.config.js` forwards API requests to the appropriate endpoint. 