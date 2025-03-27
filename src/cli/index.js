/**
 * Command Line Interface for Responses API Fight Club
 * Provides a clean separation between API server and CLI operations
 */
const { program } = require('commander');
const chalk = require('chalk');
const { logger } = require('../core/infra/logging/logger');

// Import container to access dependencies
const container = require('../config/container');
const config = container.get('config');

// Import connection utilities for early connection initialization
const { initializeConnections } = require('./utils/connectionUtils');

// Load commands
const { registerUser } = require('./commands/registerUser');
const { viewProfile } = require('./commands/viewProfile');
const { generateChallenge } = require('./commands/generateChallenge');
const { submitChallengeResponse } = require('./commands/submitResponse');

// Load menus
const { mainMenu } = require('./menus/mainMenu');

// Import readline utilities
const { closePrompt } = require('./utils/cliPrompt');

// Connection initialization moved to utils/connectionUtils.js

// CLI version and description
program
  .version('1.0.0')
  .description('Responses API Fight Club CLI');

/**
 * Set up error handling for uncaught exceptions and unhandled promise rejections
 * This ensures we log all errors properly and don't silently fail
 */
process.on('uncaughtException', (error) => {
  // Log the error using our Winston logger
  logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
  logger.error(chalk.red(`Uncaught exception: ${error.message}`));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  // Log the rejection using our Winston logger
  logger.error('Unhandled promise rejection:', { 
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : 'No stack trace available'
  });
  logger.error(chalk.red(`Unhandled promise rejection: ${reason instanceof Error ? reason.message : reason}`));
  process.exit(1);
});

/**
 * "start" command
 * This will drop the user into an interactive main menu
 */
program
  .command('start')
  .description('Start the interactive CLI')
  .action(async () => {
    logger.info('Starting Responses API Fight Club CLI...');
    logger.info(chalk.green('Starting Responses API Fight Club CLI...'));
    
    try {
      // Initialize connections before starting the CLI
      const initialized = await initializeConnections();
      if (!initialized) {
        logger.warn('Starting CLI with potential connection issues');
        console.log('Warning: Starting CLI with potential connection issues');
      } else {
        // Explicitly output the success message for tests to capture
        console.log('All connections initialized successfully');
      }
      
      logger.info('Starting CLI in interactive mode');
      await mainMenu();
      logger.info('CLI session ended normally');
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(0);
    } catch (error) {
      logger.error('Error running CLI in interactive mode:', { error: error.message, stack: error.stack });
      logger.error(chalk.red(`Error: ${error.message}`));
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(1);
    }
  });

/**
 * "register" command
 * Directly invokes the user registration flow
 */
program
  .command('register')
  .description('Register a new user')
  .action(async () => {
    try {
      logger.info('Starting user registration via command');
      
      // Initialize connections before starting the command
      const initialized = await initializeConnections();
      if (!initialized) {
        logger.error('Cannot register user due to connection issues');
        logger.error(chalk.red('Failed to connect to database. Please check your configuration and try again.'));
        closePrompt();
        process.exit(1);
        return;
      }
      
      // Register user
      const user = await registerUser();
      
      if (user) {
        logger.info(`User registered successfully via command: ${user.email}`);
      } else {
        logger.warn('User registration failed via command');
      }
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(user ? 0 : 1);
    } catch (error) {
      logger.error('Error registering user via command:', { error: error.message, stack: error.stack });
      logger.error(chalk.red(`Error: ${error.message}`));
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(1);
    }
  });

/**
 * "profile" command
 * Directly invokes the view profile flow
 */
program
  .command('profile')
  .description('View user profile')
  .action(async () => {
    try {
      logger.info('Starting view profile via command');
      
      // Initialize connections before starting the command
      const initialized = await initializeConnections();
      if (!initialized) {
        logger.error('Cannot view profile due to connection issues');
        logger.error(chalk.red('Failed to connect to database. Please check your configuration and try again.'));
        closePrompt();
        process.exit(1);
        return;
      }
      
      // View profile
      const profile = await viewProfile();
      
      if (profile) {
        logger.info(`Profile viewed successfully via command: ${profile.email}`);
      } else {
        logger.warn('Profile view failed via command');
      }
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(profile ? 0 : 1);
    } catch (error) {
      logger.error('Error viewing profile via command:', { error: error.message, stack: error.stack });
      logger.error(chalk.red(`Error: ${error.message}`));
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(1);
    }
  });

/**
 * "challenge" command
 * Directly invokes the generate challenge flow
 */
program
  .command('challenge')
  .description('Generate a challenge')
  .action(async () => {
    try {
      logger.info('Starting challenge generation via command');
      
      // Initialize connections before starting the command
      const initialized = await initializeConnections();
      if (!initialized) {
        logger.error('Cannot generate challenge due to connection issues');
        logger.error(chalk.red('Failed to connect to database. Please check your configuration and try again.'));
        closePrompt();
        process.exit(1);
        return;
      }
      
      // Generate challenge
      const challenge = await generateChallenge();
      
      if (challenge) {
        logger.info(`Challenge generated successfully via command: ${challenge.id}`);
      } else {
        logger.warn('Challenge generation failed via command');
      }
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(challenge ? 0 : 1);
    } catch (error) {
      logger.error('Error generating challenge via command:', { error: error.message, stack: error.stack });
      logger.error(chalk.red(`Error: ${error.message}`));
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(1);
    }
  });

/**
 * "respond" command
 * Directly invokes the submit challenge response flow
 */
program
  .command('respond')
  .description('Submit a response to a challenge')
  .action(async () => {
    try {
      logger.info('Starting challenge response submission via command');
      
      // Initialize connections before starting the command
      const initialized = await initializeConnections();
      if (!initialized) {
        logger.error('Cannot submit response due to connection issues');
        logger.error(chalk.red('Failed to connect to database. Please check your configuration and try again.'));
        closePrompt();
        process.exit(1);
        return;
      }
      
      // Submit challenge response
      const result = await submitChallengeResponse();
      
      if (result) {
        logger.info('Challenge response submitted successfully via command');
      } else {
        logger.warn('Challenge response submission failed via command');
      }
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(result ? 0 : 1);
    } catch (error) {
      logger.error('Error submitting challenge response via command:', { error: error.message, stack: error.stack });
      logger.error(chalk.red(`Error: ${error.message}`));
      
      // Ensure we close the readline interface
      closePrompt();
      process.exit(1);
    }
  });

// Parse arguments or show help if none provided
program.parse(process.argv);

// If no args are provided, show help and exit
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}
