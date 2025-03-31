# Better Monorepo Setup with pnpm

## Background

There are two main ways to handle dependencies in a JavaScript monorepo:

1. **npm/yarn workspaces**: These use hoisting to move dependencies to the root, but still create small `node_modules` in each package with symbolic links to the root modules.

2. **pnpm workspaces**: Uses a completely different approach with a content-addressable store, creating symbolic links for all dependencies.

## The Best Approach

**pnpm is the recommended solution** for your monorepo for several reasons:

1. **Proper dependency isolation**: pnpm creates a `node_modules/.pnpm` store and links only direct dependencies to each package's node_modules.

2. **Symbolic links instead of duplication**: pnpm doesn't duplicate modules - it creates symbolic links to a central store.

3. **Fast installs**: pnpm is significantly faster than npm/yarn.

4. **Designed for monorepos**: pnpm was built with monorepos in mind.

## How to Set It Up

1. **Install pnpm globally**:
   ```
   npm install -g pnpm
   ```

2. **Create a pnpm-workspace.yaml file** in your root directory:
   ```yaml
   packages:
     - 'packages/*'
   ```

3. **Remove all node_modules folders**:
   ```
   find packages -name "node_modules" -type d -exec rm -rf {} \; 2>/dev/null || true
   rm -rf node_modules
   ```

4. **Install dependencies with pnpm**:
   ```
   pnpm install
   ```

5. **Run your API using pnpm**:
   ```
   cd packages/api
   pnpm dev
   ```

## Why This Works Better

pnpm's approach is different from npm/yarn:

- It creates a content-addressable store in `node_modules/.pnpm`
- It puts symbolic links in each package's `node_modules` that point to the store
- This approach keeps proper Node.js resolution working correctly
- It ensures each package only has access to its declared dependencies

## Tips for Working with pnpm

1. **To add dependencies to a specific package**:
   ```
   pnpm add express --filter @ai-fight-club/api
   ```

2. **To add dependencies to all packages**:
   ```
   pnpm add lodash -w
   ```

3. **To run a script in a specific package**:
   ```
   pnpm --filter @ai-fight-club/api dev
   ```

4. **Linking packages in development**:
   ```
   pnpm --filter @ai-fight-club/api link --global
   ```

This approach gives you what you want - centralized dependency management - but in a way that's actually supported by the Node.js module resolution system. 
