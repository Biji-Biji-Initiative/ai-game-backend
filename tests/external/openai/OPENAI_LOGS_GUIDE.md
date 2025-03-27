# Guide to OpenAI Logs and Testing

This guide explains how to set up and run tests that will appear in the OpenAI platform logs.

## Prerequisites

1. You need an OpenAI API key with access to the models we're using
2. Your `.env` file must include the following:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Running OpenAI Log Tests

### Method 1: Use the Interactive Test Runner

1. Run the interactive test tool:
   ```bash
   npm run test:run
   ```

2. Select the "OpenAI API Logs" option from the menu

3. The test will:
   - Make direct API calls to OpenAI
   - Save detailed logs in the `tests/real-api/openai/direct_logs/` directory
   - Display API requests and responses in the console

### Method 2: Run the OpenAI Log Test Directly

Run the following command:
```bash
npm run test:openai:logs
```

## Viewing Logs in the OpenAI Platform

1. Log in to the [OpenAI Platform](https://platform.openai.com/)
2. Navigate to "API Keys" in the left menu
3. Click on "Usage" to see API usage stats
4. Click on "Playground" to see recent requests

### Advanced: The OpenAI Logs Dashboard

1. In the OpenAI Platform, click on your organization name in the top right
2. Select "Manage organization"
3. Click on "API usage & logs" in the left menu
4. Here you can:
   - See all API calls made with your API key
   - Filter by date range, model, endpoint, etc.
   - View request and response details for each call
   - Download logs for further analysis

## Troubleshooting

If you don't see logs in the OpenAI platform:

1. **Check API Key**: Make sure you're using the correct API key
   ```bash
   # Check if API key is set in your environment
   echo $OPENAI_API_KEY
   ```

2. **API Key Permissions**: Verify your API key has the necessary permissions:
   - Go to "API keys" in the OpenAI platform
   - Check if your key is active and has the right permissions

3. **Request Timing**: It can take up to 5-10 minutes for logs to appear in the OpenAI platform

4. **Local Logs**: Check the local logs in the `tests/real-api/openai/direct_logs/` directory to confirm API calls were made

5. **Network Issues**: Make sure your network allows connections to the OpenAI API:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

## Common Issues

1. **Rate Limits**: If you see 429 errors, you've hit the rate limit. Wait and try again later.

2. **Authentication Errors**: 401 errors mean your API key is invalid or expired.

3. **No Logs Created**: Make sure the `tests/real-api/openai/direct_logs/` directory exists and is writable.

## Advanced: Customizing the Tests

To customize the API calls being made:

1. Open `tests/real-api/openai/test-direct-api-logs.js`
2. Modify the request data in the `testDirectOpenAIApiCall` function
3. Run the test again to see your customized API calls in the logs 