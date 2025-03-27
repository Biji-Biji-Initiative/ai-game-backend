/**
 * Admin Menu
 * Handles administrative functions for the CLI
 */
const chalk = require('chalk');
const { prompt } = require('../utils/cliPrompt');
const { formatHeader, formatError, formatSuccess, formatOutput } = require('../utils/formatter');
const { logger } = require('../../core/infra/logging/logger');

// Import container for dependencies
const container = require('../../config/container');
const userService = container.get('userService');
const challengeCoordinator = container.get('challengeCoordinator');

/**
 * List all users in the system
 */
async function listUsers() {
  logger.info(formatHeader('List All Users'));
  
  try {
    logger.info('Admin: Listing all users');
    const users = await userService.getAllUsers();
    
    if (!users || users.length === 0) {
      logger.info('No users found in the system.');
      return;
    }
    
    logger.info(formatSuccess(`Found ${users.length} users:`));
    users.forEach((user, index) => {
      logger.info(`${index + 1}. ${user.email} - ${user.fullName || 'Name not provided'} (Created: ${new Date(user.createdAt).toLocaleDateString()})`);
    });
    
    const showDetail = await prompt('\nView details for a user? (Enter number or N): ');
    if (showDetail.toLowerCase() !== 'n') {
      const userIndex = parseInt(showDetail) - 1;
      if (userIndex >= 0 && userIndex < users.length) {
        const selectedUser = users[userIndex];
        logger.info(formatHeader(`User Details: ${selectedUser.email}`));
        logger.info(formatOutput(selectedUser, true));
      } else {
        logger.info(formatError('Invalid user number.'));
      }
    }
  } catch (error) {
    logger.error('Error listing users', { error: error.message, stack: error.stack });
    logger.info(formatError(`Failed to list users: ${error.message}`));
  }
}

/**
 * List all challenges in the system
 */
async function listChallenges() {
  logger.info(formatHeader('List All Challenges'));
  
  try {
    logger.info('Admin: Listing all challenges');
    const challenges = await challengeCoordinator.getAllChallenges();
    
    if (!challenges || challenges.length === 0) {
      logger.info('No challenges found in the system.');
      return;
    }
    
    logger.info(formatSuccess(`Found ${challenges.length} challenges:`));
    challenges.forEach((challenge, index) => {
      logger.info(`${index + 1}. ${challenge.id} - ${challenge.focusArea} (Type: ${challenge.challengeType}, Difficulty: ${challenge.difficulty})`);
    });
    
    const showDetail = await prompt('\nView details for a challenge? (Enter number or N): ');
    if (showDetail.toLowerCase() !== 'n') {
      const challengeIndex = parseInt(showDetail) - 1;
      if (challengeIndex >= 0 && challengeIndex < challenges.length) {
        const selectedChallenge = challenges[challengeIndex];
        logger.info(formatHeader(`Challenge Details: ${selectedChallenge.id}`));
        logger.info(formatOutput(selectedChallenge, true));
      } else {
        logger.info(formatError('Invalid challenge number.'));
      }
    }
  } catch (error) {
    logger.error('Error listing challenges', { error: error.message, stack: error.stack });
    logger.info(formatError(`Failed to list challenges: ${error.message}`));
  }
}

/**
 * Delete a user from the system
 */
async function deleteUser() {
  logger.info(formatHeader('Delete User'));
  
  try {
    const email = await prompt('Enter email of user to delete: ');
    
    logger.info('Admin: Attempting to delete user', { email });
    const user = await userService.getUserByEmail(email);
    
    if (!user) {
      logger.info(formatError(`User with email ${email} not found.`));
      return;
    }
    
    logger.info(formatHeader('User found:'));
    logger.info(`Email: ${user.email}`);
    logger.info(`Name: ${user.fullName || 'Not provided'}`);
    logger.info(`Created: ${new Date(user.createdAt).toLocaleDateString()}`);
    
    const confirm = await prompt('\nAre you sure you want to delete this user? This cannot be undone. (y/N): ');
    if (confirm.toLowerCase() === 'y') {
      await userService.deleteUser(email);
      logger.info('Admin: User deleted successfully', { email });
      logger.info(formatSuccess(`User ${email} deleted successfully.`));
    } else {
      logger.info('Delete operation cancelled.');
    }
  } catch (error) {
    logger.error('Error deleting user', { error: error.message, stack: error.stack });
    logger.info(formatError(`Failed to delete user: ${error.message}`));
  }
}

/**
 * Generate a system report
 */
async function generateSystemReport() {
  logger.info(formatHeader('System Report'));
  
  try {
    logger.info('Admin: Generating system report');
    
    // Count users
    const users = await userService.getAllUsers();
    const userCount = users ? users.length : 0;
    
    // Count challenges
    const challenges = await challengeCoordinator.getAllChallenges();
    const challengeCount = challenges ? challenges.length : 0;
    
    // Calculate other metrics if available
    let activeUsers = 0;
    let newUsersLast30Days = 0;
    let completedChallenges = 0;
    
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    if (users && users.length > 0) {
      // Count active users (active in last 30 days)
      activeUsers = users.filter(user => {
        const lastActive = new Date(user.lastActive);
        return lastActive >= thirtyDaysAgo;
      }).length;
      
      // Count new users in last 30 days
      newUsersLast30Days = users.filter(user => {
        const created = new Date(user.createdAt);
        return created >= thirtyDaysAgo;
      }).length;
    }
    
    if (challenges && challenges.length > 0) {
      // Count completed challenges
      completedChallenges = challenges.filter(challenge => challenge.status === 'completed').length;
    }
    
    logger.info(formatHeader('User Statistics'));
    logger.info(`Total Users: ${userCount}`);
    logger.info(`Active Users (last 30 days): ${activeUsers}`);
    logger.info(`New Users (last 30 days): ${newUsersLast30Days}`);
    
    logger.info(formatHeader('Challenge Statistics'));
    logger.info(`Total Challenges: ${challengeCount}`);
    logger.info(`Completed Challenges: ${completedChallenges}`);
    logger.info(`Completion Rate: ${challengeCount > 0 ? ((completedChallenges / challengeCount) * 100).toFixed(2) : 0}%`);
    
    // Save report to file if requested
    const saveToFile = await prompt('\nSave report to file? (y/N): ');
    if (saveToFile.toLowerCase() === 'y') {
      const fs = require('fs');
      const path = require('path');
      
      const reportData = {
        generatedAt: new Date().toISOString(),
        userStats: {
          total: userCount,
          active: activeUsers,
          newLast30Days: newUsersLast30Days
        },
        challengeStats: {
          total: challengeCount,
          completed: completedChallenges,
          completionRate: challengeCount > 0 ? ((completedChallenges / challengeCount) * 100).toFixed(2) : 0
        }
      };
      
      const reportDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const reportFile = path.join(reportDir, `system-report-${new Date().toISOString().replace(/:/g, '-')}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
      
      logger.info('Admin: System report saved to file', { reportFile });
      logger.info(formatSuccess(`Report saved to: ${reportFile}`));
    }
  } catch (error) {
    logger.error('Error generating system report', { error: error.message, stack: error.stack });
    logger.info(formatError(`Failed to generate report: ${error.message}`));
  }
}

/**
 * Display and handle the admin menu
 */
async function adminMenu() {
  let running = true;
  
  while (running) {
    logger.info('\n');
    logger.info(formatHeader('ADMIN FUNCTIONS'));
    logger.info('1. List all users');
    logger.info('2. List all challenges');
    logger.info('3. Delete a user');
    logger.info('4. Generate system report');
    logger.info('0. Return to main menu');
    
    const choice = await prompt('\nSelect an option: ');
    
    switch (choice) {
      case '1':
        await listUsers();
        break;
        
      case '2':
        await listChallenges();
        break;
        
      case '3':
        await deleteUser();
        break;
        
      case '4':
        await generateSystemReport();
        break;
        
      case '0':
        logger.info('Returning to main menu...');
        running = false;
        break;
        
      default:
        logger.info(formatError('Invalid option. Please try again.'));
        break;
    }
    
    // If still in admin menu, prompt to continue
    if (running) {
      const cont = await prompt('\nPress Enter to continue...');
    }
  }
  
  return true;
}

module.exports = {
  adminMenu
};
