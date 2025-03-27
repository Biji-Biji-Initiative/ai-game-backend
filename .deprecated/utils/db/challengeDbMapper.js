/**
 * Challenge Database Mapper
 * 
 * Handles conversion between snake_case database fields and camelCase domain model fields
 * for the Challenge domain model
 * 
 * @module challengeDbMapper
 * @requires Challenge
 */

const Challenge = require('../../core/challenge/models/Challenge');

/**
 * Convert database challenge record to Challenge domain model
 * @param {Object} dbRecord - Database record with snake_case fields
 * @returns {Challenge} Challenge domain model instance
 */
function toModel(dbRecord) {
  if (!dbRecord) return null;
  
  return new Challenge({
    id: dbRecord.id,
    userEmail: dbRecord.user_email,
    title: dbRecord.title,
    challengeTypeCode: dbRecord.challenge_type_code,
    challengeTypeId: dbRecord.challenge_type_id,
    formatTypeCode: dbRecord.format_type_code,
    formatTypeId: dbRecord.format_type_id,
    focusArea: dbRecord.focus_area,
    difficulty: dbRecord.difficulty,
    content: dbRecord.content,
    status: dbRecord.status,
    difficultySettings: dbRecord.difficulty_settings,
    questions: dbRecord.questions || [],
    evaluation: dbRecord.evaluation,
    responses: dbRecord.responses,
    evaluationCriteria: dbRecord.evaluation_criteria,
    typeMetadata: dbRecord.type_metadata || {},
    formatMetadata: dbRecord.format_metadata || {},
    threadId: dbRecord.thread_id,
    evaluationThreadId: dbRecord.evaluation_thread_id,
    generationThreadId: dbRecord.generation_thread_id,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    submittedAt: dbRecord.submitted_at,
    completedAt: dbRecord.completed_at,
    aiGenerated: dbRecord.ai_generated,
    generationMetadata: dbRecord.generation_metadata
  });
}

/**
 * Convert Challenge domain model to database record format
 * @param {Challenge} model - Challenge domain model instance
 * @returns {Object} Database record with snake_case fields
 */
function toDbRecord(model) {
  if (!model) return null;
  
  // Handle both object and Challenge instance
  const challengeData = model instanceof Challenge ? model.toObject() : model;
  
  return {
    id: challengeData.id,
    user_email: challengeData.userEmail,
    title: challengeData.title,
    challenge_type_code: challengeData.challengeTypeCode,
    challenge_type_id: challengeData.challengeTypeId,
    format_type_code: challengeData.formatTypeCode,
    format_type_id: challengeData.formatTypeId,
    focus_area: challengeData.focusArea,
    difficulty: challengeData.difficulty,
    content: challengeData.content,
    status: challengeData.status,
    difficulty_settings: challengeData.difficultySettings,
    questions: challengeData.questions,
    evaluation: challengeData.evaluation,
    responses: challengeData.responses,
    evaluation_criteria: challengeData.evaluationCriteria,
    type_metadata: challengeData.typeMetadata,
    format_metadata: challengeData.formatMetadata,
    thread_id: challengeData.threadId,
    evaluation_thread_id: challengeData.evaluationThreadId,
    generation_thread_id: challengeData.generationThreadId,
    created_at: challengeData.createdAt,
    updated_at: challengeData.updatedAt,
    submitted_at: challengeData.submittedAt,
    completed_at: challengeData.completedAt,
    ai_generated: challengeData.aiGenerated,
    generation_metadata: challengeData.generationMetadata
  };
}

/**
 * Convert updates object from camelCase to snake_case
 * @param {Object} updates - Updates object with camelCase fields
 * @returns {Object} Updates object with snake_case fields
 */
function convertUpdatesToDbFormat(updates) {
  const dbUpdates = {};
  
  // Map each field from camelCase to snake_case
  if (updates.userEmail) dbUpdates.user_email = updates.userEmail;
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.challengeTypeCode) dbUpdates.challenge_type_code = updates.challengeTypeCode;
  if (updates.challengeTypeId) dbUpdates.challenge_type_id = updates.challengeTypeId;
  if (updates.formatTypeCode) dbUpdates.format_type_code = updates.formatTypeCode;
  if (updates.formatTypeId) dbUpdates.format_type_id = updates.formatTypeId;
  if (updates.focusArea) dbUpdates.focus_area = updates.focusArea;
  if (updates.difficulty) dbUpdates.difficulty = updates.difficulty;
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.difficultySettings) dbUpdates.difficulty_settings = updates.difficultySettings;
  if (updates.questions) dbUpdates.questions = updates.questions;
  if (updates.evaluation) dbUpdates.evaluation = updates.evaluation;
  if (updates.responses) dbUpdates.responses = updates.responses;
  if (updates.evaluationCriteria) dbUpdates.evaluation_criteria = updates.evaluationCriteria;
  if (updates.typeMetadata) dbUpdates.type_metadata = updates.typeMetadata;
  if (updates.formatMetadata) dbUpdates.format_metadata = updates.formatMetadata;
  if (updates.threadId) dbUpdates.thread_id = updates.threadId;
  if (updates.evaluationThreadId) dbUpdates.evaluation_thread_id = updates.evaluationThreadId;
  if (updates.generationThreadId) dbUpdates.generation_thread_id = updates.generationThreadId;
  if (updates.submittedAt) dbUpdates.submitted_at = updates.submittedAt;
  if (updates.completedAt) dbUpdates.completed_at = updates.completedAt;
  if (updates.aiGenerated !== undefined) dbUpdates.ai_generated = updates.aiGenerated;
  if (updates.generationMetadata) dbUpdates.generation_metadata = updates.generationMetadata;
  
  // Add updated timestamp
  dbUpdates.updated_at = new Date().toISOString();
  
  return dbUpdates;
}

/**
 * Convert a list of database records to Challenge domain models
 * @param {Array<Object>} dbRecords - List of database records
 * @returns {Array<Challenge>} List of Challenge domain model instances
 */
function toModelList(dbRecords) {
  if (!dbRecords || !Array.isArray(dbRecords)) return [];
  return dbRecords.map(record => toModel(record));
}

module.exports = {
  toModel,
  toDbRecord,
  toModelList,
  convertUpdatesToDbFormat
}; 