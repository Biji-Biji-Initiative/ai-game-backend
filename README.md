# AI Fight Club API

A stateful web app that challenges users with dynamic, AI-generated cognitive challenges to highlight their unique "Human Edge" in an increasingly AI-driven world.

## Features

### User Onboarding & Survey
- Collects basic user information
- Personality assessment data
- AI attitude responses

### Dynamic Content Generation
- Aggregates survey data and computes key metrics
- Generates personalized personality insights using OpenAI's Responses API
- Recommends focus areas based on user profiles

### Challenge System
- Generates personalized cognitive challenges
- Provides real-time evaluation and feedback
- Tracks user progress and improvement

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key
- Supabase account and project (for data persistence)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-fight-club-api.git
cd ai-fight-club-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

4. Start the server:
```bash
npm start
```

5. (Optional) Start in development mode with auto-restart:
```bash
npm run dev
```

6. (Optional) Run the terminal client for testing:
```bash
npm run terminal
```

## API Endpoints

### Health Check
```
GET /api/health
- Returns API status and environment
```

### User Routes
```
POST /api/users/onboard
- Creates new user profile
- Generates personality insights
- Returns recommended focus areas

GET /api/users/:email
- Retrieves user profile by email

PUT /api/users/:email/focus-area
- Updates user's focus area
```

### Challenge Routes
```
POST /api/challenges/generate
- Generates new cognitive challenges
- Personalizes based on user profile

POST /api/challenges/:challengeId/submit
- Evaluates user responses
- Provides detailed feedback
- Updates user progress

GET /api/challenges/user/:email/history
- Retrieves user's challenge history
```

## Data Models

### User Profile
```json
{
  "email": "john@example.com",
  "fullName": "John Doe",
  "professionalTitle": "Software Engineer",
  "location": "San Francisco",
  "country": "USA",
  "personalityTraits": {
    "creativity": 85,
    "analyticalThinking": 90,
    "empathy": 70,
    "riskTaking": 65,
    "adaptability": 80
  },
  "aiAttitudes": {
    "trust": 60,
    "jobConcerns": 40,
    "impact": 75,
    "interest": 90,
    "interaction": 85
  },
  "dominantTraits": ["analyticalThinking", "creativity", "adaptability"],
  "traitClusters": ["analytical", "creative"],
  "focusArea": "AI Ethics",
  "insights": {
    "personalityInsights": "You demonstrate strong analytical skills with creative tendencies...",
    "aiAttitudeProfile": "Your perspective on AI is generally positive...",
    "recommendedChallengeTypes": ["critical-thinking", "creative-synthesis"],
    "suggestedFocusAreas": ["AI Ethics", "Creative AI Applications"]
  },
  "performance": {
    "completedChallenges": 5,
    "averageScore": 78,
    "strengthAreas": ["critical-thinking", "analyticalThinking"],
    "improvementAreas": ["empathy", "ethical-dilemma"],
    "streaks": {
      "current": 2,
      "longest": 3
    }
  },
  "createdAt": "2023-11-01T12:00:00Z",
  "lastActive": "2023-11-02T15:30:00Z"
}
```

### Challenge
```json
{
  "id": "john-1699123456-123",
  "userEmail": "john@example.com",
  "type": "critical-thinking",
  "focusArea": "AI Ethics",
  "prompt": "You are tasked with developing an AI system for healthcare...",
  "context": "Consider the ethical implications of AI in healthcare...",
  "questions": [
    {
      "id": "q1",
      "text": "What are the key ethical considerations...?",
      "type": "open-ended"
    },
    {
      "id": "q2",
      "text": "How would you balance privacy concerns with healthcare benefits?",
      "type": "open-ended"
    }
  ],
  "status": "active",
  "createdAt": "2023-11-02T10:00:00Z",
  "submittedAt": null,
  "completedAt": null,
  "response": null,
  "evaluation": null
}
```

## Example Usage

### User Onboarding
```bash
curl -X POST http://localhost:3000/api/users/onboard \
-H "Content-Type: application/json" \
-d '{
  "fullName": "John Doe",
  "email": "john@example.com",
  "professionalTitle": "Software Engineer",
  "location": "San Francisco",
  "country": "USA",
  "personalityTraits": {
    "creativity": 85,
    "analyticalThinking": 90,
    "empathy": 70,
    "riskTaking": 65,
    "adaptability": 80
  },
  "aiAttitudes": {
    "trust": 60,
    "jobConcerns": 40,
    "impact": 75,
    "interest": 90,
    "interaction": 85
  }
}'
```

### Generate Challenge
```bash
curl -X POST http://localhost:3000/api/challenges/generate \
-H "Content-Type: application/json" \
-d '{
  "email": "john@example.com",
  "focusArea": "AI Ethics"
}'
```

### Submit Challenge Response
```bash
curl -X POST http://localhost:3000/api/challenges/john-1699123456-123/submit \
-H "Content-Type: application/json" \
-d '{
  "responses": [
    {
      "questionId": "q1",
      "answer": "The key ethical considerations include..."
    },
    {
      "questionId": "q2",
      "answer": "To balance privacy concerns with healthcare benefits..."
    }
  ]
}'
```

## Terminal Client

The project includes a terminal-based client for testing the API without a frontend. Run it with:

```bash
npm run terminal
```

The terminal client guides you through:
- User onboarding
- Challenge generation
- Response submission
- Viewing challenge history
- Updating focus areas

## Error Handling

The API uses standardized error responses:
```json
{
  "status": "error",
  "message": "Error description",
  "errorCode": "RESOURCE_NOT_FOUND",
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid input data
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `DUPLICATE_RESOURCE`: Resource already exists
- `OPENAI_API_ERROR`: Error from OpenAI API
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## Logging

Logs are stored in:
- `error.log`: Error-level logs
- `combined.log`: All logs

In development, logs are also printed to the console.

## Project Structure

```
.
├── index.js               # Application entry point
├── .env                   # Environment variables
├── package.json           # Dependencies and scripts
├── src/
│   ├── app.js            # Express application setup
│   ├── config/           # Configuration files
│   ├── routes/           # API route definitions
│   │   ├── userRoutes.js
│   │   └── challengeRoutes.js
│   ├── utils/            # Utility functions
│   │   ├── logger.js
│   │   ├── errorHandler.js
│   │   ├── openaiClient.js
│   │   └── dataUtils.js
│   └── terminal-client.js # Terminal-based client
└── logs/                  # Log files
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Testing Focus Area Generation

The system now supports generating personalized focus areas for users based on their profiles. These focus areas are AI communication topics tailored to users based on their personality traits, AI attitudes, and professional background.

To test focus area generation:

1. Ensure your environment variables are set up correctly:
   ```
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_key
   ```

2. Run the dedicated test script:
   ```
   node test-focus-areas.js
   ```

This script will:
- Create a test user with sample data
- Create a conversation thread for the user
- Generate personalized focus areas using OpenAI
- Display the generated focus areas

The focus areas are structured objects that include:
- Name of the focus area
- Description and rationale
- Improvement strategies
- Recommended challenge types
- Priority level

These focus areas are stored in the Supabase database and can be retrieved and regenerated as needed.

# Integration Testing

We've implemented a comprehensive suite of integration tests to ensure our Domain-Driven Design architecture works correctly across different components:

## Test Structure

- **Prompt Builder Integration**: Tests the Prompt Builder facade with different prompt builders
- **Schema Validation**: Verifies that each schema correctly validates parameters
- **Domain Events**: Tests cross-domain communication through the event system
- **Challenge Domain**: Tests the Challenge model, repository, and related components
- **Cross-Domain Communication**: Verifies that Challenge and Focus Area domains interact correctly

## Running the Tests

To run the integration tests:

```bash
# Install dependencies
npm install

# Run all integration tests
npm run test:integration

# Run specific test groups
npm run test:prompt     # Test prompt system
npm run test:domain     # Test domain models
npm run test:events     # Test event system
npm run test:cross-domain # Test cross-domain communication
```

## Key Testing Patterns

1. **Setup and Teardown**: Each test resets state to ensure isolation
2. **Mock Services**: Services are mocked to focus on integration points
3. **Event Spies**: Domain events are spied on to verify publication
4. **Cross-Domain Verification**: Changes in one domain are verified in another

## Benefits of Integration Testing

- **Ensures Loose Coupling**: Verifies domains communicate properly without tight dependencies
- **Validates Schema Integrity**: Ensures parameter validation works across boundaries
- **Confirms Event Flow**: Tests that domain events flow correctly between components
- **Verifies Repository Pattern**: Tests that data persistence works correctly

These integration tests complement unit tests by verifying that components work together as expected, ensuring the robustness of our DDD architecture.

# Responses API Development Project

## Script Organization

This project has been organized with a clear structure for scripts:

### Core Scripts (`scripts/`)

Essential scripts for testing, environment setup, and database operations:
- Test execution scripts (run-tests.js, run-tests-with-db-check.sh)
- Environment setup (setup-test-env.js, create-test-user.js)
- Database operations (planned to be replaced with Supabase CLI)

[View scripts documentation](scripts/README.md)

### Development Scripts (`dev-scripts/`)

Utilities for manual debugging, testing, and exploration:
- Authentication testing
- Evaluation flow testing
- OpenAI API exploration
- Prompt building testing

[View dev-scripts documentation](dev-scripts/README.md)

### Archived Scripts (`archive/scripts/`)

One-time scripts used during refactoring or migration that are kept for reference only:
- Test structure migration scripts
- Cleanup scripts
- Import update utilities

[View archived scripts documentation](archive/scripts/README.md)

## Development Workflow

### Running Tests

```bash
# Run the interactive test runner
npm run test:run

# Run tests with database connectivity checks
npm run test:integration:with-checks

# Run specific test domains
npm run test:domain:user
npm run test:domain:challenge
```

### Setting Up Environment

```bash
# Set up test environment
npm run setup:test

# Create a test user for testing
npm run setup:test-user

# Get an authentication token
npm run get:token
```

### Database Operations

We've started migrating to Supabase CLI for database operations:

```bash
# Create a new migration
npm run migrate your-migration-name

# Push migrations to the database
npm run db:push

# Reset the database
npm run db:reset
```

## Using Development Scripts

For manual testing and debugging:

```bash
# Test authentication
npm run dev:auth

# Test evaluation flow
npm run dev:flow

# Test OpenAI integration
npm run dev:openai

# View stored evaluations
npm run dev:view-evals
```
