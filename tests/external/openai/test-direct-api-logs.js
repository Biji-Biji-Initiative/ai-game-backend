import { config } from "dotenv";
import fs from "fs";
import path from "path";
import * as axios from "axios";
import util from "util";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/**
 * Direct OpenAI API Raw Request/Response Logging
 * This script uses axios to directly call OpenAI API and log the raw request/response
 */
({ config }.config());
// Create logs directory
const logsDir = path.join(__dirname, 'direct_logs');
if (!fs.existsSync(logsDir)) {
    console.log(`Creating directory: ${logsDir}`);
    fs.mkdirSync(logsDir, { recursive: true });
}
// Configure axios for detailed logging
axios.interceptors.request.use(request => {
    const timestamp = new Date().toISOString();
    const logPath = path.join(logsDir, `request_${timestamp.replace(/[:.]/g, '-')}.json`);
    // Clone the request to avoid mutating it
    const requestToLog = {
        url: request.url,
        method: request.method,
        headers: { ...request.headers },
        data: request.data
    };
    // Mask the API key in headers
    if (requestToLog.headers && requestToLog.headers['Authorization']) {
        requestToLog.headers['Authorization'] = 'Bearer sk-...REDACTED';
    }
    console.log(`\n===== API REQUEST (${timestamp}) =====`);
    console.log(util.inspect(requestToLog, { depth: 5, colors: true }));
    fs.writeFileSync(logPath, JSON.stringify({
        timestamp,
        label: 'API Request',
        data: requestToLog
    }, null, 2));
    console.log(`Request logged to: ${logPath}`);
    return request;
});
axios.interceptors.response.use(response => {
    const timestamp = new Date().toISOString();
    const logPath = path.join(logsDir, `response_${timestamp.replace(/[:.]/g, '-')}.json`);
    // Format for logging: status, headers, data, timing info
    const responseToLog = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        timing: {
            responseTime: response.config.metadata?.endTime - response.config.metadata?.startTime,
            startTime: response.config.metadata?.startTime,
            endTime: response.config.metadata?.endTime
        }
    };
    console.log(`\n===== API RESPONSE (${timestamp}) =====`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response Time: ${(response.config.metadata?.endTime - response.config.metadata?.startTime) / 1000} seconds`);
    // Log response data truncated for console
    console.log('Response Data:');
    console.log(util.inspect(response.data, { depth: 3, colors: true, maxStringLength: 1000 }));
    fs.writeFileSync(logPath, JSON.stringify({
        timestamp,
        label: 'API Response',
        data: responseToLog
    }, null, 2));
    console.log(`Response logged to: ${logPath}`);
    return response;
}, error => {
    const timestamp = new Date().toISOString();
    const logPath = path.join(logsDir, `error_${timestamp.replace(/[:.]/g, '-')}.json`);
    console.log(`\n===== API ERROR (${timestamp}) =====`);
    console.log(error.message);
    if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Response Data:`, error.response.data);
        fs.writeFileSync(logPath, JSON.stringify({
            timestamp,
            label: 'API Error',
            error: {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            }
        }, null, 2));
    }
    else {
        fs.writeFileSync(logPath, JSON.stringify({
            timestamp,
            label: 'API Error',
            error: {
                message: error.message,
                stack: error.stack
            }
        }, null, 2));
    }
    console.log(`Error logged to: ${logPath}`);
    return Promise.reject(error);
});
// Add timing information
axios.interceptors.request.use(config => {
    config.metadata = { startTime: new Date().getTime() };
    return config;
});
axios.interceptors.response.use(response => {
    response.config.metadata.endTime = new Date().getTime();
    return response;
});
/**
 *
 */
async function testDirectOpenAIApiCall() {
    console.log('Testing Direct OpenAI API Call with Raw Request/Response Logging');
    try {
        // Prepare API Key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set.');
        }
        // Test 1: Call Responses API directly
        console.log('\n1. Testing OpenAI Responses API...');
        const responsesRequestData = {
            model: 'gpt-4o',
            instructions: 'You are an expert evaluator of AI ethics responses. Format your response as JSON with a specific schema including overallScore, categoryScores, and strengths.',
            input: 'Evaluate this response to an AI Ethics question:\n\nQuestion: What are the ethical implications of AI in healthcare?\n\nResponse: AI in healthcare presents several ethical considerations. First, patient privacy must be protected when handling sensitive health data. Second, AI diagnosis systems must be transparent so healthcare providers understand how recommendations are made. Third, we must ensure these systems are tested across diverse populations to prevent bias. Finally, human oversight is crucial - AI should augment rather than replace medical professionals.',
            temperature: 0.4
        };
        try {
            const responsesResponse = await axios.post('https://api.openai.com/v1/responses', responsesRequestData, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Responses API call successful');
            // Also save the parsed response to a separate file
            fs.writeFileSync(path.join(logsDir, 'responses_result.json'), JSON.stringify(responsesResponse.data, null, 2));
        }
        catch (error) {
            // If 404, the endpoint might not exist or API is too old
            if (error.response && error.response.status === 404) {
                console.log('❌ Responses API not available (404) - Your OpenAI API version might not support this endpoint');
            }
            else {
                console.error('❌ Responses API call failed:', error.message);
            }
            // Test 2: Fall back to Chat Completions API
            console.log('\n2. Testing Chat Completions API instead...');
            const chatRequestData = {
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert evaluator of AI ethics responses. Format your response as JSON with a specific schema including overallScore, categoryScores, and strengths.'
                    },
                    {
                        role: 'user',
                        content: 'Evaluate this response to an AI Ethics question:\n\nQuestion: What are the ethical implications of AI in healthcare?\n\nResponse: AI in healthcare presents several ethical considerations. First, patient privacy must be protected when handling sensitive health data. Second, AI diagnosis systems must be transparent so healthcare providers understand how recommendations are made. Third, we must ensure these systems are tested across diverse populations to prevent bias. Finally, human oversight is crucial - AI should augment rather than replace medical professionals.'
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.4
            };
            const chatResponse = await axios.post('https://api.openai.com/v1/responses', chatRequestData, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Chat Completions API call successful');
            // Also save the parsed response to a separate file
            fs.writeFileSync(path.join(logsDir, 'chat_result.json'), JSON.stringify(chatResponse.data, null, 2));
        }
        console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
        console.log(`✅ API logs saved in: ${logsDir}`);
        return true;
    }
    catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        return false;
    }
}
// Run the test
testDirectOpenAIApiCall()
    .then(success => {
    process.exit(success ? 0 : 1);
})
    .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
