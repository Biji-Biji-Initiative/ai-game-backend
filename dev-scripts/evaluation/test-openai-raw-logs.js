/**
 * OpenAI Raw API Logging Test
 * This script shows detailed raw API requests and responses when calling the OpenAI API
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'raw_logs');
if (!fs.existsSync(logsDir)) {
  console.log(`Creating directory: ${logsDir}`);
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log detailed API information to file and console
 */
function logRawApiDetails(label, data) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(logsDir, `raw_api_${timestamp.replace(/[:.]/g, '-')}.json`);
  
  console.log(`\n===== ${label.toUpperCase()} =====`);
  
  // For console output, limit depth for better readability
  console.log(JSON.stringify(data, null, 2).substring(0, 2000) + '...');
  
  // Write to log file
  try {
    const logData = {
      timestamp,
      label,
      data
    };
    
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log(`Logged to ${logFile}`);
  } catch (error) {
    console.error(`Error writing to log file: ${error.message}`);
    console.error(error);
  }
}

async function testRawOpenAIApi() {
  console.log('Testing OpenAI API with detailed request/response logging');
  
  // Initialize the OpenAI client with detailed logging
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Create a wrapper for the fetch function used by OpenAI
  const originalFetch = global.fetch;
  global.fetch = async function(url, options) {
    try {
      // Log request details
      const requestBody = options.body ? JSON.parse(options.body) : null;
      
      logRawApiDetails('API Request', {
        url: url,
        method: options.method,
        headers: options.headers,
        body: requestBody
      });
      
      const startTime = Date.now();
      
      // Make the actual API call
      const response = await originalFetch(url, options);
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      // Clone the response so we can read the body
      const clonedResponse = response.clone();
      let responseBody;
      
      try {
        responseBody = await clonedResponse.json();
      } catch (e) {
        try {
          responseBody = await clonedResponse.text();
        } catch (err) {
          responseBody = 'Could not read response body';
        }
      }
      
      // Log response details
      logRawApiDetails('API Response', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
        responseTime: `${responseTime} seconds`,
        body: responseBody
      });
      
      return response;
    } catch (error) {
      // Log error details
      logRawApiDetails('API Error', {
        message: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  };

  try {
    // Basic AI Ethics evaluation task
    const prompt = `Evaluate this response to an AI Ethics question:
    
Question: What are the ethical implications of AI in healthcare?

Response: AI in healthcare presents several ethical considerations. First, patient privacy must be protected when handling sensitive health data. Second, AI diagnosis systems must be transparent so healthcare providers understand how recommendations are made. Third, we must ensure these systems are tested across diverse populations to prevent bias. Finally, human oversight is crucial - AI should augment rather than replace medical professionals.`;

    console.log('Sending request to OpenAI API...');
    
    // First, try using the Responses API if available
    if (openai.responses) {
      console.log('Using OpenAI Responses API');
      
      // For Responses API
      const responsesResult = await openai.responses.create({
        model: 'gpt-4o',
        instructions: 'You are an expert evaluator of AI ethics responses. Format your response as JSON with a specific schema including overallScore, categoryScores, and strengths.',
        input: prompt,
        temperature: 0.4
      });
      
      fs.writeFileSync(
        path.join(logsDir, 'responses_result.json'), 
        JSON.stringify(responsesResult, null, 2)
      );
      
      console.log('✅ Responses API call successful');
    } else {
      console.log('Responses API not available, using Chat Completions API');
      
      // Fall back to Chat Completions API
      const chatResult = await openai.responses.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert evaluator of AI ethics responses. Format your response as JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4
      });
      
      fs.writeFileSync(
        path.join(logsDir, 'chat_result.json'), 
        JSON.stringify(chatResult, null, 2)
      );
      
      console.log('✅ Chat Completions API call successful');
    }
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
    console.log(`✅ Raw API logs saved in the logs directory: ${logsDir}`);
    
    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    return false;
  } finally {
    // Restore the original fetch function
    global.fetch = originalFetch;
  }
}

// Run the test
testRawOpenAIApi()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 