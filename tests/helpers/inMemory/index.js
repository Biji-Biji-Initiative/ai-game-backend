import { InMemoryRepository, createInMemoryChallengeRepository, createInMemoryFocusAreaRepository, createInMemoryEvaluationRepository, createInMemoryUserRepository, createInMemoryPersonalityRepository, createInMemoryPromptRepository, createInMemoryConversationStateRepository } from "./inMemoryRepository.js";
export const createAllRepositories = () => ({
    challengeRepository: createInMemoryChallengeRepository(),
    focusAreaRepository: createInMemoryFocusAreaRepository(),
    evaluationRepository: createInMemoryEvaluationRepository(),
    userRepository: createInMemoryUserRepository(),
    personalityRepository: createInMemoryPersonalityRepository(),
    promptRepository: createInMemoryPromptRepository(),
    conversationStateRepository: createInMemoryConversationStateRepository()
});
export { InMemoryRepository };
export { createInMemoryChallengeRepository };
export { createInMemoryFocusAreaRepository };
export { createInMemoryEvaluationRepository };
export { createInMemoryUserRepository };
export { createInMemoryPersonalityRepository };
export { createInMemoryPromptRepository };
export { createInMemoryConversationStateRepository };
export default {
    InMemoryRepository,
    createInMemoryChallengeRepository,
    createInMemoryFocusAreaRepository,
    createInMemoryEvaluationRepository,
    createInMemoryUserRepository,
    createInMemoryPersonalityRepository,
    createInMemoryPromptRepository,
    createInMemoryConversationStateRepository,
    createAllRepositories
};
