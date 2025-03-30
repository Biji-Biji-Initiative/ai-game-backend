import { expect } from "chai";
import sinon from "sinon";
import proxyquire from "proxyquire";
import { createSupabaseProxyStub } from "../../helpers/mockSupabaseClient.js";
const proxyquireNoCallThru = proxyquire.noCallThru();
// Set up mocks for dependencies
const mockEvaluationCategoryRepository = {
    mapFocusAreasToCategories: sinon.stub().resolves([
        'ethical_reasoning',
        'stakeholder_consideration',
        'critical_analysis'
    ])
};
// Create a mock EvaluationDomainService
const mockEvaluationDomainService = {
    mapFocusAreasToCategories: sinon.stub().resolves([
        'ethical_reasoning',
        'stakeholder_consideration',
        'critical_analysis'
    ]),
    processUserContext: sinon.stub().resolves({
        focusAreas: ['AI Ethics', 'Critical Thinking'],
        relevantCategories: [
            'ethical_reasoning',
            'stakeholder_consideration',
            'critical_analysis'
        ]
    })
};
// Use proxyquire to load the evaluationCategoryRepository with mocked dependencies
const mockEvaluationCategoryRepositoryWithDeps = proxyquire('../../../src/core/evaluation/repositories/evaluationCategoryRepository', {
    '../../infra/db/supabaseClient': createSupabaseProxyStub({
        from: {
            select: {
                data: [
                    { id: 'cat1', name: 'Ethical Reasoning', slug: 'ethical_reasoning' },
                    { id: 'cat2', name: 'Stakeholder Consideration', slug: 'stakeholder_consideration' },
                    { id: 'cat3', name: 'Critical Analysis', slug: 'critical_analysis' }
                ]
            }
        }
    })
});
// Use proxyquire to load the Evaluation module with mocked dependencies
const Evaluation = proxyquire('../../../src/core/evaluation/models/Evaluation', {
    '../../infra/db/supabaseClient': createSupabaseProxyStub()
});
describe('Evaluation Model Integration', () => {
    beforeEach(() => {
        // Reset the stubs before each test
        mockEvaluationCategoryRepository.mapFocusAreasToCategories.reset();
        mockEvaluationCategoryRepository.mapFocusAreasToCategories.resolves([
            'ethical_reasoning',
            'stakeholder_consideration',
            'critical_analysis'
        ]);
        mockEvaluationDomainService.mapFocusAreasToCategories.reset();
        mockEvaluationDomainService.mapFocusAreasToCategories.resolves([
            'ethical_reasoning',
            'stakeholder_consideration',
            'critical_analysis'
        ]);
    });
    afterEach(() => {
        sinon.restore();
    });
    it('Evaluation model constructor creates valid instance', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85,
            categoryScores: {
                accuracy: 90,
                clarity: 80
            }
        });
        expect(evaluation).to.not.be.undefined;
        expect(evaluation.userId).to.equal('test-user');
        expect(evaluation.challengeId).to.equal('test-challenge');
        expect(evaluation.score).to.equal(85);
        expect(evaluation.isValid()).to.be.true;
    });
    it('Properly uses relevant categories provided by domain service', async () => {
        // First get categories from domain service
        const focusAreas = ['AI Ethics', 'Critical Thinking'];
        const relevantCategories = await mockEvaluationDomainService.mapFocusAreasToCategories(focusAreas);
        // Create evaluation with relevant categories
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85,
            categoryScores: {
                ethical_reasoning: 90,
                stakeholder_consideration: 80,
                critical_analysis: 85,
                irrelevant_category: 70
            },
            userContext: {
                focusAreas: focusAreas
            },
            relevantCategories: relevantCategories
        });
        // Check that the domain service was called with the right arguments
        expect(mockEvaluationDomainService.mapFocusAreasToCategories.calledWith(focusAreas)).to.be.true;
        // Verify we correctly stored the categories
        expect(evaluation.relevantCategories).to.include('ethical_reasoning');
        expect(evaluation.relevantCategories).to.include('stakeholder_consideration');
        // Verify metrics are calculated correctly
        const metrics = evaluation.calculateMetrics();
        expect(metrics.focusAreaScores).to.have.property('ethical_reasoning');
        expect(metrics.focusAreaScores).to.have.property('stakeholder_consideration');
        expect(metrics.focusAreaScores).to.not.have.property('irrelevant_category');
    });
    it('setRelevantCategories method updates categories properly', () => {
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
        evaluation.setRelevantCategories(['accuracy', 'reasoning']);
        expect(evaluation.relevantCategories).to.include('accuracy');
        expect(evaluation.relevantCategories).to.include('reasoning');
        expect(evaluation.relevantCategories).to.not.include('clarity');
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
            score: 85,
            categoryScores: {
                clarity: 80
            }
        });
        evaluation.addCategoryScore('accuracy', 90);
        expect(evaluation.categoryScores.accuracy).to.equal(90);
        expect(evaluation.categoryScores.clarity).to.equal(80);
        expect(evaluation.metrics.categoryStrengths).to.include('accuracy');
    });
    it('getPersonalizedFeedback returns tailored feedback with relevantCategories', () => {
        const evaluation = new Evaluation({
            userId: 'test-user',
            challengeId: 'test-challenge',
            score: 85,
            overallFeedback: 'Great job overall!',
            categoryScores: {
                ethical_reasoning: 90,
                stakeholder_consideration: 80,
                critical_analysis: 85
            },
            userContext: {
                skillLevel: 'intermediate',
                focusAreas: ['AI Ethics']
            },
            relevantCategories: [
                'ethical_reasoning',
                'stakeholder_consideration',
                'critical_analysis'
            ]
        });
        const feedback = evaluation.getPersonalizedFeedback();
        expect(feedback).to.not.be.undefined;
        expect(feedback.feedback).to.equal('Great job overall!');
        expect(feedback.skillLevelFeedback).to.include('intermediate');
        expect(feedback.performanceLevel).to.equal('excellent');
        expect(feedback.focusAreaRelevance).to.include('In your focus areas');
    });
});
