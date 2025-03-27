/**
 * Integration Tests for Evaluation Model
 * 
 * These tests verify that the Evaluation model correctly integrates
 * with the database repository and handles mapping focus areas to categories.
 */

const Evaluation = require('../../src/core/evaluation/models/Evaluation');

describe('Evaluation Model Integration', () => {
  
  test('Evaluation model constructor creates valid instance', () => {
    const evaluation = new Evaluation({
      userId: 'test-user',
      challengeId: 'test-challenge',
      score: 85
    });
    
    expect(evaluation).toBeDefined();
    expect(evaluation.userId).toBe('test-user');
    expect(evaluation.challengeId).toBe('test-challenge');
    expect(evaluation.score).toBe(85);
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
    const hasEthicalCategory = categories.some(cat => 
      cat === 'ethical_reasoning' || cat === 'stakeholder_consideration'
    );
    
    expect(hasEthicalCategory).toBe(true);
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
    expect(metrics.normalizedScore).toBe(85);
    expect(metrics.performanceLevel).toBe('excellent');
    expect(metrics.categoryPerformanceLevels).toHaveProperty('accuracy');
    expect(metrics.categoryPerformanceLevels.accuracy).toBe('excellent');
  });
  
  test('addCategoryScore updates metrics correctly', () => {
    const evaluation = new Evaluation({
      userId: 'test-user',
      challengeId: 'test-challenge',
      score: 85
    });
    
    evaluation.addCategoryScore('accuracy', 90);
    evaluation.addCategoryScore('clarity', 80);
    
    expect(evaluation.categoryScores.accuracy).toBe(90);
    expect(evaluation.categoryScores.clarity).toBe(80);
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
    expect(feedback.feedback).toBe('Great job overall!');
    expect(feedback.skillLevelFeedback).toContain('intermediate');
    expect(feedback.performanceLevel).toBe('excellent');
  });
}); 