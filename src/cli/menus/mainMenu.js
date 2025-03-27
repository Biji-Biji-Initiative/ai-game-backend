/**
 * Main Menu
 * Handles the main interactive menu for the CLI
 */
const chalk = require('chalk');
const { prompt, getReadlineInterface } = require('../utils/cliPrompt');
const { formatHeader, formatError, formatSuccess } = require('../utils/formatter');
const { logger } = require('../../core/infra/logging/logger');

// Import commands
const { registerUser } = require('../commands/registerUser');
const { viewProfile } = require('../commands/viewProfile');
const { generateChallenge } = require('../commands/generateChallenge');
const { submitChallengeResponse } = require('../commands/submitResponse');

// Import other menus
const { adminMenu } = require('./adminMenu');

// Import container for additional dependencies we may need
const container = require('../../config/container');

// Import supabase client to check connection status
const supabase = require('../../utils/supabaseClient');

/**
 * Main menu function that handles user interaction
 */
async function mainMenu() {
  try {
    // Check if connection is verified
    if (!supabase.isConnectionVerified()) {
      logger.warn('Database connection may not be properly established. Some features may not work correctly.');
    }
    
    let running = true;
    
    while (running) {
      logger.info('\n');
      logger.info(formatHeader('RESPONSES API FIGHT CLUB'));
      logger.info('1. Start Gameplay');
      logger.info('2. Register a new user');
      logger.info('3. View user profile');
      logger.info('4. Generate a challenge');
      logger.info('5. Submit challenge response');
      logger.info('6. Admin functions');
      logger.info('0. Exit');
      
      const choice = await prompt('\nSelect an option: ');
      
      switch (choice) {
        case '1':
          // Start gameplay - to be implemented
          logger.info('User selected to start gameplay (not yet implemented)');
          logger.info(formatHeader('Starting Gameplay'));
          logger.info('Gameplay functionality to be implemented');
          break;
          
        case '2':
          // Register user
          await registerUser();
          break;
          
        case '3':
          // View profile
          await viewProfile();
          break;
          
        case '4':
          // Generate challenge
          await generateChallenge();
          break;
          
        case '5':
          // Submit challenge response
          await submitChallengeResponse();
          break;
          
        case '6':
          // Admin functions
          try {
            logger.info('User selected admin functions');
            await adminMenu();
          } catch (adminError) {
            logger.error('Error in admin menu:', { error: adminError.message, stack: adminError.stack });
            logger.info(formatError(`Error in admin menu: ${adminError.message}`));
          }
          break;
          
        case '0':
          logger.info('User selected to exit the application');
          logger.info(formatSuccess('Goodbye!'));
          running = false;
          break;
          
        default:
          logger.warn(`User selected invalid option: ${choice}`);
          logger.info(formatError('Invalid option. Please try again.'));
          break;
      }
      
      // If still running, prompt to continue
      if (running) {
        const cont = await prompt('\nPress Enter to continue...');
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Unexpected error in main menu:', { error: error.message, stack: error.stack });
    
    logger.info(formatError(`Unexpected error: ${error.message}`));
    return false;
  }
}

module.exports = {
  mainMenu
};
