# Integration Tests

Tests that validate how different domains work together.

## Focus Areas

- Cross-domain event handling
- Workflow validation
- Domain interaction

## Available Tests

### Single-Domain Integration Tests

These tests verify the complete flow for individual domains:

1. **Focus Area Domain:** `focus-area-flow.test.js`
   - Generates a focus area recommendation using OpenAI
   - Stores it in Supabase
   - Retrieves it from the database

2. **Evaluation Domain:** `evaluation-flow.test.js`
   - Evaluates a challenge response using OpenAI
   - Stores the evaluation in Supabase
   - Retrieves it from the database

3. **Prompt Domain:** `prompt-flow.test.js`
   - Generates a prompt template using OpenAI
   - Stores it in Supabase
   - Retrieves it from the database

4. **Challenge Domain:** `openai-supabase-flow.test.js` 
   - Generates a challenge using OpenAI
   - Stores it in Supabase
   - Retrieves it from the database

### Cross-Domain Integration Tests

These tests verify interactions between multiple domains:

1. **Challenge-Evaluation Flow:** `challenge-evaluation-flow.test.js`
   - Generates a challenge using OpenAI
   - Stores the challenge in Supabase
   - Simulates a response to the challenge
   - Evaluates the response using OpenAI
   - Stores the evaluation in Supabase
   - Retrieves both challenge and evaluation from database
   - Tests the relationship between challenges and evaluations

## Running the Tests

### Prerequisites

Before running the tests, ensure you have:

1. Set up your environment variables in `.env`:
   ```
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

2. Installed dependencies:
   ```
   npm install
   ```

### Running All Integration Tests

```
npm run test:integration
```

### Running Specific Integration Tests

#### Test Focus Area Flow
```
mocha --require ./tests/helpers/globalSetup.js tests/integration/focus-area-flow.test.js
```

#### Test Evaluation Flow
```
mocha --require ./tests/helpers/globalSetup.js tests/integration/evaluation-flow.test.js
```

#### Test Prompt Flow
```
mocha --require ./tests/helpers/globalSetup.js tests/integration/prompt-flow.test.js
```

#### Test Challenge Flow
```
npm run test:integration:openai-supabase
```

#### Test Challenge-Evaluation Cross-Domain Flow
```
mocha --require ./tests/helpers/globalSetup.js tests/integration/challenge-evaluation-flow.test.js
```

## Test Logs

All test logs are stored in the `tests/integration/logs` directory. Each test run creates timestamped JSON log files that record:

- API calls made to OpenAI
- Data sent to Supabase
- Data retrieved from Supabase
- Any errors encountered

These logs are valuable for debugging and understanding the test flow.
