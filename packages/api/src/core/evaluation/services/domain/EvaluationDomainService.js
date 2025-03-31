"../../../evaluation/services/errors/EvaluationErrors.js;
'use strict';
/**
 * Evaluation Domain Service
 *
 * Provides domain services for Evaluation entities, including
 * operations that require external dependencies or asynchronous calls.
 *
 * @module EvaluationDomainService
 * @requires evaluationCategoryRepository
 */
const { applyRepositoryErrorHandling, applyServiceErrorHandling, applyControllerErrorHandling, createErrorMapper } = centralizedErrorUtils;
// Import domain-specific error classes
const { EvaluationError, EvaluationNotFoundError, EvaluationValidationError, EvaluationProcessingError, } = evaluationErrors;
// Create an error mapper for services
const evaluationServiceErrorMapper = createErrorMapper({
    EvaluationNotFoundError: EvaluationNotFoundError,
    EvaluationValidationError: EvaluationValidationError,
    EvaluationProcessingError: EvaluationProcessingError,
    Error: EvaluationError,
}, EvaluationError);
// const evaluationCategoryRepository = '../../../repositories/evaluationCategoryRepository981;
/**
 * Domain service for Evaluation entities
 */
class EvaluationDomainService {
    /**
     * Create a new EvaluationDomainService
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.evaluationCategoryRepository - Repository for evaluation categories
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ evaluationCategoryRepository, logger }) {
        this.evaluationCategoryRepository = evaluationCategoryRepository;
        this.logger = logger;
        applyServiceErrorHandling(this, evaluationServiceErrorMappings);
    }
    /**
     * Map focus areas to evaluation categories
     * @param {Array} focusAreas - User focus areas
     * @returns {Promise<Array>} Relevant evaluation categories
     * @throws {Error} If mapping fails or no mappings found
     */
    /**
     * Method mapFocusAreasToCategories
     */
    async mapFocusAreasToCategories(focusAreas) {
        try {
            if (!focusAreas || !Array.isArray(focusAreas) || focusAreas.length === 0) {
                throw new Error(''Valid focus areas array is required for category mapping');
            }
            return await this.evaluationCategoryRepository.mapFocusAreasToCategories(focusAreas);
        }
        catch (error) {
            this.logger.error('Error mapping focus areas to categories', {
                error: error.message,
                focusAreas
            });
            throw error;
        }
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
        try {
            return await this.evaluationCategoryRepository.getCategoryWeightsForFocusArea(focusArea);
        }
        catch (error) {
            this.logger.error('Error getting category weights for focus area', {
                error: error.message,
                focusArea
            });
            throw error;
        }
    }
    /**
     * Get descriptions for all categories
     * @returns {Promise<Object>} Mapping of category keys to descriptions
     */
    /**
     * Method getCategoryDescriptions
     */
    async getCategoryDescriptions() {
        try {
            return await this.evaluationCategoryRepository.getCategoryDescriptions();
        }
        catch (error) {
            this.logger.error('Error getting category descriptions', {
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Pre-process user context for an evaluation
     * Enriches the user context with mapped categories and relevance data
     * @param {Object} evaluation - Evaluation object
     * @returns {Promise<Object>} Enriched user context
     */
    /**
     * Method processUserContext
     */
    async processUserContext(evaluation) {
        try {
            if (!evaluation.userContext) {
                return {};
            }
            const enrichedContext = { ...evaluation.userContext };
            // Map focus areas to relevant categories if available
            if (enrichedContext.focusAreas && Array.isArray(enrichedContext.focusAreas) && enrichedContext.focusAreas.length > 0) {
                enrichedContext.relevantCategories = await this.mapFocusAreasToCategories(enrichedContext.focusAreas);
            }
            return enrichedContext;
        }
        catch (error) {
            this.logger.error('Error processing user context for evaluation', {
                error: error.message,
                evaluationId: evaluation.id
            });
            // Return the original context if processing fails
            return evaluation.userContext || {};
        }
    }
}
export default EvaluationDomainService;
"