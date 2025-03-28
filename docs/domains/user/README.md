# User Domain

This document provides a comprehensive overview of the User domain in our Domain-Driven Design (DDD) architecture, explaining its structure, behavior, and integration with other components.

## Overview

The User domain is responsible for managing user accounts, profiles, preferences, and authentication. It serves as the foundation for personalized user experiences throughout the application.

## Architecture

The User domain follows the Domain-Driven Design architecture:

1. **Domain Model** (`User`) - Core domain entity with validation and lifecycle methods
2. **Domain Services** - Core business logic
   - `userProfileService` - Manages user profile data and preferences
   - `userAuthService` - Handles authentication related operations
   - `userPreferenceService` - Manages user preferences across the system
3. **Application Services** - API-level functionality
   - `userService` - Coordinates domain services and repositories
4. **Repositories** - Data access
   - `userRepository` - Handles database operations for user data
   - `userPreferenceRepository` - Manages user preference storage

## Domain Model

The User model follows the DDD principle of being a rich domain model with behavior, not just a data container.

### Core Properties

- **id**: Unique identifier for the user
- **email**: User's email address (used for authentication)
- **profile**: User profile information
- **preferences**: User preferences for the application
- **skillLevel**: Overall skill level (beginner, intermediate, advanced)
- **focusAreas**: Array of focus areas the user is interested in
- **learningGoals**: User's learning goals
- **createdAt**: Timestamp of when the user was created
- **updatedAt**: Timestamp of the last update to the user

### Behavior

The User model includes rich behavior that enforces domain rules:

- **isValid()**: Validates the user data
- **updateProfile(profileData)**: Updates the user's profile
- **updatePreferences(preferences)**: Updates the user's preferences
- **addFocusArea(focusAreaId)**: Adds a focus area to the user's interests
- **removeFocusArea(focusAreaId)**: Removes a focus area from the user's interests
- **setSkillLevel(level)**: Updates the user's skill level
- **isEligibleForChallenge(challengeId)**: Checks if the user is eligible for a challenge
- **calculateLearningPath()**: Calculates a recommended learning path based on user data

## Authentication Flow

The User domain integrates with Supabase for authentication:

1. **User Registration**:
   - User provides email, password, and initial profile information
   - Verification email is sent to the user
   - User verifies email and is redirected to complete profile setup

2. **User Authentication**:
   - User provides email and password
   - Supabase validates credentials and returns a JWT token
   - Token is stored in the client and used for all subsequent API requests

3. **Token Management**:
   - Tokens expire after 60 minutes
   - Refresh tokens are used to get new access tokens without requiring re-login
   - Logout invalidates all tokens for the user

## State Management

The User domain maintains several important states:

1. **Authentication State**:
   - Logged in (with valid session)
   - Logged out
   - Email unverified

2. **Profile Completeness**:
   - Minimal (basic information only)
   - Partial (some preferences set)
   - Complete (all required information provided)

3. **Learning State**:
   - New (no challenges completed)
   - Active (currently engaged in challenges)
   - Inactive (no recent activity)

## Integration with Other Domains

The User domain interacts with several other domains:

- **Challenge Domain**: Provides user context for challenge generation
- **Evaluation Domain**: Supplies user profile for personalized evaluations
- **Focus Area Domain**: Manages user's focus area selections
- **Progress Domain**: Tracks user progress across the system
- **Personality Domain**: Incorporates user personality traits and preferences

## User Preferences

The system supports a rich set of user preferences:

- **Learning preferences**: Learning style, preferred challenge types, difficulty level
- **Interface preferences**: Theme, notification settings, language
- **Privacy preferences**: Data sharing, feedback anonymization options
- **Communication preferences**: Email frequency, types of notifications

## Key Workflows

### User Registration

1. User provides email, password, and basic profile information
2. System creates user account with Supabase
3. Verification email is sent to the user
4. User confirms email and completes profile setup
5. Initial focus areas and preferences are saved
6. User is redirected to onboarding flow

### Profile Update

1. User accesses profile settings
2. User modifies profile information, preferences, or focus areas
3. System validates changes
4. Updates are saved to the database
5. Related domains are notified of relevant changes

### User Deletion

1. User requests account deletion
2. System confirms the request
3. All user data is anonymized or deleted based on retention policies
4. Authentication provider (Supabase) account is deleted
5. User is logged out and redirected to the landing page

## Implementation Details

- Uses Supabase for authentication and user management
- Implements repository pattern for data access
- Follows Single Responsibility Principle throughout the codebase
- Uses Zod for schema validation
- Publishes domain events for cross-domain communication

## Key Files

- `/src/core/user/models/User.js` - Domain model
- `/src/core/user/services/userProfileService.js` - Profile management
- `/src/core/user/services/userAuthService.js` - Authentication logic
- `/src/core/user/services/userPreferenceService.js` - Preference management
- `/src/repositories/userRepository.js` - Data access layer
- `/src/utils/db/userDbMapper.js` - Database mapping utilities
- `/migrations/user_table.sql` - Database schema definition

## Database Schema

The User domain uses several tables in the Supabase database:

- `auth.users`: Managed by Supabase for authentication
- `public.user_profiles`: Stores user profile information
- `public.user_preferences`: Stores user preference settings
- `public.user_focus_areas`: Maps users to their selected focus areas
- `public.user_learning_goals`: Tracks user learning goals

## Error Handling

The User domain implements specialized error handling:

- `UserNotFoundError`: Thrown when a user can't be found
- `InvalidUserDataError`: Thrown when user data is invalid
- `DuplicateUserError`: Thrown when trying to create a duplicate user
- `AuthenticationError`: Thrown for authentication-related issues

## Events

### Published Events

- `UserCreated`: When a new user is registered
- `UserProfileUpdated`: When a user's profile is updated
- `UserPreferencesChanged`: When a user's preferences change
- `UserFocusAreasChanged`: When a user's focus areas are modified
- `UserDeleted`: When a user is deleted

### Consumed Events

- `ChallengeCompleted`: To update user progress
- `EvaluationCompleted`: To update user skill levels
- `PersonalityProfileUpdated`: To update user personality data

## Security Considerations

The User domain implements several security measures:

1. **Password Security**:
   - Managed by Supabase with bcrypt hashing
   - Password strength requirements enforced

2. **Data Protection**:
   - PII (Personally Identifiable Information) is minimized
   - Row-level security in Supabase tables

3. **Access Control**:
   - JWT-based authentication
   - Role-based permissions
   - Request validation middleware

## API Endpoints

The User domain exposes several API endpoints:

- `GET /api/v1/users/me`: Get current user profile
- `PATCH /api/v1/users/me`: Update current user profile
- `GET /api/v1/users/me/preferences`: Get user preferences
- `PATCH /api/v1/users/me/preferences`: Update user preferences
- `GET /api/v1/users/me/focus-areas`: Get user focus areas
- `PATCH /api/v1/users/me/focus-areas`: Update user focus areas

See the [User API documentation](/docs/api/user-api.md) for more details.

## Testing

The User domain includes comprehensive tests:

- `test-user-model.js`: Tests the User domain model validation
- `test-user-authentication.js`: Tests authentication flows
- `test-user-preferences.js`: Tests preference management
- `test-user-repository.js`: Tests the data access layer

## Related Documentation

For more detailed documentation on specific aspects of the User Domain, see:
- [User API](../../api/user-api.md)
- [Authentication](../../api/authentication.md)
- [Personality API](../../api/personality-api.md) 