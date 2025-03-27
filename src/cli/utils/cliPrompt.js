/**
 * CLI Prompt Utility
 * Provides a consistent interface for CLI input/output interactions
 */
const readline = require('readline');
const { logger } = require('../../core/infra/logging/logger');

// Create the readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt the user for input
 * @param {string} question - The prompt to display
 * @returns {Promise<string>} - The user's input
 */
function prompt(question) {
  logger.debug(`Prompting user for input`, { question });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      logger.debug(`User input received`, { question, answerLength: answer.length });
      resolve(answer);
    });
  });
}

/**
 * Close the readline interface
 */
function closePrompt() {
  logger.debug('Closing readline interface');
  rl.close();
}

/**
 * Get the readline interface (for use in special cases)
 * @returns {readline.Interface} - The readline interface
 */
function getReadlineInterface() {
  return rl;
}

module.exports = {
  prompt,
  closePrompt,
  getReadlineInterface
};
