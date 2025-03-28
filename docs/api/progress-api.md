# Progress API

This document describes the Progress API endpoints for the AI Fight Club API.

## Overview

The Progress API enables tracking and managing user learning progress across different focus areas and skills. It provides:

1. Progress tracking for completed challenges and evaluations
2. Learning path recommendations and adaptive learning features
3. Growth insights and skill development monitoring
4. Milestone and achievement management

## Endpoints

### Get User Progress Overview

```
GET /api/v1/progress
```

Retrieves an overview of the authenticated user's progress.

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "joinedAt": "2023-03-01T10:00:00Z",
    "challengesCompleted": 24,
    "totalChallengeTime": 840, // minutes
    "averageScore": 82,
    "skillLevel": "intermediate",
    "topSkills": [
      {
        "category": "critical_thinking",
        "score": 88,
        "level": "advanced"
      },
      {
        "category": "ethical_reasoning",
        "score": 85,
        "level": "intermediate"
      }
    ],
    "focusAreas": [
      {
        "id": "focus-area-123",
        "name": "AI Ethics",
        "challengesCompleted": 12,
        "progressPercentage": 37.5,
        "averageScore": 82
      },
      {
        "id": "focus-area-126",
        "name": "AI Safety",
        "challengesCompleted": 8,
        "progressPercentage": 32,
        "averageScore": 78
      }
    ],
    "recentActivity": [
      {
        "type": "challenge_completed",
        "challengeId": "challenge-456",
        "challengeTitle": "AI Ethics in Healthcare",
        "score": 85,
        "timestamp": "2023-04-14T15:35:00Z"
      },
      {
        "type": "skill_level_up",
        "skill": "critical_thinking",
        "newLevel": "advanced",
        "timestamp": "2023-04-14T15:40:00Z"
      }
    ],
    "streaks": {
      "current": 5, // days
      "longest": 12, // days
      "lastActive": "2023-04-15T09:20:00Z"
    }
  }
}
```

### Get Focus Area Progress

```
GET /api/v1/progress/focus-areas/:focusAreaId
```

Retrieves detailed progress for a specific focus area.

#### Response

```json
{
  "success": true,
  "data": {
    "focusAreaId": "focus-area-123",
    "focusAreaName": "AI Ethics",
    "progressOverview": {
      "challengesCompleted": 12,
      "totalChallenges": 32,
      "completionPercentage": 37.5,
      "averageScore": 82,
      "timeSpent": 360, // minutes
      "skillLevel": "intermediate"
    },
    "skillBreakdown": [
      {
        "category": "ethical_reasoning",
        "score": 85,
        "level": "intermediate",
        "improvement": 10, // points improved since starting
        "challengesCompleted": 5
      },
      {
        "category": "critical_thinking",
        "score": 88,
        "level": "advanced",
        "improvement": 15,
        "challengesCompleted": 4
      },
      {
        "category": "stakeholder_consideration",
        "score": 80,
        "level": "intermediate",
        "improvement": 8,
        "challengesCompleted": 3
      }
    ],
    "completedChallenges": [
      {
        "id": "challenge-456",
        "title": "AI Ethics in Healthcare",
        "completedAt": "2023-04-14T15:35:00Z",
        "score": 85,
        "type": "case_study"
      },
      {
        "id": "challenge-450",
        "title": "Introduction to Ethical Frameworks",
        "completedAt": "2023-04-10T11:20:00Z",
        "score": 80,
        "type": "knowledge"
      }
    ],
    "nextChallenges": [
      {
        "id": "challenge-460",
        "title": "Ethical Decision Making in AI Systems",
        "difficulty": "intermediate",
        "estimatedTime": 45,
        "type": "case_study",
        "relevance": "Recommended next step to build on your understanding of ethical frameworks"
      }
    ],
    "achievements": [
      {
        "id": "achievement-123",
        "name": "Ethics Explorer",
        "description": "Completed 10 challenges in AI Ethics",
        "unlockedAt": "2023-04-12T14:15:00Z",
        "icon": "ethics_explorer_icon"
      }
    ]
  }
}
```

### Get Skill Progress

```
GET /api/v1/progress/skills/:categoryCode
```

Retrieves detailed progress for a specific skill category.

#### Response

```json
{
  "success": true,
  "data": {
    "categoryCode": "ethical_reasoning",
    "categoryName": "Ethical Reasoning",
    "currentScore": 85,
    "level": "intermediate",
    "nextLevelThreshold": 90,
    "history": [
      {
        "date": "2023-03-15T00:00:00Z",
        "score": 75
      },
      {
        "date": "2023-03-22T00:00:00Z",
        "score": 78
      },
      {
        "date": "2023-04-01T00:00:00Z",
        "score": 82
      },
      {
        "date": "2023-04-15T00:00:00Z",
        "score": 85
      }
    ],
    "relatedFocusAreas": [
      {
        "id": "focus-area-123",
        "name": "AI Ethics",
        "score": 85
      },
      {
        "id": "focus-area-126",
        "name": "AI Safety",
        "score": 82
      }
    ],
    "strengths": [
      "Identifying ethical principles in complex scenarios",
      "Balancing competing ethical considerations"
    ],
    "areasForImprovement": [
      "Applying ethical frameworks to technical implementation details"
    ],
    "recommendedChallenges": [
      {
        "id": "challenge-465",
        "title": "Ethical Framework Application",
        "focusArea": "AI Ethics",
        "difficulty": "intermediate",
        "relevance": "Designed to improve application of ethical frameworks to technical scenarios"
      }
    ]
  }
}
```

### Get Learning Journey

```
GET /api/v1/progress/learning-journey
```

Retrieves the user's learning journey, showing progress over time.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `timeframe` | string | Timeframe for the journey (month, quarter, year, all) |

#### Response

```json
{
  "success": true,
  "data": {
    "timeframe": "quarter",
    "startDate": "2023-01-01T00:00:00Z",
    "endDate": "2023-04-15T00:00:00Z",
    "milestones": [
      {
        "type": "joined",
        "date": "2023-01-10T09:15:00Z",
        "description": "Joined AI Fight Club"
      },
      {
        "type": "focus_area_selected",
        "date": "2023-01-10T09:30:00Z",
        "focusAreaId": "focus-area-123",
        "focusAreaName": "AI Ethics"
      },
      {
        "type": "first_challenge_completed",
        "date": "2023-01-12T14:20:00Z",
        "challengeId": "challenge-440",
        "challengeTitle": "Introduction to AI Ethics"
      },
      {
        "type": "skill_level_up",
        "date": "2023-02-15T16:45:00Z",
        "skill": "ethical_reasoning",
        "newLevel": "intermediate"
      },
      {
        "type": "achievement_unlocked",
        "date": "2023-03-20T11:30:00Z",
        "achievementId": "achievement-123",
        "achievementName": "Ethics Explorer"
      },
      {
        "type": "focus_area_milestone",
        "date": "2023-04-10T15:20:00Z",
        "focusAreaId": "focus-area-123",
        "focusAreaName": "AI Ethics",
        "milestone": "50% of beginner challenges completed"
      }
    ],
    "progressByMonth": [
      {
        "month": "January 2023",
        "challengesCompleted": 5,
        "averageScore": 72,
        "skillsImproved": ["ethical_reasoning", "critical_thinking"]
      },
      {
        "month": "February 2023",
        "challengesCompleted": 8,
        "averageScore": 76,
        "skillsImproved": ["ethical_reasoning", "stakeholder_consideration"]
      },
      {
        "month": "March 2023",
        "challengesCompleted": 7,
        "averageScore": 80,
        "skillsImproved": ["critical_thinking", "communication"]
      },
      {
        "month": "April 2023",
        "challengesCompleted": 4,
        "averageScore": 85,
        "skillsImproved": ["ethical_reasoning", "technical_depth"]
      }
    ],
    "insights": [
      "Consistent improvement in scores over time",
      "Strong focus on AI Ethics with diversification into AI Safety",
      "Most significant growth in Critical Thinking skills"
    ]
  }
}
```

### Get Achievements

```
GET /api/v1/progress/achievements
```

Retrieves the user's achievements.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (unlocked, locked, all) |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### Response

```json
{
  "success": true,
  "data": {
    "unlocked": [
      {
        "id": "achievement-123",
        "name": "Ethics Explorer",
        "description": "Completed 10 challenges in AI Ethics",
        "unlockedAt": "2023-03-20T11:30:00Z",
        "icon": "ethics_explorer_icon",
        "rarity": "common", // percentage of users who have this
        "type": "challenge_completion"
      },
      {
        "id": "achievement-125",
        "name": "Streak Master",
        "description": "Completed challenges on 7 consecutive days",
        "unlockedAt": "2023-02-28T18:15:00Z",
        "icon": "streak_master_icon",
        "rarity": "uncommon",
        "type": "engagement"
      }
    ],
    "locked": [
      {
        "id": "achievement-124",
        "name": "Ethics Champion",
        "description": "Completed all intermediate challenges in AI Ethics",
        "icon": "ethics_champion_icon",
        "rarity": "rare",
        "type": "mastery",
        "progress": {
          "current": 12,
          "required": 20,
          "percentage": 60
        }
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### Get Learning Recommendations

```
GET /api/v1/progress/recommendations
```

Retrieves personalized learning recommendations.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | number | Number of recommendations to return |
| `focusAreaId` | string | Filter by focus area (optional) |

#### Response

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "challenge",
        "id": "challenge-460",
        "title": "Ethical Decision Making in AI Systems",
        "focusArea": "AI Ethics",
        "difficulty": "intermediate",
        "reason": "Builds on your recent completion of 'Introduction to Ethical Frameworks'",
        "estimatedTime": 45,
        "relevanceScore": 0.95
      },
      {
        "type": "focus_area",
        "id": "focus-area-124",
        "name": "AI Transparency",
        "reason": "Complements your progress in AI Ethics",
        "compatibility": 0.92,
        "description": "Learn techniques for making AI systems more explainable"
      },
      {
        "type": "skill_development",
        "skillCategory": "technical_depth",
        "reason": "This is an area you can improve based on your recent evaluations",
        "recommendedChallenge": {
          "id": "challenge-468",
          "title": "Technical Implementation of Ethical AI",
          "difficulty": "intermediate"
        }
      }
    ],
    "basedOn": [
      "Your focus areas: AI Ethics, AI Safety",
      "Your skill levels across categories",
      "Your recent challenge completions",
      "Patterns from similar users"
    ]
  }
}
```

### Update Learning Goals

```
PATCH /api/v1/progress/learning-goals
```

Updates the user's learning goals.

#### Request Body

```json
{
  "focusAreas": ["focus-area-123", "focus-area-126"],
  "prioritySkills": ["ethical_reasoning", "technical_depth"],
  "weeklyGoal": {
    "challengeCount": 3,
    "studyTimeMinutes": 120
  },
  "targetLevel": "advanced"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "focusAreas": [
      {
        "id": "focus-area-123",
        "name": "AI Ethics"
      },
      {
        "id": "focus-area-126",
        "name": "AI Safety"
      }
    ],
    "prioritySkills": [
      {
        "code": "ethical_reasoning",
        "name": "Ethical Reasoning"
      },
      {
        "code": "technical_depth",
        "name": "Technical Depth"
      }
    ],
    "weeklyGoal": {
      "challengeCount": 3,
      "studyTimeMinutes": 120
    },
    "targetLevel": "advanced",
    "estimatedCompletion": "October 2023",
    "updatedAt": "2023-04-15T14:00:00Z"
  }
}
```

## Admin Endpoints

### Get User Progress (Admin)

```
GET /api/v1/admin/users/:userId/progress
```

Retrieves detailed progress for a specific user (admin only).

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "registeredAt": "2023-01-10T09:15:00Z",
    "progressOverview": {
      "challengesCompleted": 24,
      "totalChallengeTime": 840,
      "averageScore": 82,
      "skillLevel": "intermediate"
    },
    "focusAreas": [
      {
        "id": "focus-area-123",
        "name": "AI Ethics",
        "progressPercentage": 37.5
      }
    ],
    "skillLevels": [
      {
        "category": "ethical_reasoning",
        "score": 85,
        "level": "intermediate"
      }
    ],
    "activityTimeline": [
      {
        "date": "2023-04-14",
        "challengesCompleted": 1,
        "totalTime": 45,
        "averageScore": 85
      }
    ],
    "learningEfficiency": {
      "averageTimePerChallenge": 35,
      "scoreImprovement": 10,
      "completionRate": 0.92
    }
  }
}
```

## Error Handling

### No Progress Data

```json
{
  "success": false,
  "error": {
    "code": "NO_PROGRESS_DATA",
    "message": "No progress data available",
    "details": {
      "userId": "user-123",
      "reason": "New user with no completed challenges"
    }
  }
}
```

### Invalid Learning Goal

```json
{
  "success": false,
  "error": {
    "code": "INVALID_LEARNING_GOAL",
    "message": "Invalid learning goal parameters",
    "details": {
      "field": "weeklyGoal.challengeCount",
      "error": "Must be between 1 and 10"
    }
  }
}
```

## See Also

- [Challenge API](./challenge-api.md)
- [Evaluation API](./evaluation-api.md)
- [Focus Area API](./focus-area-api.md) 