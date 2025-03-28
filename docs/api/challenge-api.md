# Challenge API

This document describes the Challenge API endpoints for the AI Fight Club API.

## Overview

The Challenge API allows clients to:

1. Generate personalized challenges for users
2. Submit responses to challenges
3. Retrieve challenge history and details
4. Manage challenge templates and configurations

## Endpoints

### Generate a Challenge

```
POST /api/v1/challenges/generate
```

Generates a new challenge for the authenticated user.

#### Request Body

```json
{
  "focusAreaId": "focus-area-123",
  "difficultyLevel": "intermediate",
  "challengeType": "case_study", // Optional, defaults to system recommendation
  "preferredFormat": "markdown"  // Optional
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "challengeId": "challenge-456",
    "title": "AI Ethics in Healthcare",
    "description": "In this challenge, you will analyze an AI system used for medical diagnosis...",
    "instructions": "Read the case study and answer the following questions...",
    "scenario": "Memorial Hospital recently implemented an AI system to assist in diagnosing...",
    "questions": [
      {
        "id": "q1",
        "text": "What are the key ethical considerations in this scenario?"
      },
      {
        "id": "q2",
        "text": "How would you address the bias concerns mentioned in the case study?"
      }
    ],
    "timeEstimate": 15, // minutes
    "difficultyLevel": "intermediate",
    "focusArea": {
      "id": "focus-area-123",
      "name": "AI Ethics"
    },
    "expiresAt": "2023-04-15T12:00:00Z"
  }
}
```

### Submit Challenge Response

```
POST /api/v1/challenges/:challengeId/responses
```

Submits a response to a specific challenge.

#### Request Body

```json
{
  "responses": [
    {
      "questionId": "q1",
      "answer": "The key ethical considerations include patient privacy, algorithm transparency..."
    },
    {
      "questionId": "q2",
      "answer": "To address bias concerns, I would recommend the following approaches..."
    }
  ],
  "completionTime": 12 // minutes it took to complete (optional)
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "responseId": "response-789",
    "submittedAt": "2023-04-14T15:30:00Z",
    "status": "submitted",
    "nextSteps": {
      "evaluationEstimate": "2 minutes",
      "nextAction": "/api/v1/evaluations/response-789"
    }
  }
}
```

### Get Challenge Details

```
GET /api/v1/challenges/:challengeId
```

Retrieves detailed information about a specific challenge.

#### Response

```json
{
  "success": true,
  "data": {
    "challengeId": "challenge-456",
    "title": "AI Ethics in Healthcare",
    "description": "In this challenge, you will analyze an AI system used for medical diagnosis...",
    "status": "active", // active, completed, expired
    "createdAt": "2023-04-14T10:00:00Z",
    "expiresAt": "2023-04-15T12:00:00Z",
    "challengeType": "case_study",
    "difficultyLevel": "intermediate",
    "focusArea": {
      "id": "focus-area-123",
      "name": "AI Ethics"
    },
    "response": {
      "id": "response-789",
      "submittedAt": "2023-04-14T15:30:00Z",
      "status": "evaluated" // submitted, evaluating, evaluated
    },
    "evaluation": {
      "id": "eval-101",
      "score": 85,
      "completedAt": "2023-04-14T15:35:00Z"
    }
  }
}
```

### List User Challenges

```
GET /api/v1/challenges
```

Retrieves a list of challenges for the authenticated user.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (active, completed, expired) |
| `focusAreaId` | string | Filter by focus area |
| `from` | string | Start date (ISO format) |
| `to` | string | End date (ISO format) |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "challengeId": "challenge-456",
      "title": "AI Ethics in Healthcare",
      "status": "active",
      "createdAt": "2023-04-14T10:00:00Z",
      "focusArea": "AI Ethics",
      "difficultyLevel": "intermediate"
    },
    {
      "challengeId": "challenge-457",
      "title": "Explainable AI Systems",
      "status": "completed",
      "createdAt": "2023-04-10T09:00:00Z",
      "focusArea": "AI Transparency",
      "difficultyLevel": "advanced"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Get Challenge Response

```
GET /api/v1/challenges/:challengeId/responses/:responseId
```

Retrieves a specific response to a challenge.

#### Response

```json
{
  "success": true,
  "data": {
    "responseId": "response-789",
    "challengeId": "challenge-456",
    "submittedAt": "2023-04-14T15:30:00Z",
    "completionTime": 12,
    "responses": [
      {
        "questionId": "q1",
        "question": "What are the key ethical considerations in this scenario?",
        "answer": "The key ethical considerations include patient privacy, algorithm transparency..."
      },
      {
        "questionId": "q2",
        "question": "How would you address the bias concerns mentioned in the case study?",
        "answer": "To address bias concerns, I would recommend the following approaches..."
      }
    ],
    "evaluation": {
      "id": "eval-101",
      "score": 85,
      "strengths": ["Critical thinking", "Ethical reasoning"],
      "areasForImprovement": ["Technical depth"],
      "feedback": "Your analysis shows strong ethical reasoning..."
    }
  }
}
```

## Challenge Templates API

### List Challenge Templates

```
GET /api/v1/challenges/templates
```

Lists available challenge templates (admin only).

#### Response

```json
{
  "success": true,
  "data": [
    {
      "templateId": "template-123",
      "name": "AI Ethics Case Study",
      "description": "A template for AI ethics case studies",
      "challengeType": "case_study",
      "targetSkillLevel": "intermediate",
      "focusAreas": ["AI Ethics", "Critical Thinking"],
      "active": true
    },
    {
      "templateId": "template-124",
      "name": "Technical Design Challenge",
      "description": "A template for technical design challenges",
      "challengeType": "design",
      "targetSkillLevel": "advanced",
      "focusAreas": ["System Design", "AI Architecture"],
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8
  }
}
```

### Create Challenge Template

```
POST /api/v1/challenges/templates
```

Creates a new challenge template (admin only).

#### Request Body

```json
{
  "name": "Responsible AI Reflection",
  "description": "A template for reflecting on responsible AI implementation",
  "challengeType": "reflection",
  "structure": {
    "introduction": "In this challenge, you will reflect on the implementation of AI in a specific context...",
    "sections": [
      {
        "title": "Context Analysis",
        "description": "Analyze the context where AI is being implemented...",
        "questionPrompt": "What are the key stakeholders and their concerns?"
      },
      {
        "title": "Ethical Considerations",
        "description": "Identify ethical considerations...",
        "questionPrompt": "What ethical principles are most relevant here?"
      }
    ],
    "conclusion": "Synthesize your analysis to provide recommendations..."
  },
  "targetSkillLevel": "intermediate",
  "focusAreas": ["Responsible AI", "AI Ethics"],
  "evaluationCriteria": {
    "contextAnalysis": {
      "weight": 30,
      "description": "Depth of context analysis and stakeholder identification"
    },
    "ethicalReasoning": {
      "weight": 40,
      "description": "Quality of ethical reasoning and principle application"
    },
    "recommendations": {
      "weight": 30,
      "description": "Practicality and innovation of recommendations"
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "templateId": "template-125",
    "name": "Responsible AI Reflection",
    "description": "A template for reflecting on responsible AI implementation",
    "createdAt": "2023-04-14T16:00:00Z",
    "active": true
  }
}
```

## Error Handling

### Challenge Not Found

```json
{
  "success": false,
  "error": {
    "code": "CHALLENGE_NOT_FOUND",
    "message": "The specified challenge was not found",
    "details": {
      "challengeId": "challenge-999"
    }
  }
}
```

### Permission Denied

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to access this challenge",
    "details": {
      "challengeId": "challenge-456",
      "requiredRole": "admin"
    }
  }
}
```

### Response Already Submitted

```json
{
  "success": false,
  "error": {
    "code": "RESPONSE_ALREADY_SUBMITTED",
    "message": "A response has already been submitted for this challenge",
    "details": {
      "challengeId": "challenge-456",
      "responseId": "response-789",
      "submittedAt": "2023-04-14T15:30:00Z"
    }
  }
}
```

## See Also

- [Evaluation API](./evaluation-api.md)
- [Focus Area API](./focus-area-api.md)
- [Progress API](./progress-api.md) 