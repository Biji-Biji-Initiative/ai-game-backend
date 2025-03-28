/**
 * Test function to demonstrate ESLint and Prettier integration
 * @returns {string} A test message
 */
const _testFunction = () => {
  // Use underscore prefix for variables we don't use
  const _unusedVariable = 'This will not trigger ESLint due to underscore prefix';

  console.log('Semicolon added here');

  return 'Test function';
};
