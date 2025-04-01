# User Preferences API

This document describes the API endpoints for managing user preferences.

## Overview

The User Preferences API allows clients to get and update user preferences in a structured and validated way. Preferences are organized into categories, each with a defined schema and default values.

## Preference Categories

- **UI**: Visual and interface preferences
- **Notifications**: Communication and alert preferences
- **AI Interaction**: Preferences for AI-powered features
- **Learning**: Preferences related to educational content

## Endpoints

### Get All Preferences

Retrieves all preferences for the authenticated user.

**URL**: `/users/me/preferences`

**Method**: `GET`

**Auth required**: Yes

**Permissions**: User must be authenticated

#### Success Response

**Code**: `200 OK`

**Content Example**:

```json
{
  "success": true,
  "message": "User preferences retrieved successfully",
  "data": {
    "preferences": {
      "ui": {
        "theme": "dark",
        "fontSize": "medium",
        "compactView": false,
        "highContrast": false,
        "animationsEnabled": true
      },
      "notifications": {
        "emailNotifications": true,
        "pushNotifications": true,
        "challengeReminders": true,
        "weeklyProgressReports": true,
        "newFeaturesAnnouncements": true
      },
      "aiInteraction": {
        "detailLevel": "detailed",
        "communicationStyle": "casual",
        "responseFormat": "mixed",
        "codeExamplesEnabled": true,
        "includeExplanations": true
      },
      "learning": {
        "preferredChallengeTypes": ["coding", "quiz"],
        "preferredDifficulty": "intermediate",
        "topicsToAvoid": [],
        "learningStyle": "reading",
        "preferredFeedbackStyle": "detailed"
      }
    }
  }
}
```

### Get Preferences by Category

Retrieves preferences for a specific category for the authenticated user.

**URL**: `/users/me/preferences/:category`

**Method**: `GET`

**URL Parameters**:
- `:category` - Category name (ui, notifications, aiInteraction, learning)

**Auth required**: Yes

**Permissions**: User must be authenticated

#### Success Response

**Code**: `200 OK`

**Content Example (for ui category)**:

```json
{
  "success": true,
  "message": "ui preferences retrieved successfully",
  "data": {
    "ui": {
      "theme": "dark",
      "fontSize": "medium",
      "compactView": false,
      "highContrast": false,
      "animationsEnabled": true
    }
  }
}
```

### Update All Preferences

Updates all preferences for the authenticated user.

**URL**: `/users/me/preferences`

**Method**: `PUT`

**Auth required**: Yes

**Permissions**: User must be authenticated

**Request Body**:

```json
{
  "preferences": {
    "ui": {
      "theme": "light",
      "fontSize": "large"
    },
    "notifications": {
      "emailNotifications": false
    }
  }
}
```

#### Success Response

**Code**: `200 OK`

**Content Example**:

```json
{
  "success": true,
  "message": "User preferences updated successfully",
  "data": {
    "preferences": {
      "ui": {
        "theme": "light",
        "fontSize": "large",
        "compactView": false,
        "highContrast": false,
        "animationsEnabled": true
      },
      "notifications": {
        "emailNotifications": false,
        "pushNotifications": true,
        "challengeReminders": true,
        "weeklyProgressReports": true,
        "newFeaturesAnnouncements": true
      },
      "aiInteraction": {
        "detailLevel": "detailed",
        "communicationStyle": "casual",
        "responseFormat": "mixed",
        "codeExamplesEnabled": true,
        "includeExplanations": true
      },
      "learning": {
        "preferredChallengeTypes": [],
        "preferredDifficulty": "intermediate",
        "topicsToAvoid": [],
        "learningStyle": "reading",
        "preferredFeedbackStyle": "detailed"
      }
    }
  }
}
```

### Update Preferences by Category

Updates preferences for a specific category for the authenticated user.

**URL**: `/users/me/preferences/:category`

**Method**: `PUT`

**URL Parameters**:
- `:category` - Category name (ui, notifications, aiInteraction, learning)

**Auth required**: Yes

**Permissions**: User must be authenticated

**Request Body Example (for ui category)**:

```json
{
  "theme": "light",
  "fontSize": "large",
  "compactView": true
}
```

#### Success Response

**Code**: `200 OK`

**Content Example**:

```json
{
  "success": true,
  "message": "ui preferences updated successfully",
  "data": {
    "ui": {
      "theme": "light",
      "fontSize": "large",
      "compactView": true,
      "highContrast": false,
      "animationsEnabled": true
    }
  }
}
```

### Update Single Preference

Updates a single preference for the authenticated user.

**URL**: `/users/me/preferences/:key`

**Method**: `PATCH`

**URL Parameters**:
- `:key` - Preference key in dot notation (e.g., "ui.theme", "notifications.emailNotifications")

**Auth required**: Yes

**Permissions**: User must be authenticated

**Request Body**:

```json
{
  "value": "light"
}
```

#### Success Response

**Code**: `200 OK`

**Content Example**:

```json
{
  "success": true,
  "message": "Preference ui.theme updated successfully",
  "data": {
    "preferences": {
      "ui": {
        "theme": "light",
        "fontSize": "medium",
        "compactView": false,
        "highContrast": false,
        "animationsEnabled": true
      },
      "notifications": {
        "emailNotifications": true,
        "pushNotifications": true,
        "challengeReminders": true,
        "weeklyProgressReports": true,
        "newFeaturesAnnouncements": true
      },
      "aiInteraction": {
        "detailLevel": "detailed",
        "communicationStyle": "casual",
        "responseFormat": "mixed",
        "codeExamplesEnabled": true,
        "includeExplanations": true
      },
      "learning": {
        "preferredChallengeTypes": [],
        "preferredDifficulty": "intermediate",
        "topicsToAvoid": [],
        "learningStyle": "reading",
        "preferredFeedbackStyle": "detailed"
      }
    }
  }
}
```

### Reset Preference to Default

Resets a preference to its default value for the authenticated user.

**URL**: `/users/me/preferences/:key`

**Method**: `DELETE`

**URL Parameters**:
- `:key` - Preference key in dot notation (e.g., "ui.theme", "notifications.emailNotifications")

**Auth required**: Yes

**Permissions**: User must be authenticated

#### Success Response

**Code**: `200 OK`

**Content Example**:

```json
{
  "success": true,
  "message": "Preference ui.theme reset to default successfully",
  "data": {
    "preferences": {
      "ui": {
        "theme": "system", // Reset to default value
        "fontSize": "medium",
        "compactView": false,
        "highContrast": false,
        "animationsEnabled": true
      },
      "notifications": {
        "emailNotifications": true,
        "pushNotifications": true,
        "challengeReminders": true,
        "weeklyProgressReports": true,
        "newFeaturesAnnouncements": true
      },
      "aiInteraction": {
        "detailLevel": "detailed",
        "communicationStyle": "casual",
        "responseFormat": "mixed",
        "codeExamplesEnabled": true,
        "includeExplanations": true
      },
      "learning": {
        "preferredChallengeTypes": [],
        "preferredDifficulty": "intermediate",
        "topicsToAvoid": [],
        "learningStyle": "reading",
        "preferredFeedbackStyle": "detailed"
      }
    }
  }
}
```

## Error Responses

### Invalid Category

**Condition**: If the category parameter is not valid.

**Code**: `400 Bad Request`

**Content**:

```json
{
  "success": false,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Category must be one of: ui, notifications, aiInteraction, learning",
    "details": {
      "params": {
        "category": "Invalid category name"
      }
    }
  }
}
```

### Invalid Preference Key

**Condition**: If the preference key format is invalid.

**Code**: `400 Bad Request`

**Content**:

```json
{
  "success": false,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Preference key must contain only letters, numbers, and dots",
    "details": {
      "params": {
        "key": "Invalid key format"
      }
    }
  }
}
```

### Invalid Preference Value

**Condition**: If the preference value is invalid according to the schema.

**Code**: `400 Bad Request`

**Content**:

```json
{
  "success": false,
  "message": "User validation error",
  "error": {
    "code": "USER_VALIDATION_ERROR",
    "message": "Invalid preference value: ui.theme: Invalid enum value. Expected 'light' | 'dark' | 'system'"
  }
}
```

### User Not Found

**Condition**: If the user cannot be found.

**Code**: `404 Not Found`

**Content**:

```json
{
  "success": false,
  "message": "User not found",
  "error": {
    "code": "USER_NOT_FOUND_ERROR",
    "message": "User with ID xyz not found"
  }
}
``` 