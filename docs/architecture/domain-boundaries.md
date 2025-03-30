# Domain Boundaries Enforcement

This document provides guidelines on how to maintain strong domain boundaries in our Domain-Driven Design architecture.

## Importance of Domain Boundaries

Well-defined and enforced domain boundaries are essential for maintaining a clean, maintainable codebase:

1. **Single Responsibility**: Each domain has a clear, focused purpose
2. **Reduced Coupling**: Fewer dependencies between domains
3. **Enhanced Maintainability**: Changes in one domain have minimal impact on others
4. **Team Autonomy**: Different teams can work on different domains with minimal coordination
5. **Testing**: Domains can be tested in isolation

## Domain Boundary Rules

### Core Principles

1. **Explicit Dependencies**: All cross-domain dependencies must be explicitly declared in constructors
2. **Domain Privacy**: Internal domain implementation details should not be exposed
3. **Interface Segregation**: Expose only what is needed by consuming domains
4. **Event-Driven Communication**: Prefer domain events for cross-domain communication
5. **Import Restrictions**: Only import from domains you explicitly depend on

### Directory Structure Enforcement

Our domain directory structure enforces boundaries:

```
src/
  core/
    domain1/
      models/      # Internal domain models
      services/    # Domain services (internal and public)
      repositories/ # Repository interfaces and implementations
      errors/      # Domain-specific errors
      events/      # Domain event definitions
    domain2/
      ...
```

### What Belongs Inside a Domain?

Each domain should contain:

1. **Domain Models**: Entities, value objects, and aggregates specific to the domain
2. **Domain Services**: Services encapsulating domain-specific business logic
3. **Repository Interfaces**: Abstract interfaces for data access
4. **Domain Events**: Events that signal important domain occurrences
5. **Domain Errors**: Error types specific to the domain
6. **Domain DTOs**: Data transfer objects for domain boundaries

### What Should Not Cross Domain Boundaries?

1. **Internal Models**: Domain models should not be directly used by other domains
2. **Implementation Details**: How a domain implements its functionality
3. **Database Access Code**: Repository implementations are internal to the domain
4. **Validation Logic**: Domain-specific validation rules
5. **Domain-Specific Value Objects**: Unless shared in Common domain

## Code Examples

### Correct Domain Boundary Implementation

```javascript
// In Challenge domain service (good example)
class ChallengeService {
  constructor({ userService, focusAreaService }) {
    this.userService = userService;
    this.focusAreaService = focusAreaService;
  }
  
  async generateChallenge(userId, focusAreaId) {
    // Get only what we need through the public interface
    const userSkillLevel = await this.userService.getUserSkillLevel(userId);
    const focusAreaTopics = await this.focusAreaService.getFocusAreaTopics(focusAreaId);
    
    // Domain logic using the abstracted dependencies
    // ...
  }
}
```

### Incorrect Domain Boundary Implementation

```javascript
// In Challenge domain service (bad example)
import { User } from '../../user/models/User'; // Direct import of internal model
import { userRepository } from '../../user/repositories/userRepository'; // Direct import of repository

class ChallengeService {
  async generateChallenge(userId, focusAreaId) {
    // Directly accessing user domain's internal repository
    const user = await userRepository.findById(userId);
    
    // Directly accessing internal user properties
    const skillLevel = user.preferences.skillLevel;
    const userInterests = user.profile.interests;
    
    // Domain logic using internal knowledge of User domain
    // ...
  }
}
```

## Domain Communication Patterns

### 1. Public API Pattern

Each domain exposes a clear public API for other domains:

```javascript
// User domain's public interface
export class UserService {
  // Public methods - documented contract
  async getUserById(id) { /*...*/ }
  async getUserSkillLevel(id) { /*...*/ }
  async updateUserProfile(id, profile) { /*...*/ }
  
  // Private methods - not for external consumption
  #validateUserProfile(profile) { /*...*/ }
  #calculateExperienceLevel(stats) { /*...*/ }
}
```

### 2. Domain Events Pattern

For asynchronous communication between domains:

```javascript
// In User domain entity
updateFocusArea(newFocusAreaId) {
  const oldFocusAreaId = this.focusAreaId;
  this.focusAreaId = newFocusAreaId;
  this.lastUpdated = new Date();
  
  // Add domain event
  this.addDomainEvent('user.focusArea.changed', {
    previousFocusAreaId: oldFocusAreaId,
    focusAreaId: this.focusAreaId
  });
}

// In Challenge domain's event handler
async handleUserFocusAreaChanged(event) {
  const { userId, focusAreaId } = event.data;
  await this.challengeService.updateChallengeRecommendations(userId, focusAreaId);
}
```

### 3. Application Coordinator Pattern

For operations spanning multiple domains:

```javascript
// In Application layer
class UpdateUserProfileCoordinator {
  constructor({ 
    userService, 
    personalityService, 
    focusAreaService,
    challengeService
  }) {
    this.userService = userService;
    this.personalityService = personalityService;
    this.focusAreaService = focusAreaService;
    this.challengeService = challengeService;
  }
  
  async execute(userId, profileData) {
    // Coordinating across multiple domains
    const user = await this.userService.updateUserProfile(userId, profileData);
    
    if (profileData.personality) {
      await this.personalityService.updateUserPersonalitySettings(userId, profileData.personality);
    }
    
    if (profileData.focusAreaId) {
      await this.focusAreaService.setUserFocusArea(userId, profileData.focusAreaId);
      await this.challengeService.refreshChallengeRecommendations(userId);
    }
    
    return user;
  }
}
```

## Domain-Specific Rules

### User Domain

- Central source for user identity and profile information
- Other domains must use UserService to access user data
- User domain should not depend on other domains except Auth and Common

### Challenge Domain

- Contains all challenge-related business logic
- Challenge domain can depend on User, FocusArea, and Prompt domains
- Challenge domain should not directly access Progress or Evaluation internals

### Evaluation Domain

- Handles evaluation of challenge responses
- Depends on Challenge and User domains for essential data
- Emits events that Progress domain can consume
- Should not directly modify Progress domain data

### Progress Domain

- Tracks user progress across challenges and skills
- Consumes events from Challenge and Evaluation domains
- Provides public API for accessing progress metrics
- Should not directly modify User or Challenge domain data

## Common Anti-Patterns to Avoid

1. **Domain Model Leakage**: Exposing internal domain models outside the domain boundary
   ```javascript
   // Bad
   return userRepository.findById(id); // Returns internal User entity
   
   // Good
   const user = await userRepository.findById(id);
   return userDTOMapper.toDTO(user); // Returns data transfer object
   ```

2. **Circular Dependencies**: Domains depending on each other
   ```javascript
   // Bad: Circular dependency between User and Challenge
   // User -> Challenge -> User
   
   // Good: Use domain events to break cycles
   // User emits events -> Challenge consumes events
   ```

3. **God Domains**: Domains that know too much about other domains
   ```javascript
   // Bad: Challenge domain knowing too much about Progress
   class ChallengeService {
     updateProgress(userId, challengeId, score) {
       // Directly manipulating Progress domain concepts
     }
   }
   
   // Good: Stick to Challenge domain concerns
   class ChallengeService {
     completeChallenge(userId, challengeId, score) {
       // Emit event for Progress domain to consume
     }
   }
   ```

4. **Database-Driven Design**: Structuring domains around database tables
   ```javascript
   // Bad: Domain matching database table structure
   class UserRepository {
     getUserTable() {...}
     getUserPreferencesTable() {...}
   }
   
   // Good: Domain focused on business concepts
   class UserRepository {
     getUserWithPreferences(id) {...}
     updateUserProfile(user) {...}
   }
   ```

## Maintaining Domain Boundaries Over Time

1. **Regular Architecture Reviews**: Schedule reviews to identify boundary violations
2. **Automated Checks**: Implement static analysis to enforce import rules
3. **Developer Education**: Train developers on DDD principles and boundary enforcement
4. **Domain Ownership**: Assign domain owners responsible for maintaining boundaries
5. **Refactoring Plan**: Have a clear process for fixing boundary violations
6. **Documentation**: Keep domain responsibilities and boundaries well-documented 