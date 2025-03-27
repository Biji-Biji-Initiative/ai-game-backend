# Domain Structure and Boundaries

This document describes the domain structure and boundaries in our Domain-Driven Design architecture.

## Overview

Our application is organized into several bounded contexts, each representing a distinct domain within the system. Each domain has its own models, services, repositories, and controllers, all contained within the `/src/core` directory.

## Domain Boundaries

### Challenge Domain (`/src/core/challenge`)

**Responsibility**: Managing challenges, their generation, and evaluation.

**Key Concepts**:
- Challenge - A task or problem presented to the user
- ChallengeType - Categories of challenges (critical-thinking, scenario, etc.)
- ChallengeFormat - Different formats (essay, multiple-choice, etc.)

**Components**:
- Models: Challenge, ChallengeType, ChallengeFormat
- Services: ChallengeGenerationService, ChallengeEvaluationService, ChallengeThreadService, ChallengeUtils, ChallengePerformanceService
- Repositories: ChallengeRepository, ChallengeTypeRepository
- Controllers: ChallengeController

### User Domain (`/src/core/user`)

**Responsibility**: Managing user profiles, authentication, and user-specific data.

**Key Concepts**:
- User - Application user and their profile
- Authentication - User identity and access control
- Preferences - User settings and preferences

**Components**:
- Models: User, UserPreferences
- Services: UserService, UserTraitsService
- Repositories: UserRepository
- Controllers: UserController

### User Journey Domain (`/src/core/userJourney`)

**Responsibility**: Tracking user progress through the platform.

**Key Concepts**:
- UserJourneyEvent - Events that capture user actions and progress
- Journey - A sequence of events that form a user's path
- Analytics - Insights derived from user journeys

**Components**:
- Models: UserJourneyEvent, Journey
- Services: UserJourneyService
- Repositories: UserJourneyRepository
- Controllers: To be implemented

### Focus Area Domain (`/src/core/focusArea`)

**Responsibility**: Managing learning focus areas.

**Key Concepts**:
- FocusArea - Areas of learning that users can focus on
- FocusAreaRecommendation - Recommended focus areas for users

**Components**:
- Models: FocusArea, FocusAreaRecommendation
- Services: FocusAreaGenerationService, FocusAreaThreadService
- Repositories: FocusAreaRepository
- Controllers: To be implemented

### Evaluation Domain (`/src/core/evaluation`)

**Responsibility**: Evaluating user responses to challenges.

**Key Concepts**:
- Evaluation - Assessment of a user's response
- EvaluationCriteria - Criteria used for assessment
- EvaluationResult - Outcome of the evaluation process

**Components**:
- Models: Evaluation, EvaluationCriteria, EvaluationResult
- Services: EvaluationService, EvaluationThreadService, DynamicPromptService, UserContextService
- Repositories: EvaluationRepository
- Controllers: EvaluationController

### Personality Domain (`/src/core/personality`)

**Responsibility**: Managing user personality traits and preferences.

**Key Concepts**:
- PersonalityTrait - Individual personality characteristics
- PersonalityProfile - Collection of traits forming a user's profile

**Components**:
- Models: PersonalityTrait, PersonalityProfile
- Services: PersonalityService
- Repositories: PersonalityRepository
- Controllers: PersonalityController

### Progress Domain (`/src/core/progress`)

**Responsibility**: Tracking user learning progress.

**Key Concepts**:
- Progress - User's advancement in learning
- Achievement - Accomplishments and milestones

**Components**:
- Models: Progress, Achievement
- Services: ProgressService
- Repositories: ProgressRepository
- Controllers: ProgressController

### Adaptive Domain (`/src/core/adaptive`)

**Responsibility**: Providing adaptive learning functionality.

**Key Concepts**:
- AdaptiveModel - Learning model that adapts to user behavior
- AdaptiveRecommendation - Personalized recommendations

**Components**:
- Models: AdaptiveModel, AdaptiveRecommendation
- Services: AdaptiveService
- Repositories: AdaptiveRepository
- Controllers: AdaptiveController

### Prompt Domain (`/src/core/prompt`)

**Responsibility**: Managing prompts for AI interactions.

**Key Concepts**:
- Prompt - Input for AI models
- PromptTemplate - Reusable templates for prompts
- PromptBuilder - Constructs prompts based on context

**Components**:
- Models: Prompt, PromptTemplate
- Services: Various prompt builders (ChallengePromptBuilder, EvaluationPromptBuilder, etc.)
- Common: Formatters, error handlers
- Builders: Specialized prompt builders

## Cross-Domain Communication

Domains should communicate with each other through:

1. **Domain Events**: Used for loosely coupled communication
2. **Application Coordinators**: For orchestrating across multiple domains
3. **Public Interfaces**: Well-defined interfaces between domains

## Domain Independence

Each domain should:
- Be self-contained with its own models, services, repositories, and controllers
- Not directly depend on other domains' internals
- Have a clear and well-defined responsibility
- Implement a consistent and domain-specific language

## Infrastructure Usage

All domains can use shared infrastructure components from `/src/core/infra`, including:
- Database access utilities
- Logging services
- Error handling
- Dependency injection
- HTTP middleware 