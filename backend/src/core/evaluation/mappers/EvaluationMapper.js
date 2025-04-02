'use strict';

import Evaluation from "#app/core/evaluation/models/Evaluation.js";

/**
 * Mapper class for converting between Evaluation domain objects and database representations
 */
class EvaluationMapper {
  /**
   * Convert database record to domain object
   * @param {Object} dbRecord - Database record (snake_case fields)
   * @param {Object} options - Additional options
   * @param {Object} options.EventTypes - Event types for domain events
   * @returns {Evaluation} Domain object
   */
  toDomain(dbRecord, options = {}) {
    if (!dbRecord) return null;
    
    // Parse JSON strings if present
    const userContext = typeof dbRecord.user_context === 'string' 
      ? JSON.parse(dbRecord.user_context) 
      : dbRecord.user_context;
      
    const feedback = typeof dbRecord.feedback === 'string'
      ? JSON.parse(dbRecord.feedback)
      : dbRecord.feedback;
    
    const metrics = typeof dbRecord.metrics === 'string'
      ? JSON.parse(dbRecord.metrics)
      : dbRecord.metrics;
    
    const growthData = typeof dbRecord.growth_data === 'string'
      ? JSON.parse(dbRecord.growth_data)
      : dbRecord.growth_data;
    
    // Convert snake_case database fields to camelCase for domain object
    return new Evaluation({
      id: dbRecord.id,
      userId: dbRecord.user_id,
      challengeId: dbRecord.challenge_id,
      score: dbRecord.score,
      feedback: feedback,
      userContext: userContext,
      metrics: metrics,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      growthData: growthData,
      status: dbRecord.status
    }, options);
  }

  /**
   * Convert domain object to database record
   * @param {Evaluation} domainObject - Domain object
   * @returns {Object} Database record (snake_case fields)
   */
  toPersistence(domainObject) {
    if (!domainObject) return null;

    // Stringify complex objects for database storage
    const userContext = typeof domainObject.userContext === 'object' && domainObject.userContext !== null
      ? JSON.stringify(domainObject.userContext)
      : domainObject.userContext;

    const feedback = typeof domainObject.feedback === 'object' && domainObject.feedback !== null 
      ? JSON.stringify(domainObject.feedback)
      : domainObject.feedback;
      
    const metrics = typeof domainObject.metrics === 'object' && domainObject.metrics !== null
      ? JSON.stringify(domainObject.metrics)
      : domainObject.metrics;
      
    const growthData = typeof domainObject.growthData === 'object' && domainObject.growthData !== null
      ? JSON.stringify(domainObject.growthData)
      : domainObject.growthData;
    
    // Convert camelCase domain fields to snake_case for database
    return {
      id: domainObject.id,
      user_id: domainObject.userId,
      challenge_id: domainObject.challengeId,
      score: domainObject.score,
      feedback: feedback,
      user_context: userContext,
      metrics: metrics,
      created_at: domainObject.createdAt,
      updated_at: domainObject.updatedAt,
      growth_data: growthData,
      status: domainObject.status
    };
  }

  /**
   * Convert an array of database records to domain objects
   * @param {Array} dbRecords - Array of database records
   * @param {Object} options - Additional options
   * @returns {Array<Evaluation>} Array of domain objects
   */
  toDomainCollection(dbRecords, options = {}) {
    if (!dbRecords || !Array.isArray(dbRecords)) {
      return [];
    }
    
    return dbRecords.map(record => this.toDomain(record, options));
  }
}

// Create singleton instance
const evaluationMapper = new EvaluationMapper();

export default evaluationMapper; 