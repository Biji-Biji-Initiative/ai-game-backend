# Enhanced Evaluation System

This document explains how to use the enhanced evaluation system with personalized feedback, dynamic category weighting, and integration with the OpenAI Responses API.

## Overview

The evaluation system provides detailed assessment of user challenge responses with:

- **Database-driven category mappings**: Focus areas are mapped to evaluation categories dynamically
- **Personalized feedback**: Evaluation is tailored to user skill level, focus areas, and learning history
- **Dynamic category weighting**: Categories are weighted based on challenge type and user focus areas
- **Growth tracking**: Progress is tracked across evaluations to show improvement
- **Structured JSON outputs**: Responses API integration ensures consistent format

## Architecture

The evaluation system consists of these key components:

1. **Database Tables**:
   - `evaluation_categories`: Stores all possible evaluation categories with descriptions
   - `focus_area_category_mappings`: Maps focus areas to relevant categories with weights

2. **Repository Layer**:
   - `evaluationCategoryRepository.js`: Provides database access with fallback mechanisms

3. **Domain Models**:
   - `Evaluation.js`: Core domain model with rich functionality

4. **Prompt Building**:
   - `EvaluationPromptBuilder.js`: Creates dynamic, personalized prompts

5. **Services**:
   - `dynamicPromptService.js`: Advanced prompt building with granular control
   - `evaluationService.js`: Processes evaluation results and enriches with user context

## Setup

### 1. Run Database Migrations

Run the database migrations to create the necessary tables:

```bash
npm run migrate:eval-categories
```

Or run all migrations:

```bash
npm run migrate
```

### 2. Use the Evaluation Repository

```javascript
const { 
  getEvaluationCategories,
  getFocusAreaToCategoryMappings,
  getCategoryDescriptions,
  mapFocusAreasToCategories
} = require('./src/repositories/evaluationCategoryRepository');

// Get categories mapped to a user's focus areas
const categories = await mapFocusAreasToCategories(['AI Ethics', 'Critical Thinking']);
console.log(categories); // ['ethical_reasoning', 'stakeholder_consideration', ...]
```

### 3. Generate Evaluation Prompts

```javascript
const EvaluationPromptBuilder = require('./src/core/prompt/builders/EvaluationPromptBuilder');

const prompt = await EvaluationPromptBuilder.build({
  challenge: {
    title: 'AI Ethics Challenge',
    challengeType: 'analysis',
    focusArea: 'AI Ethics',
    // ...
  },
  userResponse: 'User's response here...',
  user: {
    focusAreas: ['AI Ethics', 'Critical Thinking'],
    skillLevel: 'intermediate',
    // ...
  },
  evaluationHistory: {
    previousScores: {
      overall: 75,
      ethical_reasoning: 78
    },
    // ...
  }
});
```

### 4. Process OpenAI Response

```javascript
const Evaluation = require('./src/core/evaluation/models/Evaluation');

// Create from OpenAI response
const evaluation = new Evaluation({
  userId: 'user-123',
  challengeId: 'challenge-456',
  score: openaiResponse.output.overallScore,
  categoryScores: openaiResponse.output.categoryScores,
  overallFeedback: openaiResponse.output.overallFeedback,
  strengths: openaiResponse.output.strengths,
  // ...
});

// Get personalized feedback
const feedback = evaluation.getPersonalizedFeedback();
```

## Testing

Run the integration tests to verify the evaluation system:

```bash
npm run test:eval-integration
```

Run the complete evaluation flow with the OpenAI Responses API:

```bash
npm run test:eval-flow
```

## Customization

### Adding New Categories

To add new evaluation categories:

1. Insert them into the `evaluation_categories` table
2. Map them to focus areas in the `focus_area_category_mappings` table

```sql
INSERT INTO evaluation_categories (code, name, description, is_system_defined)
VALUES ('new_category', 'New Category', 'Description of the new category', FALSE);

INSERT INTO focus_area_category_mappings (focus_area, category_code, weight)
VALUES ('Relevant Focus Area', 'new_category', 30);
```

### Customizing Category Weights

Modify the weights in the `focus_area_category_mappings` table to change how categories are weighted for specific focus areas.

## Integration with Responses API

The system is designed to work with OpenAI's Responses API:

```javascript
const openai = require('./src/lib/openai/OpenAIClient');

// Send prompt to OpenAI using Responses API
const response = await openai.createResponse({
  input: prompt, // The prepared evaluation prompt
  instructions: "You are an expert evaluator. Analyze the user's response to the challenge and provide a detailed evaluation...",
  response_format: { type: 'json_object' }, // Ensure JSON response
  max_tokens: 2000,
  conversation_id: challenge.conversationId // Optional, for stateful conversations
});

// Access response
const evaluationData = response.output;
const overallScore = evaluationData.overallScore;
const categoryScores = evaluationData.categoryScores;
const feedback = evaluationData.overallFeedback;
``` 