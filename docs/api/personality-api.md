# Personality API

This document describes the Personality API endpoints for the AI Fight Club API.

## Overview

The Personality API allows for the customization and management of AI personas that interact with users throughout their learning journey. This API enables:

1. Retrieving AI personality configurations for different learning contexts
2. Selecting and customizing AI personalities for user interactions
3. Adjusting communication styles and feedback approaches
4. Managing personality trait preferences for optimal learning experiences

## Endpoints

### Get Available Personalities

```
GET /api/v1/personalities
```

Retrieves a list of available AI personality profiles.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `focusAreaId` | string | Filter by compatibility with focus area |
| `learningStyle` | string | Filter by compatibility with learning style |
| `skillLevel` | string | Filter by target skill level (beginner, intermediate, advanced) |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "personality-123",
      "name": "Professor Insight",
      "description": "A thoughtful and analytical personality that excels at providing detailed explanations and deep insights.",
      "traits": ["analytical", "patient", "detail-oriented"],
      "communicationStyle": "academic",
      "feedbackStyle": "thorough",
      "suitableFor": [
        {
          "focusArea": "AI Ethics",
          "compatibility": 95
        },
        {
          "focusArea": "Technical Skills",
          "compatibility": 85
        }
      ],
      "imageUrl": "https://aifightclub.com/assets/personalities/professor-insight.png"
    },
    {
      "id": "personality-124",
      "name": "Coach Motivator",
      "description": "An encouraging and energetic personality that excels at motivating users and building confidence.",
      "traits": ["encouraging", "energetic", "empathetic"],
      "communicationStyle": "approachable",
      "feedbackStyle": "constructive",
      "suitableFor": [
        {
          "focusArea": "AI Ethics",
          "compatibility": 80
        },
        {
          "focusArea": "Critical Thinking",
          "compatibility": 90
        }
      ],
      "imageUrl": "https://aifightclub.com/assets/personalities/coach-motivator.png"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8
  }
}
```

### Get Personality Details

```
GET /api/v1/personalities/:personalityId
```

Retrieves detailed information about a specific personality.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "personality-123",
    "name": "Professor Insight",
    "description": "A thoughtful and analytical personality that excels at providing detailed explanations and deep insights.",
    "traits": ["analytical", "patient", "detail-oriented"],
    "communicationStyle": "academic",
    "feedbackStyle": "thorough",
    "detailedDescription": "Professor Insight approaches learning with methodical precision, breaking down complex concepts into understandable components. This AI personality uses academic language and references to provide a rich learning experience, citing relevant research and theoretical frameworks when appropriate. Best suited for learners who appreciate depth and thoroughness over brevity.",
    "examples": [
      {
        "context": "Challenge Feedback",
        "text": "Your analysis demonstrates sound logical reasoning. However, I notice an opportunity to strengthen your argument by considering the ethical framework of consequentialism alongside the deontological approach you've already incorporated. This multi-framework analysis would provide a more comprehensive ethical evaluation."
      },
      {
        "context": "Learning Path Guidance",
        "text": "Based on your progress in understanding foundational ethical principles, I recommend exploring the intersection of these principles with practical implementation. The 'Technical Implementation of Ethical AI' challenge would be an excellent next step in your learning journey."
      }
    ],
    "suitableFor": [
      {
        "focusArea": "AI Ethics",
        "compatibility": 95,
        "reason": "Excels at explaining nuanced ethical concepts"
      },
      {
        "focusArea": "Technical Skills",
        "compatibility": 85,
        "reason": "Strong at methodical explanation of technical concepts"
      }
    ],
    "learningStyleMatch": [
      {
        "style": "theoretical",
        "compatibility": 95
      },
      {
        "style": "reflective",
        "compatibility": 90
      },
      {
        "style": "practical",
        "compatibility": 75
      }
    ],
    "skillLevelMatch": {
      "beginner": 80,
      "intermediate": 95,
      "advanced": 90
    },
    "imageUrl": "https://aifightclub.com/assets/personalities/professor-insight.png",
    "voiceStyle": "measured and thoughtful"
  }
}
```

### Get User Personality Settings

```
GET /api/v1/users/me/personality-settings
```

Retrieves the authenticated user's personality settings.

#### Response

```json
{
  "success": true,
  "data": {
    "selectedPersonality": {
      "id": "personality-123",
      "name": "Professor Insight"
    },
    "customizations": {
      "feedbackDetail": "high", // high, medium, low
      "communicationTone": "formal", // formal, casual, motivational
      "exampleFrequency": "frequent" // frequent, occasional, rare
    },
    "contextSpecificSettings": [
      {
        "context": "challenge_introduction",
        "personalityId": "personality-124",
        "customizations": {
          "communicationTone": "motivational"
        }
      },
      {
        "context": "challenge_evaluation",
        "personalityId": "personality-123",
        "customizations": {
          "feedbackDetail": "high"
        }
      }
    ],
    "personalityTraitPreferences": {
      "preferred": ["analytical", "encouraging"],
      "neutral": ["humorous"],
      "avoided": ["provocative"]
    }
  }
}
```

### Update User Personality Settings

```
PATCH /api/v1/users/me/personality-settings
```

Updates the authenticated user's personality settings.

#### Request Body

```json
{
  "selectedPersonalityId": "personality-123",
  "customizations": {
    "feedbackDetail": "high",
    "communicationTone": "formal",
    "exampleFrequency": "frequent"
  },
  "contextSpecificSettings": [
    {
      "context": "challenge_introduction",
      "personalityId": "personality-124",
      "customizations": {
        "communicationTone": "motivational"
      }
    }
  ],
  "personalityTraitPreferences": {
    "preferred": ["analytical", "encouraging"],
    "avoided": ["provocative"]
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "selectedPersonality": {
      "id": "personality-123",
      "name": "Professor Insight"
    },
    "customizations": {
      "feedbackDetail": "high",
      "communicationTone": "formal",
      "exampleFrequency": "frequent"
    },
    "contextSpecificSettings": [
      {
        "context": "challenge_introduction",
        "personalityId": "personality-124",
        "customizations": {
          "communicationTone": "motivational"
        }
      }
    ],
    "personalityTraitPreferences": {
      "preferred": ["analytical", "encouraging"],
      "neutral": ["humorous"],
      "avoided": ["provocative"]
    },
    "updatedAt": "2023-04-15T16:30:00Z"
  }
}
```

### Get Personality Recommendation

```
GET /api/v1/personalities/recommendation
```

Retrieves a personalized AI personality recommendation based on user profile.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | string | Context for the recommendation (challenge, evaluation, learning_path) |
| `focusAreaId` | string | Focus area context (optional) |

#### Response

```json
{
  "success": true,
  "data": {
    "recommendedPersonality": {
      "id": "personality-123",
      "name": "Professor Insight",
      "description": "A thoughtful and analytical personality that excels at providing detailed explanations and deep insights.",
      "traits": ["analytical", "patient", "detail-oriented"],
      "imageUrl": "https://aifightclub.com/assets/personalities/professor-insight.png"
    },
    "recommendationReason": "Based on your learning style and focus on AI Ethics, Professor Insight's analytical approach aligns well with your preference for detailed explanations and thorough feedback.",
    "compatibilityScore": 95,
    "alternatives": [
      {
        "id": "personality-124",
        "name": "Coach Motivator",
        "compatibilityScore": 85,
        "key_difference": "More encouraging, less detail-oriented"
      }
    ],
    "suggestedCustomizations": {
      "feedbackDetail": "high",
      "communicationTone": "formal"
    }
  }
}
```

### Get Personality Traits

```
GET /api/v1/personalities/traits
```

Retrieves a list of available personality traits.

#### Response

```json
{
  "success": true,
  "data": {
    "traits": [
      {
        "code": "analytical",
        "name": "Analytical",
        "description": "Focuses on breaking down concepts into their component parts and examining relationships.",
        "opposites": ["intuitive"],
        "compatible_with": ["detail-oriented", "logical", "objective"]
      },
      {
        "code": "encouraging",
        "name": "Encouraging",
        "description": "Provides positive reinforcement and motivation throughout the learning process.",
        "opposites": ["challenging"],
        "compatible_with": ["empathetic", "patient", "supportive"]
      },
      {
        "code": "challenging",
        "name": "Challenging",
        "description": "Pushes learners outside their comfort zone and questions assumptions.",
        "opposites": ["encouraging"],
        "compatible_with": ["direct", "provocative", "analytical"]
      }
    ],
    "categories": [
      {
        "name": "Communication Style",
        "traits": ["direct", "diplomatic", "formal", "casual", "technical", "simplified"]
      },
      {
        "name": "Feedback Approach",
        "traits": ["encouraging", "challenging", "balanced", "detailed", "concise"]
      },
      {
        "name": "Thinking Style",
        "traits": ["analytical", "intuitive", "creative", "logical", "practical"]
      }
    ]
  }
}
```

## Admin Endpoints

### Create Personality

```
POST /api/v1/admin/personalities
```

Creates a new AI personality (admin only).

#### Request Body

```json
{
  "name": "Strategic Mentor",
  "description": "A forward-thinking personality that helps users develop strategic and systems thinking skills.",
  "traits": ["strategic", "analytical", "visionary"],
  "communicationStyle": "thought-provoking",
  "feedbackStyle": "strategic",
  "detailedDescription": "Strategic Mentor helps users see the bigger picture and develop long-term thinking. This personality excels at challenging users to consider implications and connections between concepts, particularly in complex systems.",
  "examples": [
    {
      "context": "Challenge Feedback",
      "text": "Your solution addresses the immediate ethical concerns well, but I'd encourage you to consider the longer-term implications. How might this approach evolve as the technology scales? What second-order effects might emerge?"
    }
  ],
  "suitableFor": [
    {
      "focusArea": "AI Governance",
      "compatibility": 95
    },
    {
      "focusArea": "AI Ethics",
      "compatibility": 85
    }
  ],
  "learningStyleMatch": {
    "theoretical": 90,
    "reflective": 95,
    "practical": 80
  },
  "skillLevelMatch": {
    "beginner": 70,
    "intermediate": 85,
    "advanced": 95
  },
  "imageUrl": "https://aifightclub.com/assets/personalities/strategic-mentor.png",
  "voiceStyle": "deliberate and thoughtful"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "personality-125",
    "name": "Strategic Mentor",
    "description": "A forward-thinking personality that helps users develop strategic and systems thinking skills.",
    "createdAt": "2023-04-15T17:00:00Z",
    "active": true
  }
}
```

### Update Personality

```
PATCH /api/v1/admin/personalities/:personalityId
```

Updates an existing AI personality (admin only).

#### Request Body

```json
{
  "description": "An updated description for this personality profile.",
  "traits": ["strategic", "analytical", "visionary", "systematic"],
  "suitableFor": [
    {
      "focusArea": "AI Governance",
      "compatibility": 95
    },
    {
      "focusArea": "AI Safety",
      "compatibility": 90
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "personality-125",
    "name": "Strategic Mentor",
    "description": "An updated description for this personality profile.",
    "traits": ["strategic", "analytical", "visionary", "systematic"],
    "updatedAt": "2023-04-15T17:30:00Z"
  }
}
```

## Error Handling

### Personality Not Found

```json
{
  "success": false,
  "error": {
    "code": "PERSONALITY_NOT_FOUND",
    "message": "The specified personality was not found",
    "details": {
      "personalityId": "personality-999"
    }
  }
}
```

### Invalid Trait Preferences

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRAIT_PREFERENCES",
    "message": "Invalid trait preferences configuration",
    "details": {
      "error": "The same trait cannot be in both preferred and avoided lists",
      "conflictingTraits": ["analytical"]
    }
  }
}
```

## Integration with Other APIs

The Personality API integrates with:

- **Challenge API**: Personalities influence challenge generation style and feedback
- **Evaluation API**: Personalities affect how evaluations are presented
- **Progress API**: Personalities provide personalized growth insights

## See Also

- [User API](./user-api.md)
- [Challenge API](./challenge-api.md)
- [Evaluation API](./evaluation-api.md) 