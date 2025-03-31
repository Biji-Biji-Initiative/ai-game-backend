import Evaluation from "@/core/evaluation/models/Evaluation.js";
describe('Evaluation Model Integration', () => {
    test('Evaluation model constructor creates valid instance', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85
        });
        expect(evaluation).toBeDefined();
        expect(evaluation.userId).to.equal('test-user');
        expect(evaluation.challengeId).to.equal('test-challenge');
        expect(evaluation.score).to.equal(85);
        expect(evaluation.isValid()).toBe(true);
    });
    test('mapFocusAreasToCategories correctly maps focus areas', async () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85,
            userContext: {
                focusAreas: ['AI Ethics', 'Critical Thinking']
            }
        });
        const categories = await evaluation.mapFocusAreasToCategories(['AI Ethics', 'Critical Thinking']);
        expect(categories).toBeDefined();
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
        // Ethics-focused categories should be included
        const hasEthicalCategory = categories.some(cat => cat === 'ethical_reasoning' || cat === 'stakeholder_consideration');
        expect(hasEthicalCategory).to.equal(true);
    });
    test('calculateMetrics generates appropriate metrics', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85,
            categoryScores: {
                accuracy: 90,
                clarity: 80,
                reasoning: 85
            }
        });
        const metrics = evaluation.calculateMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.normalizedScore).to.equal(85);
        expect(metrics.performanceLevel).to.equal('excellent');
        expect(metrics.categoryPerformanceLevels).toHaveProperty('accuracy');
        expect(metrics.categoryPerformanceLevels.accuracy).to.equal('excellent');
    });
    test('addCategoryScore updates metrics correctly', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85
        });
        evaluation.addCategoryScore('accuracy', 90);
        evaluation.addCategoryScore('clarity', 80);
        expect(evaluation.categoryScores.accuracy).to.equal(90);
        expect(evaluation.categoryScores.clarity).to.equal(80);
        expect(evaluation.metrics.categoryStrengths).toContain('accuracy');
    });
    test('getPersonalizedFeedback returns tailored feedback', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85,
            overallFeedback: 'Great job overall!',
            userContext: {
                skillLevel: 'intermediate',
                focusAreas: ['AI Ethics']
            }
        });
        const feedback = evaluation.getPersonalizedFeedback();
        expect(feedback).toBeDefined();
        expect(feedback.feedback).to.equal('Great job overall!');
        expect(feedback.skillLevelFeedback).toContain('intermediate');
        expect(feedback.performanceLevel).to.equal('excellent');
    });
});
