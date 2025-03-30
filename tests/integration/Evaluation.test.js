import { expect } from "chai";
import sinon from "sinon";
import Evaluation from "../../../src/core/evaluation/models/Evaluation";
describe('Evaluation Model Integration', () => {
    it('Evaluation model constructor creates valid instance', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85
        });
        expect(evaluation).to.not.be.undefined;
        expect(evaluation.userId).to.equal('test-user');
        expect(evaluation.challengeId).to.equal('test-challenge');
        expect(evaluation.score).to.equal(85);
        expect(evaluation.isValid()).toBe(true);
    });
    it('mapFocusAreasToCategories correctly maps focus areas', async () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85,
            userContext: {
                focusAreas: ['AI Ethics', 'Critical Thinking']
            }
        });
        const categories = await evaluation.mapFocusAreasToCategories(['AI Ethics', 'Critical Thinking']);
        expect(categories).to.not.be.undefined;
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).to.be.above(0);
        // Ethics-focused categories should be included
        const hasEthicalCategory = categories.some(cat => cat === 'ethical_reasoning' || cat === 'stakeholder_consideration');
        expect(hasEthicalCategory).to.equal(true);
    });
    it('calculateMetrics generates appropriate metrics', () => {
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
        expect(metrics).to.not.be.undefined;
        expect(metrics.normalizedScore).to.equal(85);
        expect(metrics.performanceLevel).to.equal('excellent');
        expect(metrics.categoryPerformanceLevels).to.have.property('accuracy');
        expect(metrics.categoryPerformanceLevels.accuracy).to.equal('excellent');
    });
    it('addCategoryScore updates metrics correctly', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85
        });
        evaluation.addCategoryScore('accuracy', 90);
        evaluation.addCategoryScore('clarity', 80);
        expect(evaluation.categoryScores.accuracy).to.equal(90);
        expect(evaluation.categoryScores.clarity).to.equal(80);
        expect(evaluation.metrics.categoryStrengths).to.include('accuracy');
    });
    it('getPersonalizedFeedback returns tailored feedback', () => {
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
        expect(feedback).to.not.be.undefined;
        expect(feedback.feedback).to.equal('Great job overall!');
        expect(feedback.skillLevelFeedback).to.include('intermediate');
        expect(feedback.performanceLevel).to.equal('excellent');
    });
});
