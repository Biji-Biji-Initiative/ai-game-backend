'use strict';

/**
 * Repository for evaluation categories data
 * Provides methods to fetch evaluation categories, weights, and mappings
 * from the database.
 * 
 * @module evaluationCategoryRepository
 * @requires supabaseClient
 * @requires logger
 */

const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const {
  applyRepositoryErrorHandling,
  createErrorMapper
} = require('../../../core/infra/errors/centralizedErrorUtils');

// Import domain-specific error classes
const {
  EvaluationError,
  EvaluationNotFoundError,
  EvaluationValidationError,
} = require('../errors/EvaluationErrors');

// Create an error mapper for repositories
const evaluationRepositoryErrorMapper = createErrorMapper(
  {
    EntityNotFoundError: EvaluationNotFoundError,
    ValidationError: EvaluationValidationError,
    DatabaseError: EvaluationError,
  },
  EvaluationError
);

/**
 * Class representing an Evaluation Category Repository
 */
class EvaluationCategoryRepository {
  /**
   * Create a new EvaluationCategoryRepository instance
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.supabase - Supabase client instance
   * @param {Object} dependencies.logger - Logger instance
   */
  /**
   * Method constructor
   */
  constructor(dependencies = {}) {
    if (!dependencies.supabase && !supabaseClient) {
      throw new Error('Supabase client is required for EvaluationCategoryRepository');
    }
    
    if (!dependencies.logger) {
      throw new Error('Logger is required for EvaluationCategoryRepository');
    }
    
    this.supabase = dependencies.supabase || supabaseClient;
    this.logger = dependencies.logger;
    
    applyRepositoryErrorHandling(this, evaluationRepositoryErrorMapper);
  }

  /**
   * Get all evaluation categories
   * @returns {Promise<Array>} Array of evaluation categories
   */
  /**
   * Method getAllCategories
   */
  async getAllCategories() {
    const { data, error } = await this.supabase
      .from('evaluation_categories')
      .select('*')
      .order('key');
    
    if (error) {
      this.logger.error('Error fetching evaluation categories', { error });
      throw new Error(`Failed to fetch evaluation categories: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No evaluation categories found in database');
    }
    
    return data;
  }

  /**
   * Get categories for a specific focus area
   * @param {string} focusArea - Focus area to get categories for
   * @returns {Promise<Array>} Array of evaluation categories for the focus area
   */
  /**
   * Method getCategoriesForFocusArea
   */
  async getCategoriesForFocusArea(focusArea) {
    if (!focusArea) {
      throw new Error('Focus area is required');
    }
    
    const { data, error } = await this.supabase
      .from('focus_area_category_mappings')
      .select(`
        category_key,
        weight,
        evaluation_categories:category_key (
          key,
          name,
          description,
          weight
        )
      `)
      .eq('focus_area', focusArea);
    
    if (error) {
      this.logger.error('Error fetching categories for focus area', { error, focusArea });
      throw new Error(`Failed to fetch categories for focus area ${focusArea}: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error(`No category mappings found for focus area: ${focusArea}`);
    }
    
    // Format the response to use the evaluation_categories data with the mapping weight
    return data.map(item => ({
      key: item.category_key,
      name: item.evaluation_categories.name,
      description: item.evaluation_categories.description,
      weight: item.weight // Use the mapping weight, not the default category weight
    }));
  }

  /**
   * Get category weights for a specific focus area
   * @param {string} focusArea - Focus area to get weights for
   * @returns {Promise<Object>} Mapping of category keys to weights
   */
  /**
   * Method getCategoryWeightsForFocusArea
   */
  async getCategoryWeightsForFocusArea(focusArea) {
    if (!focusArea) {
      throw new Error('Focus area is required');
    }
    
    const { data, error } = await this.supabase
      .from('focus_area_category_mappings')
      .select('category_key, weight')
      .eq('focus_area', focusArea);
    
    if (error) {
      this.logger.error('Error fetching category weights', { error, focusArea });
      throw new Error(`Failed to fetch category weights for focus area ${focusArea}: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error(`No category weights found for focus area: ${focusArea}`);
    }
    
    // Convert array to object with category keys as properties and weights as values
    const weights = {};
    data.forEach(item => {
      weights[item.category_key] = item.weight;
    });
    
    return weights;
  }

  /**
   * Get description for a specific category
   * @param {string} categoryKey - Category key
   * @returns {Promise<string>} Category description
   */
  /**
   * Method getCategoryDescription
   */
  async getCategoryDescription(categoryKey) {
    if (!categoryKey) {
      throw new Error('Category key is required');
    }
    
    const { data, error } = await this.supabase
      .from('evaluation_categories')
      .select('description')
      .eq('key', categoryKey)
      .single();
    
    if (error) {
      this.logger.error('Error fetching category description', { error, categoryKey });
      throw new Error(`Failed to fetch description for category ${categoryKey}: ${error.message}`);
    }
    
    if (!data || !data.description) {
      throw new Error(`No description found for category: ${categoryKey}`);
    }
    
    return data.description;
  }

  /**
   * Get all category descriptions
   * @returns {Promise<Object>} Mapping of category keys to descriptions
   */
  /**
   * Method getCategoryDescriptions
   */
  async getCategoryDescriptions() {
    const { data, error } = await this.supabase
      .from('evaluation_categories')
      .select('key, description');
    
    if (error) {
      this.logger.error('Error fetching category descriptions', { error });
      throw new Error(`Failed to fetch category descriptions: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No category descriptions found in database');
    }
    
    // Convert array to object with category keys as properties and descriptions as values
    const descriptions = {};
    data.forEach(item => {
      descriptions[item.key] = item.description;
    });
    
    return descriptions;
  }

  /**
   * Map focus areas to relevant evaluation categories
   * @param {Array<string>} focusAreas - Array of focus areas
   * @returns {Promise<Array<string>>} Array of relevant category keys
   */
  /**
   * Method mapFocusAreasToCategories
   */
  async mapFocusAreasToCategories(focusAreas) {
    if (!focusAreas || !Array.isArray(focusAreas) || focusAreas.length === 0) {
      throw new Error('Valid focus areas array is required');
    }
    
    // Build query to find any mapping for any of the focus areas
    // Using the 'in' filter to match any focus area in the array
    const { data, error } = await this.supabase
      .from('focus_area_category_mappings')
      .select('category_key')
      .in('focus_area', focusAreas);
    
    if (error) {
      this.logger.error('Error mapping focus areas to categories', { error, focusAreas });
      throw new Error(`Failed to map focus areas to categories: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error(`No category mappings found for focus areas: ${focusAreas.join(', ')}`);
    }
    
    // Extract category keys and remove duplicates
    const categoryKeys = [...new Set(data.map(item => item.category_key))];
    
    return categoryKeys;
  }
}

module.exports = EvaluationCategoryRepository; 