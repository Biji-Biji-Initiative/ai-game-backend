# Bounded Contexts

## Overview

This document defines the Bounded Contexts (BCs) in our application, their responsibilities, and relationships between them. A Bounded Context is a conceptual boundary within which a particular domain model is defined and applicable. Each BC has its own ubiquitous language, models, and rules.

## Core Bounded Contexts

### 1. User Context

**Responsibility:** Manages user identity, profile information, authentication, and authorization.

**Key Concepts:**
- User (identity, profile, preferences)
- Authentication (login, JWT tokens)
- Roles and Permissions
- User Preferences

**Aggregate Roots:**
- User

**Value Objects:**
- Email
- UserId

**Repositories:**
- UserRepository

**Services:**
- UserService (retrieval, profile management)
- AuthenticationService (login, token validation)

**Events Published:**
- USER_CREATED
- USER_UPDATED
- USER_PROFILE_COMPLETED
- USER_ONBOARDING_COMPLETED
- USER_ROLE_ASSIGNED
- USER_ROLE_REMOVED
- USER_LOGGED_IN
- USER_ACTIVATED
- USER_DEACTIVATED

**Events Consumed:**
- PERSONALITY_TRAIT_IDENTIFIED (from Personality Context)
- USER_FOCUS_AREA_SET (from FocusArea Context)

### 2. Challenge Context

**Responsibility:** Manages the creation, retrieval, and tracking of challenges presented to users.

**Key Concepts:**
- Challenge (content, instructions, evaluation criteria)
- Challenge Types (critical-thinking, ethical-dilemma, etc.)
- Format Types (scenario, case-study, etc.)
- Challenge Status (draft, active, completed)

**Aggregate Roots:**
- Challenge

**Value Objects:**
- ChallengeId
- DifficultyLevel
- FocusArea (shared concept with FocusArea Context)

**Repositories:**
- ChallengeRepository

**Services:**
- ChallengeService (CRUD operations)
- ChallengePersonalizationService (customize challenges to user)
- ChallengeConfigService (manage challenge configurations)
- ChallengeGenerationService (generate challenges with AI)

**Events Published:**
- CHALLENGE_CREATED
- CHALLENGE_UPDATED
- CHALLENGE_DELETED
- CHALLENGE_COMPLETED

**Events Consumed:**
- USER_PROFILE_UPDATED (from User Context)
- FOCUS_AREA_SELECTED (from FocusArea Context)

### 3. Evaluation Context

**Responsibility:** Handles the evaluation of user responses to challenges.

**Key Concepts:**
- Evaluation (score, feedback, metrics)
- Evaluation Criteria
- Scoring Rubric

**Aggregate Roots:**
- Evaluation
- EvaluationCriteria

**Value Objects:**
- EvaluationId
- Score
- ChallengeId (shared with Challenge Context)

**Repositories:**
- EvaluationRepository
- EvaluationCriteriaRepository

**Services:**
- EvaluationService
- ChallengeEvaluationService (evaluate responses)
- UserContextService (gather user context for evaluation)

**Events Published:**
- EVALUATION_COMPLETED
- EVALUATION_UPDATED

**Events Consumed:**
- CHALLENGE_COMPLETED (from Challenge Context)
- USER_UPDATED (from User Context)

### 4. Personality Context

**Responsibility:** Manages user personality traits, analysis, and insights.

**Key Concepts:**
- Personality Traits
- Trait Analysis
- Personality Insights

**Aggregate Roots:**
- Personality

**Value Objects:**
- TraitScore
- PersonalityId

**Repositories:**
- PersonalityRepository
- TraitRepository

**Services:**
- TraitsAnalysisService
- PersonalityService

**Events Published:**
- PERSONALITY_TRAIT_IDENTIFIED
- PERSONALITY_PROFILE_UPDATED

**Events Consumed:**
- USER_CREATED (from User Context)
- CHALLENGE_COMPLETED (from Challenge Context)

### 5. Focus Area Context

**Responsibility:** Manages the focus areas for challenges and user interests.

**Key Concepts:**
- Focus Areas (AI Ethics, Critical Thinking, etc.)
- Focus Area Selection
- Focus Area Recommendations

**Aggregate Roots:**
- FocusArea

**Value Objects:**
- FocusAreaId

**Repositories:**
- FocusAreaRepository

**Services:**
- FocusAreaService
- FocusAreaGenerationService

**Events Published:**
- FOCUS_AREA_CREATED
- FOCUS_AREA_UPDATED
- FOCUS_AREA_SELECTED

**Events Consumed:**
- USER_CREATED (from User Context)
- PERSONALITY_PROFILE_UPDATED (from Personality Context)

### 6. Progress Context

**Responsibility:** Tracks user progress, learning journey, and achievements.

**Key Concepts:**
- Progress Metrics
- Achievements
- Learning Journey

**Aggregate Roots:**
- Progress
- Achievement

**Value Objects:**
- ProgressMetric
- AchievementId

**Repositories:**
- ProgressRepository
- AchievementRepository

**Services:**
- ProgressService
- UserJourneyCoordinator (orchestrates journey)
- AchievementService

**Events Published:**
- PROGRESS_UPDATED
- ACHIEVEMENT_UNLOCKED

**Events Consumed:**
- CHALLENGE_COMPLETED (from Challenge Context)
- EVALUATION_COMPLETED (from Evaluation Context)

## Bounded Context Relationships

### Context Map

1. **User <-> Challenge** (Partnership)
   - User context provides identity for challenges
   - Challenge context references users through IDs

2. **Challenge <-> Evaluation** (Partnership)
   - Evaluation context depends on challenges for evaluation criteria
   - Challenge context provides the content to be evaluated

3. **User <-> Personality** (Customer-Supplier)
   - User context is upstream, providing identity
   - Personality context is downstream, providing traits analysis

4. **User <-> Progress** (Customer-Supplier)
   - User context is upstream, providing identity
   - Progress context is downstream, tracking user journey

5. **Focus Area <-> Challenge** (Shared Kernel)
   - Both contexts share the concept of Focus Areas
   - FocusArea value object is shared between contexts

6. **Personality <-> Focus Area** (Partnership)
   - Personality traits influence focus area recommendations
   - Focus area selections help refine personality understanding

### Integration Patterns

1. **Event-Based Integration**
   - Primary integration method between contexts
   - Domain events are published by one context and consumed by others
   - Ensures loose coupling between bounded contexts

2. **Shared Kernel**
   - Limited to essential shared concepts (e.g., FocusArea)
   - Carefully managed to prevent excessive coupling
   - Documented in shared kernel section of codebase

3. **Anti-Corruption Layer**
   - Used in repositories that cross aggregate boundaries
   - Translates between bounded contexts where needed
   - Prevents domain concept leakage

## Implementation Considerations

1. **Directory Structure**
   - Each bounded context has its own directory under `src/core`
   - Shared kernel concepts in `src/core/common`
   - Application services that orchestrate across contexts in `src/application`

2. **Event Handling**
   - Events are primary integration mechanism
   - Follow "collect events, dispatch after save" pattern
   - Events published after successful persistence

3. **References Between Contexts**
   - Use IDs to reference entities in other contexts
   - Avoid direct object references across context boundaries
   - Use repositories to look up entities from other contexts

4. **Testing Strategy**
   - Each bounded context can be tested in isolation
   - Integration tests verify correct interaction between contexts
   - Event handling tests verify correct event flow 