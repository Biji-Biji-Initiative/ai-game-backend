# Quick Start Guide

This guide will get you up and running with the AI Fight Club API as quickly as possible.

## 5-Minute Setup

### 1. Prerequisites

- Node.js v14+
- OpenAI API key
- Supabase account

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-fight-club-api.git
cd ai-fight-club-api

# Install dependencies
npm install

# Create environment file
cp .env.template .env
```

### 3. Configure

Edit the `.env` file with your API keys:

```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 4. Start the server

```bash
npm run dev
```

The server will start at http://localhost:3000

## Your First API Call

Let's create a new user and generate a challenge:

### 1. Create a User

```bash
curl -X POST http://localhost:3000/api/users/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "professionalTitle": "Software Engineer",
    "personalityTraits": {
      "creativity": 80,
      "analyticalThinking": 85,
      "empathy": 75,
      "riskTaking": 60,
      "adaptability": 90
    },
    "aiAttitudes": {
      "trust": 70,
      "jobConcerns": 50,
      "impact": 80,
      "interest": 95,
      "interaction": 85
    }
  }'
```

This will create a user and return recommended focus areas.

### 2. Generate a Challenge

```bash
curl -X POST http://localhost:3000/api/challenges/generate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "focusArea": "AI Ethics"
  }'
```

This will generate a personalized challenge and return its details, including a `challengeId`.

### 3. Submit a Challenge Response

```bash
curl -X POST http://localhost:3000/api/challenges/{challengeId}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      {
        "questionId": "q1",
        "answer": "My response to the first question..."
      },
      {
        "questionId": "q2",
        "answer": "My response to the second question..."
      }
    ]
  }'
```

Replace `{challengeId}` with the actual ID from the previous step.

## What's Next?

- Check out the [full documentation](./docs/README.md) for more information
- Explore [API endpoints](./docs/api/README.md) in detail
- Learn about the [architecture](./docs/architecture/README.md) 