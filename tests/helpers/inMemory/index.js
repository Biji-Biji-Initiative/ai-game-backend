/**
 * In-Memory Repository Index
 * 
 * This file exports all in-memory repository implementations for easy importing.
 */

// Import all repository implementations
const {
  InMemoryRepository,
  createInMemoryChallengeRepository,
  createInMemoryFocusAreaRepository,
  createInMemoryEvaluationRepository,
  createInMemoryUserRepository,
  createInMemoryPersonalityRepository,
  createInMemoryPromptRepository,
  createInMemoryConversationStateRepository
} = require('./inMemoryRepository');

// Export all repositories
module.exports = {
  // Base repository
  InMemoryRepository,
  
  // Domain-specific repositories
  createInMemoryChallengeRepository,
  createInMemoryFocusAreaRepository,
  createInMemoryEvaluationRepository,
  createInMemoryUserRepository,
  createInMemoryPersonalityRepository,
  createInMemoryPromptRepository,
  createInMemoryConversationStateRepository,
  
  // Helper function to create all repositories at once
  createAllRepositories: () => ({
    challengeRepository: createInMemoryChallengeRepository(),
    focusAreaRepository: createInMemoryFocusAreaRepository(),
    evaluationRepository: createInMemoryEvaluationRepository(),
    userRepository: createInMemoryUserRepository(),
    personalityRepository: createInMemoryPersonalityRepository(),
    promptRepository: createInMemoryPromptRepository(),
    conversationStateRepository: createInMemoryConversationStateRepository()
  })
}; 