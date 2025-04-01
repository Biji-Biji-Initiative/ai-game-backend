#!/usr/bin/env node

/**
 * Linting Fix Script
 * Runs ESLint fix across the codebase
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m"
};

console.log(`${colors.cyan}Starting linting fix process...${colors.reset}`);

// Make sure eslint is installed
try {
    console.log(`${colors.blue}Checking if ESLint is installed...${colors.reset}`);
    execSync("npx eslint --version", { stdio: "pipe" });
} catch (error) {
    console.log(`${colors.yellow}ESLint not found, installing...${colors.reset}`);
    try {
        execSync("npm install eslint --save-dev", { stdio: "inherit" });
    } catch (installError) {
        console.error(`${colors.red}Failed to install ESLint:${colors.reset}`, installError.message);
        process.exit(1);
    }
}

// Fix common linting issues in multiple passes
const fixLintingIssues = () => {
    try {
        // First pass: Fix indentation and spacing issues
        console.log(`${colors.blue}First pass: Fixing indentation and spacing...${colors.reset}`);
        execSync("npx eslint \"./js/**/*.js\" --fix --rule \"indent: [error, 4]\"", { stdio: "inherit" });
        
        // Second pass: Fix quotes
        console.log(`${colors.blue}Second pass: Fixing quotes...${colors.reset}`);
        execSync("npx eslint \"./js/**/*.js\" --fix --rule \"quotes: [error, double]\"", { stdio: "inherit" });
        
        // Third pass: Other common issues
        console.log(`${colors.blue}Third pass: Fixing other common issues...${colors.reset}`);
        execSync("npx eslint \"./js/**/*.js\" --fix", { stdio: "inherit" });
        
        console.log(`${colors.green}Linting fixes completed successfully!${colors.reset}`);
        
        // Get remaining issues count
        try {
            const result = execSync("npx eslint \"./js/**/*.js\" -f json", { encoding: "utf8" });
            const issues = JSON.parse(result);
            const totalIssues = issues.reduce((sum, file) => sum + file.errorCount + file.warningCount, 0);
            
            if (totalIssues > 0) {
                console.log(`${colors.yellow}Remaining issues: ${totalIssues}${colors.reset}`);
                console.log(`${colors.cyan}Run 'npm run lint' to see all remaining issues.${colors.reset}`);
            } else {
                console.log(`${colors.green}No linting issues remaining!${colors.reset}`);
            }
        } catch (countError) {
            console.log(`${colors.yellow}Couldn't count remaining issues.${colors.reset}`);
        }
    } catch (error) {
        console.error(`${colors.red}Error during linting fix:${colors.reset}`, error.message);
        process.exit(1);
    }
};

fixLintingIssues(); 