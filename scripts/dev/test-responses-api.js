/**
 * OpenAI Responses API Test
 * This script tests the direct integration with OpenAI's Responses API
 * Added detailed logging of API requests and responses
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Load .env from root
const fs = require('fs');
const chalk = require('chalk');

// Use the application's configured OpenAI client
const { container } = require('../../src/config/container'); // Adjusted path
const openAIClient = container.get('openAIClient'); // Get client via DI container

// Create logs directory if it doesn't exist (relative to script location)
const logsDir = path.join(__dirname, 'logs'); // Store logs within dev scripts dir
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

/**
 * Log detailed API information to file
 * @param {string} label - Label for the log
 * @param {any} data - Data to log
 */
function logApiDetails(label, data) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(logsDir, `api_log_${timestamp.replace(/[:.]/g, '-')}.json`);

  console.log(chalk.dim(`Logging ${label} to ${path.basename(logFile)}`));

  const logData = {
    timestamp,
    label,
    data
  };

  // Write to log file
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));

  // Also log summarized data to console
  console.log(chalk.blue(`\n===== ${label.toUpperCase()} =====`));
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2).substring(0, 500) + '...'); // Limit console output
}

/**
 * Tests the OpenAI Responses API integration using the application's client
 * @returns {Promise<boolean>} True if the test succeeds, false otherwise
 */
async function testResponsesApi() {
  console.log(chalk.cyan('Testing OpenAI Responses API Integration using Application Client'));

  if (openAIClient.useMock) {
    console.log(chalk.yellow('⚠️ OpenAI Client is in MOCK mode. Real API calls will not be made.'));
  }

  try {
    // Sample user response
    const userResponse = 'AI in healthcare presents several ethical considerations...';

    // Create a thread ID for stateful conversation (using openAIStateManager if needed)
    const stateManager = container.get('openAIStateManager');
    const threadContext = `test_eval_${Date.now()}`;
    const state = await stateManager.findOrCreateConversationState('test-user-123', threadContext);
    const threadId = state.id; // Use the state ID as the thread identifier
    let previousResponseId = await stateManager.getLastResponseId(threadId);

    console.log(`Using Thread/State ID: ${threadId}, Previous Response ID: ${previousResponseId || 'None'}`);

    // Build the evaluation prompt (simplified for this test)
    const evaluationPrompt = `Evaluate the user response based on clarity and ethical reasoning.\n\nRESPONSE:\n${userResponse}`;
    const systemMessage = `You are an AI evaluator. Respond in JSON format: {"score": <0-100>, "feedback": "..."}`;

    // Prepare messages for the client's format (assuming formatForResponsesApi or similar)
    // NOTE: Directly using the client assumes its sendMessage/sendJsonMessage handles formatting.
    // If not, we'd import and use formatForResponsesApi here.
    const messages = { input: evaluationPrompt, instructions: systemMessage };

    // Configure API call options
    const apiOptions = {
      model: 'gpt-4o', // Or get from config
      temperature: 0.4,
      previousResponseId // Pass previous ID for stateful conversation
    };

    // Call the OpenAI Responses API via our client
    console.log('Calling OpenAIClient.sendJsonMessage...');
    const startTime = Date.now();
    const response = await openAIClient.sendJsonMessage(messages, apiOptions);
    const endTime = Date.now();

    console.log(chalk.green(`API call completed in ${(endTime - startTime) / 1000} seconds`));
    console.log(`Response ID: ${response.responseId}`);

    // Log parsed JSON response data
    logApiDetails('Parsed JSON Response', response.data);

    // Verify the response data
    if (!response || !response.data || typeof response.data.score !== 'number') {
      throw new Error('Invalid response format from OpenAI Client');
    }

    // Update thread state with the new response ID
    await stateManager.updateLastResponseId(threadId, response.responseId);
    console.log(`Updated state ${threadId} with new Response ID: ${response.responseId}`);

    // Print the evaluation results
    console.log(chalk.cyan('\n===== EVALUATION RESULTS ====='));
    console.log(`Overall Score: ${response.data.score}`);
    console.log(`Feedback: ${response.data.feedback}`);

    // --- Second message in the same thread ---
    console.log(chalk.cyan('\n--- Sending second message in thread ---'));
    previousResponseId = response.responseId; // Use the ID from the previous response
    const followUpPrompt = 'Based on your evaluation, suggest one specific improvement.';
    const followUpMessages = { input: followUpPrompt };
    const followUpOptions = { ...apiOptions, previousResponseId };

    const followUpResponse = await openAIClient.sendMessage(followUpMessages, followUpOptions); // Get text response this time
    await stateManager.updateLastResponseId(threadId, followUpResponse.id);

    logApiDetails('Follow-up Response', followUpResponse);
    console.log(`Follow-up Response ID: ${followUpResponse.id}`);
    console.log(`Follow-up Suggestion: ${followUpResponse.output?.[0]?.content?.[0]?.text}`);

    console.log(chalk.green.bold('\n✅ TEST COMPLETED SUCCESSFULLY!'));
    console.log(chalk.dim(`✅ API logs saved in: ${logsDir}`));

    return true;
  } catch (error) {
    console.error(chalk.red('\n❌ TEST FAILED:'), error.message);
    logApiDetails('API Error', { message: error.message, stack: error.stack });
    return false;
  }
}

// Run the test
testResponsesApi()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error(chalk.red('Unhandled error:'), err);
    logApiDetails('Unhandled Error', { message: err.message, stack: err.stack });
    process.exit(1);
  }); 