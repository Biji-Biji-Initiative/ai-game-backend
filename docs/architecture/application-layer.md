# Application Layer: Coordinator Pattern

This document explains the Coordinator pattern used in the application layer of the AI Fight Club API.

## Overview

The application layer sits between the external interface layer (API routes, CLI) and the domain layer. It orchestrates the flow of calls to domain services, ensuring that the business logic is properly executed.

In our architecture, we use the "Coordinator" pattern instead of the more traditional "Application Service" or "Use Case" pattern. Coordinators serve as the entry point for specific business operations that span multiple domain services.

## Coordinator Pattern

### Purpose

Coordinators:

1. **Orchestrate workflow** across multiple domain services
2. **Handle cross-cutting concerns** like logging, error handling, and transactions
3. **Provide a cohesive API** for external interfaces
4. **Maintain separation of concerns** by not containing domain logic

### Structure

```javascript
// Example coordinator
class CompleteUserChallengeCoordinator {
  constructor(
    challengeService,
    evaluationService,
    progressService,
    userService,
    domainEventPublisher
  ) {
    this.challengeService = challengeService;
    this.evaluationService = evaluationService;
    this.progressService = progressService;
    this.userService = userService;
    this.domainEventPublisher = domainEventPublisher;
  }
  
  async execute(userId, challengeId, response) {
    try {
      // 1. Validate challenge exists and belongs to user
      const challenge = await this.challengeService.getChallenge(challengeId);
      if (!challenge || challenge.userId !== userId) {
        throw new AppError('Challenge not found or does not belong to user', 404);
      }
      
      // 2. Record the response
      await this.challengeService.recordResponse(challengeId, response);
      
      // 3. Evaluate the response
      const evaluation = await this.evaluationService.evaluateResponse(
        challengeId, 
        userId, 
        response
      );
      
      // 4. Update user progress
      await this.progressService.updateUserProgress(
        userId, 
        challengeId, 
        evaluation.score
      );
      
      // 5. Return the result
      return {
        evaluation,
        nextRecommendations: await this.getUserNextRecommendations(userId)
      };
    } catch (error) {
      // Handle or rethrow the error
      console.error(`Error in CompleteUserChallengeCoordinator: ${error.message}`);
      throw error;
    }
  }
  
  async getUserNextRecommendations(userId) {
    const user = await this.userService.getUserById(userId);
    return this.challengeService.getRecommendedChallenges(user);
  }
}
```

## Differences from Traditional Patterns

### Coordinators vs. Application Services

While similar to application services, coordinators:

- **Focus on specific workflows** rather than being service-oriented
- **Have clearer, more targeted responsibilities**
- **Are named after the actions they coordinate** (e.g., CompleteUserChallengeCoordinator)

### Coordinators vs. Controllers

Unlike controllers, coordinators:

- **Don't handle HTTP-specific concerns** (request parsing, response formatting)
- **Are independent of the delivery mechanism** (can be used by API, CLI, or other interfaces)
- **Focus on business workflow** rather than request/response handling

## Implementation Guidelines

1. **Naming**: Name coordinators after the action they perform (verb + noun)
2. **Dependency Injection**: Inject all required services and repositories
3. **Single Responsibility**: Each coordinator should handle one specific workflow
4. **Error Handling**: Catch domain-specific errors and translate them to application errors
5. **Return Data**: Return DTOs (Data Transfer Objects) rather than domain objects

## Example Coordinators

Some key coordinators in our system:

- **GenerateUserChallengeCoordinator**: Creates a personalized challenge for a user
- **EvaluateUserResponseCoordinator**: Processes and evaluates a user's challenge response
- **UpdateUserProfileCoordinator**: Updates user profile information and preferences
- **GetUserProgressCoordinator**: Retrieves and formats a user's progress information

## Advantages

The coordinator pattern provides several benefits:

1. **Clear boundaries** between application and domain logic
2. **Simplified testing** by mocking dependencies
3. **Improved maintainability** through focused, single-responsibility components
4. **More explicit workflow documentation** through descriptive coordinator names
5. **Flexibility** to add cross-cutting concerns without modifying domain services 