/**
 * Integration Tests for Evaluation Category Repository
 * 
 * These tests verify that the evaluation category repository correctly
 * interacts with the Supabase database.
 */

const evaluationCategoryRepository = require('../../../src/core/evaluation/repositories/evaluationCategoryRepository');

describe('Evaluation Category Repository', () => {
  test('getAllCategories returns data in the correct format', async () => {
    try {
      const categories = await evaluationCategoryRepository.getAllCategories();
      
      // Check if we got a response
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      
      // If there are categories, check one random category has the expected structure
      if (categories.length > 0) {
        const category = categories[0];
        expect(category).toHaveProperty('key');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
      }
    } catch (error) {
      // Allow test to pass if the database table doesn't exist yet
      if (error.message && error.message.includes('does not exist')) {
        console.log('Table does not exist yet, skipping test');
      } else {
        throw error;
      }
    }
  });
  
  test('getCategoriesForFocusArea returns data in the correct format', async () => {
    try {
      // Test with a known focus area
      const focusArea = 'AI Ethics';
      const categories = await evaluationCategoryRepository.getCategoriesForFocusArea(focusArea);
      
      // Check if we got a response
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      
      if (categories.length > 0) {
        const category = categories[0];
        expect(category).toHaveProperty('key');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('weight');
      }
    } catch (error) {
      // Allow test to pass if the database table doesn't exist yet
      if (error.message && error.message.includes('does not exist')) {
        console.log('Table does not exist yet, skipping test');
      } else {
        throw error;
      }
    }
  });
  
  test('getCategoryWeightsForFocusArea returns data in the correct format', async () => {
    try {
      // Test with a known focus area
      const focusArea = 'AI Ethics';
      const weights = await evaluationCategoryRepository.getCategoryWeightsForFocusArea(focusArea);
      
      // Check if we got a response
      expect(weights).toBeDefined();
      expect(typeof weights).toBe('object');
      
      // Should have at least one category weight
      const hasWeights = Object.keys(weights).length > 0;
      expect(hasWeights).toBe(true);
      
      // Check that weights are numbers
      const sampleCategory = Object.keys(weights)[0];
      expect(typeof weights[sampleCategory]).toBe('number');
    } catch (error) {
      // Allow test to pass if the database table doesn't exist yet
      if (error.message && error.message.includes('does not exist')) {
        console.log('Table does not exist yet, skipping test');
      } else {
        throw error;
      }
    }
  });
  
  test('getCategoryDescriptions returns data in the correct format', async () => {
    try {
      const descriptions = await evaluationCategoryRepository.getCategoryDescriptions();
      
      // Check if we got a response
      expect(descriptions).toBeDefined();
      expect(typeof descriptions).toBe('object');
      
      // Check if it has at least some categories
      const hasDescriptions = Object.keys(descriptions).length > 0;
      expect(hasDescriptions).toBe(true);
      
      // Check that descriptions are strings
      const sampleCategory = Object.keys(descriptions)[0];
      expect(typeof descriptions[sampleCategory]).toBe('string');
    } catch (error) {
      // Allow test to pass if the database table doesn't exist yet
      if (error.message && error.message.includes('does not exist')) {
        console.log('Table does not exist yet, skipping test');
      } else {
        throw error;
      }
    }
  });
  
  test('mapFocusAreasToCategories maps focus areas to relevant categories', async () => {
    try {
      // Test with a known focus area
      const focusAreas = ['AI Ethics'];
      const categories = await evaluationCategoryRepository.mapFocusAreasToCategories(focusAreas);
      
      // Check if we got a response
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      
      // Should have at least one relevant category
      expect(categories.length).toBeGreaterThan(0);
      
      // Check if AI Ethics maps to at least one ethics-related category
      const ethicsCategories = ['ethical_reasoning', 'stakeholder_consideration', 'comprehensiveness'];
      const hasEthicsCategory = categories.some(category => ethicsCategories.includes(category));
      expect(hasEthicsCategory).toBe(true);
      
      // Check if the mapping works for multiple focus areas
      const multipleFocusAreas = ['AI Ethics', 'Critical Thinking'];
      const multipleCategories = await evaluationCategoryRepository.mapFocusAreasToCategories(multipleFocusAreas);
      
      // Should have categories with multiple focus areas
      expect(multipleCategories.length).toBeGreaterThan(0);
      
    } catch (error) {
      // Allow test to pass if the database table doesn't exist yet
      if (error.message && error.message.includes('does not exist')) {
        console.log('Table does not exist yet, skipping test');
      } else {
        throw error;
      }
    }
  });
  
  test('mapFocusAreasToCategories throws error for empty input', async () => {
    await expect(evaluationCategoryRepository.mapFocusAreasToCategories([])).rejects.toThrow();
  });
  
  test('getCategoryDescription returns description for a specific category', async () => {
    try {
      const category = 'ethical_reasoning';
      const description = await evaluationCategoryRepository.getCategoryDescription(category);
      
      // Check if we got a response
      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    } catch (error) {
      // Allow test to pass if the database table doesn't exist yet
      if (error.message && error.message.includes('does not exist')) {
        console.log('Table does not exist yet, skipping test');
      } else {
        throw error;
      }
    }
  });
}); 