# Evaluation API

This document describes the Evaluation API endpoints for the AI Fight Club API.

## Overview

The Evaluation API provides access to the AI-powered evaluation system that assesses user responses to challenges. It offers capabilities for:

1. Retrieving evaluations for challenge responses
2. Accessing detailed feedback and scoring
3. Viewing evaluation criteria and categories
4. Managing evaluation settings (admin only)

## Endpoints

### Get Evaluation for Response

```
GET /api/v1/evaluations/response/:responseId
```

Retrieves the evaluation for a specific challenge response.

#### Response

```json
{
  "success": true,
  "data": {
    "evaluationId": "eval-101",
    "responseId": "response-789",
    "challengeId": "challenge-456",
    "userId": "user-123",
    "createdAt": "2023-04-14T15:35:00Z",
    "status": "completed", // in_progress, completed
    "scores": {
      "overall": 85,
      "categories": {
        "critical_thinking": 90,
        "ethical_reasoning": 87,
        "technical_depth": 75,
        "communication": 88
      }
    },
    "feedback": {
      "summary": "Your response demonstrates strong ethical reasoning and critical thinking skills...",
      "strengths": [
        {
          "category": "critical_thinking",
          "description": "Excellent analysis of stakeholder perspectives"
        },
        {
          "category": "ethical_reasoning",
          "description": "Strong application of ethical frameworks"
        }
      ],
      "areasForImprovement": [
        {
          "category": "technical_depth",
          "description": "Consider deeper exploration of technical implementation details"
        }
      ],
      "detailedFeedback": [
        {
          "questionId": "q1",
          "feedback": "Your identification of key ethical considerations was comprehensive..."
        },
        {
          "questionId": "q2",
          "feedback": "Good suggestions for addressing bias, consider adding more specific techniques..."
        }
      ]
    },
    "growth": {
      "trend": "improving",
      "comparedToPrevious": "+5",
      "strongestCategory": "ethical_reasoning",
      "mostImprovedCategory": "critical_thinking",
      "focusRecommendation": "technical_depth"
    }
  }
}
```

### List User Evaluations

```
GET /api/v1/evaluations
```

Lists evaluations for the authenticated user.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `focusAreaId` | string | Filter by focus area |
| `from` | string | Start date (ISO format) |
| `to` | string | End date (ISO format) |
| `categoryCode` | string | Filter by evaluation category |
| `minScore` | number | Minimum overall score |
| `maxScore` | number | Maximum overall score |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "evaluationId": "eval-101",
      "challengeId": "challenge-456",
      "challengeTitle": "AI Ethics in Healthcare",
      "createdAt": "2023-04-14T15:35:00Z",
      "overallScore": 85,
      "focusArea": "AI Ethics",
      "strengths": ["Critical thinking", "Ethical reasoning"],
      "areasForImprovement": ["Technical depth"]
    },
    {
      "evaluationId": "eval-102",
      "challengeId": "challenge-457",
      "challengeTitle": "Explainable AI Systems",
      "createdAt": "2023-04-10T09:30:00Z",
      "overallScore": 82,
      "focusArea": "AI Transparency",
      "strengths": ["Technical depth", "Solution design"],
      "areasForImprovement": ["Communication clarity"]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### Get Evaluation Categories

```
GET /api/v1/evaluations/categories
```

Lists all evaluation categories with descriptions.

#### Response

```json
{
  "success": true,
  "data": [
    {
      "code": "critical_thinking",
      "name": "Critical Thinking",
      "description": "Ability to analyze information objectively and make reasoned judgments",
      "associatedFocusAreas": ["Critical Thinking", "Problem Solving", "AI Ethics"]
    },
    {
      "code": "ethical_reasoning",
      "name": "Ethical Reasoning",
      "description": "Application of ethical frameworks to identify and address moral considerations",
      "associatedFocusAreas": ["AI Ethics", "Responsible AI"]
    },
    {
      "code": "technical_depth",
      "name": "Technical Depth",
      "description": "Understanding of technical concepts and their practical application",
      "associatedFocusAreas": ["AI Architecture", "Machine Learning", "System Design"]
    },
    {
      "code": "communication",
      "name": "Communication",
      "description": "Clarity and effectiveness in expressing ideas and concepts",
      "associatedFocusAreas": ["Communication", "Stakeholder Management"]
    }
  ]
}
```

### Get User Growth Report

```
GET /api/v1/evaluations/growth
```

Retrieves a growth report showing progress over time.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `focusAreaId` | string | Filter by focus area (optional) |
| `categoryCode` | string | Filter by evaluation category (optional) |
| `timeframe` | string | Timeframe for the report (week, month, quarter, year) |

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "timeframe": "month",
    "startDate": "2023-03-15T00:00:00Z",
    "endDate": "2023-04-15T00:00:00Z",
    "overallGrowth": {
      "startScore": 75,
      "currentScore": 85,
      "improvement": 10,
      "percentageImprovement": 13.3
    },
    "categoryGrowth": [
      {
        "categoryCode": "critical_thinking",
        "categoryName": "Critical Thinking",
        "startScore": 70,
        "currentScore": 90,
        "improvement": 20,
        "percentageImprovement": 28.6
      },
      {
        "categoryCode": "ethical_reasoning",
        "categoryName": "Ethical Reasoning",
        "startScore": 80,
        "currentScore": 87,
        "improvement": 7,
        "percentageImprovement": 8.8
      },
      {
        "categoryCode": "technical_depth",
        "categoryName": "Technical Depth",
        "startScore": 72,
        "currentScore": 75,
        "improvement": 3,
        "percentageImprovement": 4.2
      }
    ],
    "timeSeriesData": [
      {
        "date": "2023-03-15T00:00:00Z",
        "overallScore": 75,
        "categories": {
          "critical_thinking": 70,
          "ethical_reasoning": 80,
          "technical_depth": 72
        }
      },
      {
        "date": "2023-03-22T00:00:00Z",
        "overallScore": 78,
        "categories": {
          "critical_thinking": 75,
          "ethical_reasoning": 82,
          "technical_depth": 72
        }
      },
      {
        "date": "2023-04-01T00:00:00Z",
        "overallScore": 82,
        "categories": {
          "critical_thinking": 85,
          "ethical_reasoning": 85,
          "technical_depth": 74
        }
      },
      {
        "date": "2023-04-15T00:00:00Z",
        "overallScore": 85,
        "categories": {
          "critical_thinking": 90,
          "ethical_reasoning": 87,
          "technical_depth": 75
        }
      }
    ],
    "insights": [
      "Strongest improvement in Critical Thinking at 28.6%",
      "Consistent growth in Ethical Reasoning",
      "Opportunity to focus on Technical Depth"
    ],
    "recommendations": [
      {
        "categoryCode": "technical_depth",
        "recommendation": "Consider challenges focused on technical implementation details",
        "suggestedChallenges": ["challenge-458", "challenge-460"]
      }
    ]
  }
}
```

## Admin Endpoints

### Update Category Weights

```
PATCH /api/v1/admin/evaluations/category-weights
```

Updates the weight for specific evaluation categories (admin only).

#### Request Body

```json
{
  "focusAreaId": "focus-area-123",
  "categoryWeights": [
    {
      "categoryCode": "critical_thinking",
      "weight": 30
    },
    {
      "categoryCode": "ethical_reasoning",
      "weight": 40
    },
    {
      "categoryCode": "technical_depth",
      "weight": 20
    },
    {
      "categoryCode": "communication",
      "weight": 10
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "focusAreaId": "focus-area-123",
    "focusAreaName": "AI Ethics",
    "categoryWeights": [
      {
        "categoryCode": "critical_thinking",
        "weight": 30
      },
      {
        "categoryCode": "ethical_reasoning",
        "weight": 40
      },
      {
        "categoryCode": "technical_depth",
        "weight": 20
      },
      {
        "categoryCode": "communication",
        "weight": 10
      }
    ],
    "updatedAt": "2023-04-15T10:00:00Z"
  }
}
```

### Add Evaluation Category

```
POST /api/v1/admin/evaluations/categories
```

Adds a new evaluation category (admin only).

#### Request Body

```json
{
  "code": "innovation",
  "name": "Innovation",
  "description": "Ability to generate novel ideas and approaches",
  "associatedFocusAreas": ["Creative Problem Solving", "AI Research"]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "code": "innovation",
    "name": "Innovation",
    "description": "Ability to generate novel ideas and approaches",
    "associatedFocusAreas": ["Creative Problem Solving", "AI Research"],
    "createdAt": "2023-04-15T11:00:00Z"
  }
}
```

## Error Handling

### Evaluation Not Found

```json
{
  "success": false,
  "error": {
    "code": "EVALUATION_NOT_FOUND",
    "message": "The specified evaluation was not found",
    "details": {
      "evaluationId": "eval-999"
    }
  }
}
```

### Response Not Yet Evaluated

```json
{
  "success": false,
  "error": {
    "code": "RESPONSE_NOT_EVALUATED",
    "message": "The response has not been evaluated yet",
    "details": {
      "responseId": "response-789",
      "status": "submitted",
      "submittedAt": "2023-04-15T11:30:00Z",
      "estimatedCompletionTime": "2 minutes"
    }
  }
}
```

## See Also

- [Challenge API](./challenge-api.md)
- [Focus Area API](./focus-area-api.md)
- [Progress API](./progress-api.md) 