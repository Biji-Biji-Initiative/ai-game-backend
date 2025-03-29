'use strict';

/**
 * Evaluation Data Transfer Object (DTO)
 *
 * Represents the API representation of an Evaluation.
 * Decouples the domain model from the API contract.
 */

/**
 * Evaluation DTO
 * Used for sending evaluation data to clients
 */
class EvaluationDTO {
  /**
   * Create a new EvaluationDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.challengeId = data.challengeId || null;
    this.responseId = data.responseId || null;
    this.userEmail = data.userEmail || '';
    this.score = data.score || 0;
    this.feedback = data.feedback || '';
    this.strengths = data.strengths || [];
    this.areas_for_improvement = data.areas_for_improvement || [];
    this.criteria = data.criteria || {};
    this.createdAt = data.createdAt || null;

    // Add only API-relevant fields, omitting internal implementation details
    this.scorePercentage = data.score ? Math.round((data.score / 100) * 100) : 0;
    this.hasFeedback = !!data.feedback && data.feedback.length > 0;
  }

  /**
   * Convert to plain object format suitable for JSON serialization
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      id: this.id,
      challengeId: this.challengeId,
      responseId: this.responseId,
      userEmail: this.userEmail,
      score: this.score,
      feedback: this.feedback,
      strengths: this.strengths,
      areas_for_improvement: this.areas_for_improvement,
      criteria: this.criteria,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      scorePercentage: this.scorePercentage,
      hasFeedback: this.hasFeedback,
    };
  }
}

/**
 * Evaluation Criteria DTO
 * Used for sending evaluation criteria data to clients
 */
class EvaluationCriteriaDTO {
  /**
   * Create a new EvaluationCriteriaDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.weight = data.weight || 1;
    this.maxScore = data.maxScore || 100;
  }

  /**
   * Convert to plain object format suitable for JSON serialization
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      weight: this.weight,
      maxScore: this.maxScore,
    };
  }
}

/**
 * Evaluation DTO Mapper
 * Converts between domain entities and DTOs
 */
class EvaluationDTOMapper {
  /**
   * Convert a domain Evaluation to an EvaluationDTO
   * @param {Evaluation} evaluation - Domain Evaluation entity
   * @returns {EvaluationDTO} Evaluation DTO for API consumption
   */
  static toDTO(evaluation) {
    if (!evaluation) {
      return null;
    }

    // Extract only the properties needed for the API
    const dto = new EvaluationDTO({
      id: evaluation.id,
      challengeId: evaluation.challengeId,
      responseId: evaluation.responseId,
      userEmail: evaluation.userEmail,
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
      areas_for_improvement: Array.isArray(evaluation.areasForImprovement)
        ? evaluation.areasForImprovement
        : [],
      criteria: evaluation.criteria || {},
      createdAt: evaluation.createdAt,
    });

    return dto;
  }

  /**
   * Convert an array of domain Evaluations to EvaluationDTOs
   * @param {Array<Evaluation>} evaluations - Array of domain Evaluation entities
   * @returns {Array<EvaluationDTO>} Array of Evaluation DTOs
   */
  static toDTOCollection(evaluations) {
    if (!Array.isArray(evaluations)) {
      return [];
    }

    return evaluations.map(evaluation => EvaluationDTOMapper.toDTO(evaluation));
  }

  /**
   * Convert domain EvaluationCriteria to an EvaluationCriteriaDTO
   * @param {EvaluationCriteria} criteria - Domain EvaluationCriteria entity
   * @returns {EvaluationCriteriaDTO} EvaluationCriteria DTO for API consumption
   */
  static criteriaToDTO(criteria) {
    if (!criteria) {
      return null;
    }

    const dto = new EvaluationCriteriaDTO({
      id: criteria.id,
      name: criteria.name,
      description: criteria.description,
      weight: criteria.weight,
      maxScore: criteria.maxScore,
    });

    return dto;
  }

  /**
   * Convert an array of domain EvaluationCriteria to EvaluationCriteriaDTOs
   * @param {Array<EvaluationCriteria>} criteriaArray - Array of domain EvaluationCriteria entities
   * @returns {Array<EvaluationCriteriaDTO>} Array of EvaluationCriteria DTOs
   */
  static criteriaToDTOCollection(criteriaArray) {
    if (!Array.isArray(criteriaArray)) {
      return [];
    }

    return criteriaArray.map(criteria => EvaluationDTOMapper.criteriaToDTO(criteria));
  }

  /**
   * Convert a request body to parameters for domain operations
   * @param {Object} requestBody - API request body
   * @returns {Object} Parameters for domain operations
   */
  static fromRequest(requestBody) {
    // Extract and validate fields from request
    const {
      challengeId,
      responseId,
      userEmail,
      score,
      feedback,
      strengths,
      areasForImprovement,
      criteria,
    } = requestBody;

    // Return an object with validated and sanitized properties
    return {
      challengeId: challengeId ? challengeId.trim() : null,
      responseId: responseId ? responseId.trim() : null,
      userEmail: userEmail ? userEmail.trim().toLowerCase() : null,
      score:
        typeof score === 'number' ? score : typeof score === 'string' ? parseInt(score, 10) : 0,
      feedback: feedback ? feedback.trim() : '',
      strengths: Array.isArray(strengths)
        ? strengths.map(s => s.trim())
        : strengths
          ? [strengths.trim()]
          : [],
      areasForImprovement: Array.isArray(areasForImprovement)
        ? areasForImprovement.map(a => a.trim())
        : areasForImprovement
          ? [areasForImprovement.trim()]
          : [],
      criteria: criteria || {},
    };
  }
}

module.exports = {
  EvaluationDTO,
  EvaluationCriteriaDTO,
  EvaluationDTOMapper,
};
