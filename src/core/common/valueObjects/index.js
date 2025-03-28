/**
 * Value Objects Index
 * 
 * Exports all domain Value Objects for easy importing throughout the application.
 * These value objects encapsulate validation and behavior for key domain concepts.
 */

const Email = require('./Email');
const UserId = require('./UserId');
const ChallengeId = require('./ChallengeId');
const DifficultyLevel = require('./DifficultyLevel');
const FocusArea = require('./FocusArea');
const TraitScore = require('./TraitScore');

module.exports = {
  Email,
  UserId,
  ChallengeId,
  DifficultyLevel,
  FocusArea,
  TraitScore
}; 