# Focus Area API

This document describes the Focus Area API endpoints for the AI Fight Club API.

## Overview

The Focus Area API provides access to the learning topics and skill areas that organize the AI Fight Club content. It enables:

1. Browsing available focus areas
2. Managing user focus area preferences
3. Retrieving learning materials and resources for specific topics
4. Tracking progress in different focus areas

## Endpoints

### List Focus Areas

```
GET /api/v1/focus-areas
```

Retrieves a list of available focus areas.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `categoryId` | string | Filter by category |
| `skillLevel` | string | Filter by skill level (beginner, intermediate, advanced) |
| `popular` | boolean | Sort by popularity |
| `search` | string | Search term |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "focus-area-123",
      "name": "AI Ethics",
      "description": "Explore ethical considerations in AI development and deployment",
      "shortDescription": "Ethical AI practices",
      "icon": "ethics_icon",
      "category": "Responsible AI",
      "difficulty": "intermediate",
      "popularity": 92,
      "userCount": 1245,
      "challengeCount": 32
    },
    {
      "id": "focus-area-124",
      "name": "AI Transparency",
      "description": "Learn techniques for making AI systems more explainable and transparent",
      "shortDescription": "Explainable AI",
      "icon": "transparency_icon",
      "category": "Responsible AI",
      "difficulty": "advanced",
      "popularity": 85,
      "userCount": 978,
      "challengeCount": 28
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

### Get Focus Area Details

```
GET /api/v1/focus-areas/:focusAreaId
```

Retrieves detailed information about a specific focus area.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "focus-area-123",
    "name": "AI Ethics",
    "description": "Explore ethical considerations in AI development and deployment",
    "longDescription": "AI Ethics focuses on ensuring that artificial intelligence systems are designed and used in ways that align with human values and ethical principles. This focus area covers topics including bias mitigation, fairness, transparency, privacy, and the societal impacts of AI deployment.",
    "icon": "ethics_icon",
    "category": "Responsible AI",
    "difficulty": "intermediate",
    "popularity": 92,
    "userCount": 1245,
    "challengeCount": 32,
    "learningObjectives": [
      "Understand key ethical frameworks for evaluating AI systems",
      "Identify potential ethical issues in AI applications",
      "Apply techniques for mitigating bias in AI systems",
      "Develop strategies for responsible AI deployment"
    ],
    "prerequisites": [
      {
        "id": "focus-area-120",
        "name": "AI Fundamentals",
        "required": false
      }
    ],
    "relatedAreas": [
      {
        "id": "focus-area-124",
        "name": "AI Transparency",
        "similarity": 0.85
      },
      {
        "id": "focus-area-125",
        "name": "Responsible AI",
        "similarity": 0.78
      }
    ],
    "resources": [
      {
        "type": "article",
        "title": "Introduction to AI Ethics",
        "url": "https://aifightclub.com/resources/ai-ethics-intro",
        "estimatedTime": 15
      },
      {
        "type": "video",
        "title": "Ethical AI Case Studies",
        "url": "https://aifightclub.com/resources/ai-ethics-cases",
        "estimatedTime": 25
      }
    ],
    "evaluationCategories": [
      {
        "code": "ethical_reasoning",
        "name": "Ethical Reasoning",
        "weight": 40
      },
      {
        "code": "critical_thinking",
        "name": "Critical Thinking",
        "weight": 30
      },
      {
        "code": "stakeholder_consideration",
        "name": "Stakeholder Consideration",
        "weight": 20
      },
      {
        "code": "practical_application",
        "name": "Practical Application",
        "weight": 10
      }
    ]
  }
}
```

### Get User Focus Areas

```
GET /api/v1/users/me/focus-areas
```

Retrieves the authenticated user's focus area preferences and progress.

#### Response

```json
{
  "success": true,
  "data": {
    "primary": [
      {
        "id": "focus-area-123",
        "name": "AI Ethics",
        "selectedAt": "2023-03-10T14:00:00Z",
        "progress": {
          "challengesCompleted": 12,
          "totalChallenges": 32,
          "completionPercentage": 37.5,
          "averageScore": 82,
          "skillLevel": "intermediate"
        }
      },
      {
        "id": "focus-area-126",
        "name": "AI Safety",
        "selectedAt": "2023-03-15T09:30:00Z",
        "progress": {
          "challengesCompleted": 8,
          "totalChallenges": 25,
          "completionPercentage": 32,
          "averageScore": 78,
          "skillLevel": "intermediate"
        }
      }
    ],
    "suggested": [
      {
        "id": "focus-area-124",
        "name": "AI Transparency",
        "reason": "Related to your primary focus area",
        "compatibility": 95
      },
      {
        "id": "focus-area-130",
        "name": "AI Governance",
        "reason": "Based on your skill level and interests",
        "compatibility": 88
      }
    ],
    "recent": [
      {
        "id": "focus-area-128",
        "name": "AI Alignment",
        "lastChallenge": "2023-04-10T11:20:00Z"
      }
    ]
  }
}
```

### Update User Focus Areas

```
PATCH /api/v1/users/me/focus-areas
```

Updates the authenticated user's focus area preferences.

#### Request Body

```json
{
  "primary": ["focus-area-123", "focus-area-126"],
  "skillLevel": "intermediate"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "primary": [
      {
        "id": "focus-area-123",
        "name": "AI Ethics"
      },
      {
        "id": "focus-area-126",
        "name": "AI Safety"
      }
    ],
    "skillLevel": "intermediate",
    "updatedAt": "2023-04-15T12:30:00Z",
    "challengeRecommendations": [
      {
        "id": "challenge-460",
        "title": "Ethical Decision Making in AI Systems",
        "focusArea": "AI Ethics",
        "difficulty": "intermediate"
      },
      {
        "id": "challenge-465",
        "title": "Safety Considerations for Autonomous Systems",
        "focusArea": "AI Safety",
        "difficulty": "intermediate"
      }
    ]
  }
}
```

### Get Focus Area Categories

```
GET /api/v1/focus-areas/categories
```

Retrieves all focus area categories.

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "category-1",
      "name": "Responsible AI",
      "description": "Topics related to ethical, transparent, and responsible AI development",
      "iconUrl": "https://aifightclub.com/assets/icons/responsible-ai.svg",
      "focusAreaCount": 8
    },
    {
      "id": "category-2",
      "name": "Technical Skills",
      "description": "Technical aspects of AI systems development and implementation",
      "iconUrl": "https://aifightclub.com/assets/icons/technical-skills.svg",
      "focusAreaCount": 12
    },
    {
      "id": "category-3",
      "name": "AI Applications",
      "description": "Real-world applications and domains for AI systems",
      "iconUrl": "https://aifightclub.com/assets/icons/ai-applications.svg",
      "focusAreaCount": 15
    }
  ]
}
```

### Get Focus Area Learning Path

```
GET /api/v1/focus-areas/:focusAreaId/learning-path
```

Retrieves a recommended learning path for a specific focus area.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `skillLevel` | string | Target skill level (beginner, intermediate, advanced) |
| `includeCompleted` | boolean | Include completed challenges |

#### Response

```json
{
  "success": true,
  "data": {
    "focusAreaId": "focus-area-123",
    "focusAreaName": "AI Ethics",
    "skillLevel": "intermediate",
    "estimatedCompletionTime": "4 weeks",
    "stages": [
      {
        "stage": 1,
        "name": "Foundations",
        "description": "Learn the foundational concepts of AI ethics",
        "challenges": [
          {
            "id": "challenge-450",
            "title": "Introduction to Ethical Frameworks",
            "type": "knowledge",
            "estimatedTime": 20,
            "status": "completed",
            "score": 85
          },
          {
            "id": "challenge-451",
            "title": "Identifying Ethical Issues in AI",
            "type": "analysis",
            "estimatedTime": 30,
            "status": "available"
          }
        ],
        "resources": [
          {
            "type": "article",
            "title": "Introduction to AI Ethics",
            "url": "https://aifightclub.com/resources/ai-ethics-intro",
            "estimatedTime": 15
          }
        ]
      },
      {
        "stage": 2,
        "name": "Application",
        "description": "Apply ethical concepts to real-world scenarios",
        "challenges": [
          {
            "id": "challenge-460",
            "title": "Ethical Decision Making in AI Systems",
            "type": "case_study",
            "estimatedTime": 45,
            "status": "locked",
            "prerequisite": "challenge-451"
          },
          {
            "id": "challenge-461",
            "title": "Bias Detection and Mitigation",
            "type": "practical",
            "estimatedTime": 60,
            "status": "locked",
            "prerequisite": "challenge-451"
          }
        ],
        "resources": [
          {
            "type": "video",
            "title": "Ethical AI Case Studies",
            "url": "https://aifightclub.com/resources/ai-ethics-cases",
            "estimatedTime": 25
          }
        ]
      }
    ]
  }
}
```

## Admin Endpoints

### Create Focus Area

```
POST /api/v1/admin/focus-areas
```

Creates a new focus area (admin only).

#### Request Body

```json
{
  "name": "AI Robustness",
  "description": "Learn techniques for building robust and reliable AI systems",
  "longDescription": "AI Robustness focuses on developing systems that can handle unexpected inputs, adversarial attacks, and maintain performance across a variety of conditions...",
  "icon": "robustness_icon",
  "category": "Technical Skills",
  "difficulty": "advanced",
  "learningObjectives": [
    "Understand common failure modes in AI systems",
    "Apply techniques for testing AI robustness",
    "Implement adversarial defense mechanisms",
    "Design AI systems resilient to distribution shifts"
  ],
  "prerequisites": ["focus-area-120"],
  "evaluationCategories": [
    {
      "code": "technical_depth",
      "weight": 40
    },
    {
      "code": "practical_application",
      "weight": 30
    },
    {
      "code": "critical_thinking",
      "weight": 20
    },
    {
      "code": "security_mindset",
      "weight": 10
    }
  ],
  "resources": [
    {
      "type": "article",
      "title": "Introduction to AI Robustness",
      "url": "https://aifightclub.com/resources/ai-robustness-intro",
      "estimatedTime": 20
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "focus-area-135",
    "name": "AI Robustness",
    "description": "Learn techniques for building robust and reliable AI systems",
    "category": "Technical Skills",
    "difficulty": "advanced",
    "createdAt": "2023-04-15T13:00:00Z",
    "active": true
  }
}
```

## Error Handling

### Focus Area Not Found

```json
{
  "success": false,
  "error": {
    "code": "FOCUS_AREA_NOT_FOUND",
    "message": "The specified focus area was not found",
    "details": {
      "focusAreaId": "focus-area-999"
    }
  }
}
```

### Invalid Skill Level

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SKILL_LEVEL",
    "message": "Invalid skill level specified",
    "details": {
      "providedValue": "expert",
      "allowedValues": ["beginner", "intermediate", "advanced"]
    }
  }
}
```

## See Also

- [Challenge API](./challenge-api.md)
- [Evaluation API](./evaluation-api.md)
- [Progress API](./progress-api.md) 