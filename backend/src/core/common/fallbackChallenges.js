'use strict';
/**
 * Fallback Challenges
 *
 * Provides pre-defined fallback challenges when dynamic generation fails.
 * Moved from utils to follow Domain-Driven Design principles.
 */
/**
 * Get a fallback challenge for when challenge generation fails
 * @param {string} focusArea - The focus area for the challenge
 * @param {string} challengeType - The type of challenge
 * @returns {Object} A fallback challenge
 */
const getFallbackChallenge = (focusArea = 'critical thinking', challengeType = 'scenario') => {
    // Find a matching fallback challenge or use a default
    const challenge = FALLBACK_CHALLENGES.find(c => c.focusArea.toLowerCase() === focusArea.toLowerCase() &&
        c.challengeType.toLowerCase() === challengeType.toLowerCase());
    if (challenge) {
        return { ...challenge };
    }
    // Return the default challenge if no match found
    return { ...FALLBACK_CHALLENGES[0] };
};
/**
 * Pre-defined fallback challenges
 */
const FALLBACK_CHALLENGES = [
    {
        id: 'fallback-ct-scenario-1',
        title: 'Analyzing a New AI Tool',
        focusArea: 'critical thinking',
        challengeType: 'scenario',
        formatType: 'scenario',
        difficulty: 'medium',
        content: {
            prompt: 'You have discovered a new AI tool that claims it can write perfect essays on any topic. How would you evaluate this claim? What questions would you ask to test it? What critical thinking strategies would you apply?',
            context: 'In today\'s world, we are bombarded with new AI technologies that make bold claims. Critical evaluation of these claims is an essential skill.',
            timeEstimate: 600
        },
        evaluationCriteria: {
            'depth of analysis': 0.4,
            'critical evaluation': 0.4,
            'practical approach': 0.2,
        },
    },
    {
        id: 'fallback-comms-quiz-1',
        title: 'Effective AI Communication',
        focusArea: 'communication skills',
        challengeType: 'multiple-choice',
        formatType: 'quiz',
        difficulty: 'easy',
        content: {
            questions: [
                {
                    id: 'q1',
                    text: 'Which of the following is most important when giving instructions to an AI?',
                    options: [
                        'Using technical jargon to be precise',
                        'Being clear and specific about what you want',
                        'Keeping instructions as short as possible',
                        'Using complex sentences to convey nuance',
                    ],
                    correctAnswer: 1,
                },
                {
                    id: 'q2',
                    text: 'When an AI gives you an incorrect response, what is usually the most effective approach?',
                    options: [
                        'Repeat the exact same prompt but louder (ALL CAPS)',
                        'Give up and try a completely different approach',
                        'Provide feedback and clarify your request',
                        'Report the AI as broken',
                    ],
                    correctAnswer: 2,
                },
                {
                    id: 'q3',
                    text: 'Which communication strategy often leads to better results with AI systems?',
                    options: [
                        'Providing context and examples',
                        'Using as few words as possible',
                        'Asking vague, open-ended questions',
                        'Demanding specific outputs',
                    ],
                    correctAnswer: 0,
                },
            ],
            timeEstimate: 300,
        },
        evaluationCriteria: {
            knowledge: 0.6,
            understanding: 0.4,
        },
    },
    {
        id: 'fallback-ethical-essay-1',
        title: 'AI in Education: Ethical Considerations',
        focusArea: 'ethical dilemmas',
        challengeType: 'text-response',
        formatType: 'essay',
        difficulty: 'hard',
        content: {
            prompt: 'Write a thoughtful essay exploring the ethical implications of using AI systems to grade student essays and provide feedback. Consider benefits, risks, and potential safeguards.',
            context: 'Educational institutions are increasingly looking to AI to help manage workloads and provide timely feedback to students. This raises important ethical questions about assessment, feedback, and the teacher-student relationship.',
            timeEstimate: 900,
        },
        evaluationCriteria: {
            'ethical reasoning': 0.3,
            'balanced perspective': 0.3,
            'depth of analysis': 0.2,
            'solution-oriented thinking': 0.2,
        },
    },
];
export { getFallbackChallenge };
export { FALLBACK_CHALLENGES };
export default {
    getFallbackChallenge,
    FALLBACK_CHALLENGES
};
