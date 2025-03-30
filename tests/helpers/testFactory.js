/**
 * Test Factory Helper
 *
 * Provides factory functions to create test data objects for tests.
 * This simplifies test creation and avoids duplication.
 */
/**
 * Creates a test user with default values
 * @param {Object} overrides - Properties to override the defaults
 * @returns {Object} A test user object
 */
function createTestUser(overrides = {}) {
    const defaultUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        skillLevel: 'intermediate',
        focusAreas: ['critical_thinking', 'problem_solving'],
        personality_traits: ['analytical', 'logical', 'thoughtful'],
        ai_attitudes: ['interested', 'neutral'],
        professionalTitle: 'Software Developer',
        location: 'New York',
        preferences: {
            challenge_difficulty: 'moderate',
            feedback_style: 'direct',
            learning_style: 'visual'
        },
        created_at: new Date().toISOString()
    };
    return { ...defaultUser, ...overrides };
}
/**
 * Creates a test challenge with default values
 * @param {Object} overrides - Properties to override the defaults
 * @returns {Object} A test challenge object
 */
function createTestChallenge(overrides = {}) {
    const defaultChallenge = {
        id: 'test-challenge-id',
        title: 'Test Challenge',
        description: 'This is a test challenge description',
        challengeType: 'analysis',
        content: 'This is the content of the test challenge.',
        focusArea: 'critical_thinking',
        difficulty: 'intermediate',
        tags: ['test', 'sample', 'analysis'],
        userId: 'test-user-id',
        collaborators: [],
        status: 'published',
        created_at: new Date().toISOString()
    };
    return { ...defaultChallenge, ...overrides };
}
/**
 * Creates a test evaluation with default values
 * @param {Object} overrides - Properties to override the defaults
 * @returns {Object} A test evaluation object
 */
function createTestEvaluation(overrides = {}) {
    const defaultEvaluation = {
        id: 'test-evaluation-id',
        userId: 'test-user-id',
        challengeId: 'test-challenge-id',
        score: 85,
        categoryScores: {
            clarity: 80,
            accuracy: 90,
            reasoning: 85
        },
        overallFeedback: 'This is overall feedback for the evaluation.',
        strengths: ['Clear explanation', 'Good use of examples'],
        areasForImprovement: ['Could improve depth of analysis'],
        created_at: new Date().toISOString()
    };
    return { ...defaultEvaluation, ...overrides };
}
export { createTestUser };
export { createTestChallenge };
export { createTestEvaluation };
export default {
    createTestUser,
    createTestChallenge,
    createTestEvaluation
};
