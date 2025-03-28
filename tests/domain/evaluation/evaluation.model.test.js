const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

/**
 * Integration Tests for Evaluation Model
 * 
 * These tests verify that the Evaluation model correctly integrates
 * with the database repository and handles mapping focus areas to categories.
 */

// Import the Supabase client mock helper
const { createSupabaseProxyStub } = require('../../helpers/mockSupabaseClient');

// Set up mocks for dependencies
const mockEvaluationCategoryRepository = {
  findCategoriesForFocusAreas: sinon.stub().resolves([
    'ethical_reasoning',
    'stakeholder_consideration',
    'critical_analysis'
  ])
};

// Use proxyquire to load the evaluationCategoryRepository with mocked dependencies
const mockEvaluationCategoryRepositoryWithDeps = proxyquire(
  '../../../src/core/evaluation/repositories/evaluationCategoryRepository', 
  {
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
  }
);

// Use proxyquire to load the Evaluation module with mocked dependencies
const Evaluation = proxyquire('../../../src/core/evaluation/models/Evaluation', {
  '../repositories/evaluationCategoryRepository': mockEvaluationCategoryRepository,
  '../../infra/db/supabaseClient': createSupabaseProxyStub()
});

describe('Evaluation Model Integration', () => {
  
  beforeEach(() => {
    // Reset the stubs before each test
    mockEvaluationCategoryRepository.findCategoriesForFocusAreas.reset();
    mockEvaluationCategoryRepository.findCategoriesForFocusAreas.resolves([
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
      score: 85
    });
    
    expect(evaluation).to.not.be.undefined;
    expect(evaluation.userId).to.equal('test-user');
    expect(evaluation.challengeId).to.equal('test-challenge');
    expect(evaluation.score).to.equal(85);
    expect(evaluation.isValid()).to.be.true;
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
    expect(Array.isArray(categories)).to.be.true;
    expect(categories.length).to.be.above(0);
    
    // Check that the repository was called with the right arguments
    expect(mockEvaluationCategoryRepository.findCategoriesForFocusAreas.calledWith(
      ['AI Ethics', 'Critical Thinking']
    )).to.be.true;
    
    // Verify we got the mocked response
    expect(categories).to.include('ethical_reasoning');
    expect(categories).to.include('stakeholder_consideration');
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