# Focus Area Tests

## Overview

This directory contains test scripts for the Focus Area module, which is responsible for generating personalized AI communication focus areas for users.

## Test Scripts

### `test-focus-areas.js`

This script comprehensively tests the Focus Area module, including:

1. Domain model validation
2. Thread service functionality
3. Focus area generation with OpenAI
4. API-level service integration

### How to Run

Make sure you have the required environment variables set in your `.env` file:

```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

Then run the test script:

```bash
node tests/focus-areas/test-focus-areas.js
```

## What's Being Tested

1. **Domain Model** - Tests the FocusArea class and its validation logic
2. **Thread Service** - Tests creation and management of conversation threads
3. **Generation Service** - Tests generation of focus areas using OpenAI Responses API
4. **Main Service** - Tests the API-level service that coordinates the other components

## Expected Output

On success, you should see:

```
==== TEST RESULTS ====
domainModel: ✅ PASSED
threadService: ✅ PASSED
generationService: ✅ PASSED
mainService: ✅ PASSED

All tests passed! 🎉
```

If any test fails, the script will show detailed error information to help diagnose the issue. 