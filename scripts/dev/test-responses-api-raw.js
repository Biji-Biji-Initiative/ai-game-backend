/**
 * OpenAI Responses API Raw Test
 * This script tests the direct integration with OpenAI's Responses API
 * and logs the raw API requests and responses
 */

require('dotenv').config();
const responsesApiClient = require('./src/utils/api/responsesApiClient');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
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
  const logFile = path.join(logsDir, `raw_api_log_${timestamp.replace(/[:.]/g, '-')}.json`);
  
  console.log(`Logging ${label} to ${logFile}`);
  
  const logData = {
    timestamp,
    label,
    data
  };
  
  // Write to log file
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
  
  // Also log to console
  console.log(`\n===== ${label.toUpperCase()} =====`);
  
  // Pretty print for console, limiting large objects
  if (typeof data === 'object') {
    // For large objects, only print first level
    console.log(JSON.stringify(data, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (key === 'content' && typeof value === 'string' && value.length > 200) {
          return value.substring(0, 200) + '... (truncated)';
        }
      }
      return value;
    }, 2));
  } else {
    console.log(data);
  }
}

// Patch the OpenAI library to capture raw requests
const originalRequestMethod = OpenAI.prototype.requestMethod;
OpenAI.prototype.requestMethod = async function(args) {
  // Log the raw request
  logApiDetails('Raw OpenAI API Request', {
    method: args.method,
    path: args.path,
    query: args.query,
    body: args.body,
    headers: args.headers
  });
  
  try {
    // Call the original method
    const response = await originalRequestMethod.call(this, args);
    
    // Log the raw response
    logApiDetails('Raw OpenAI API Response', response);
    
    return response;
  } catch (error) {
    // Log the error
    logApiDetails('Raw OpenAI API Error', error);
    throw error;
  }
};

/**
 *
 */
async function testResponsesApiRaw() {
  console.log('Testing Raw OpenAI Responses API Integration with detailed logging');
  
  try {
    // Sample challenge and user response
    const challenge = {
      id: 'test-challenge-123',
      title: 'AI Ethics Challenge',
      challengeType: 'analysis',
      focusArea: 'AI Ethics',
      content: 'Analyze the ethical implications of AI systems in healthcare.'
    };
    
    const userResponse = 'AI in healthcare presents several ethical considerations. First, patient privacy must be protected when handling sensitive health data. Second, AI diagnosis systems must be transparent so healthcare providers understand how recommendations are made. Third, we must ensure these systems are tested across diverse populations to prevent bias. Finally, human oversight is crucial - AI should augment rather than replace medical professionals.';
    
    // Create a thread for stateful conversation
    console.log('Creating a thread...');
    const threadMetadata = responsesApiClient.createThread('test-user-123', 'evaluation');
    console.log(`Created thread: ${threadMetadata.id}`);
    
    // Build the evaluation prompt
    const evaluationPrompt = `
### EVALUATION TASK

Evaluate the user's response to the challenge with detailed scoring in multiple categories.

### CHALLENGE INFORMATION
Title: ${challenge.title}
Type: ${challenge.challengeType}
Focus Area: ${challenge.focusArea}

### CHALLENGE CONTENT
${challenge.content}

### USER RESPONSE
${userResponse}

### EVALUATION CRITERIA
Evaluate the response using the following criteria:

- accuracy (0-30 points): Evaluate factual correctness, depth of knowledge, and absence of misconceptions
- critical_thinking (0-30 points): Assess depth of analysis, consideration of alternatives, and avoidance of cognitive biases
- clarity (0-20 points): Assess organization, clarity of expression, and logical flow of ideas
- insight (0-20 points): Evaluate the presence of meaningful, non-obvious observations and connections

The total maximum score is 100 points.

### STRENGTH ANALYSIS
For each strength identified, provide a detailed analysis including:
1. What the user did well (the strength itself)
2. Why this aspect is effective or important
3. How it specifically contributes to the quality of the response

### RESPONSE FORMAT
Provide your evaluation as a JSON object with the following structure:

{
  "categoryScores": {
    "accuracy": 25,
    "critical_thinking": 28,
    "clarity": 18,
    "insight": 20
  },
  "overallScore": 85,
  "overallFeedback": "Comprehensive evaluation of the entire response...",
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "strengthAnalysis": [
    {
      "strength": "Strength 1",
      "analysis": "Detailed explanation of why this is effective...",
      "impact": "How this contributes to overall quality..."
    }
  ],
  "areasForImprovement": [
    "Area for improvement 1",
    "Area for improvement 2"
  ],
  "nextSteps": "Actionable recommendations for the user..."
}
`;
    
    // Configure API call options for Responses API
    const apiOptions = {
      model: 'gpt-4o',
      temperature: 0.4
    };
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: `You are an AI evaluation expert specializing in analyzing ${challenge.challengeType} responses.
Always return your evaluation as a JSON object with category scores, overall score, detailed feedback, and strength analysis.
Format your response as valid, parsable JSON with no markdown formatting.`
      },
      {
        role: responsesApiClient.MessageRole.USER,
        content: evaluationPrompt
      }
    ];
    
    // Call the OpenAI Responses API
    console.log('Calling OpenAI Responses API...');
    const startTime = Date.now();
    const response = await responsesApiClient.sendJsonMessage(messages, apiOptions);
    const endTime = Date.now();
    
    console.log(`API call completed in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Response ID: ${response.responseId}`);
    
    // Verify the response data
    if (!response || !response.data) {
      throw new Error('Invalid response format from OpenAI Responses API');
    }
    
    // Update thread with response ID for stateful conversation
    const updatedThread = responsesApiClient.updateThreadWithResponse(threadMetadata, response.responseId);
    console.log(`Updated thread with response ID: ${updatedThread.lastResponseId}`);
    console.log(`Thread message count: ${updatedThread.messageCount}`);
    
    // Print brief evaluation results summary
    console.log('\n===== EVALUATION SUMMARY =====');
    console.log(`Overall Score: ${response.data.overallScore}`);
    console.log(`Categories: ${Object.keys(response.data.categoryScores).join(', ')}`);
    console.log(`Strengths: ${response.data.strengths.length}`);
    console.log(`Areas for Improvement: ${response.data.areasForImprovement.length}`);
    
    // Test completed successfully
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY: OpenAI Responses API is working correctly');
    console.log(`✅ Raw API logs saved in the logs directory: ${logsDir}`);
    
    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testResponsesApiRaw()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 