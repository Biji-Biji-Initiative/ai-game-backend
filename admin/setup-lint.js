#!/usr/bin/env node

/**
 * Setup ESLint for API Tester UI
 * Installs and configures ESLint for the project
 */

import { execSync } from "child_process";

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

console.log(`${colors.cyan}Setting up ESLint for API Tester UI...${colors.reset}`);

try {
    // Install ESLint and plugins
    console.log(`${colors.blue}Installing ESLint and plugins...${colors.reset}`);
    execSync("npm install eslint --save-dev", { stdio: "inherit" });
    
    console.log(`${colors.green}ESLint setup completed!${colors.reset}`);
    console.log(`${colors.yellow}You can now run the following commands:${colors.reset}`);
    console.log(`${colors.cyan}- npm run lint: ${colors.reset}Check for linting issues`);
    console.log(`${colors.cyan}- npm run lint:fix: ${colors.reset}Fix automatically fixable issues`);
    console.log(`${colors.cyan}- npm run lintfix: ${colors.reset}Run advanced multi-pass fixing`);
} catch (error) {
    console.error("Error setting up ESLint:", error.message);
    process.exit(1);
} 