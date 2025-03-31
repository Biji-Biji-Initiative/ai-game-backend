/**
 * Repository utilities
 * Provides helper functions for working with repositories
 */

const { UserRepository } = require('./user/repositories/UserRepository');
const { ChallengeRepository } = require('./challenge/repositories/challengeRepository');
const { ProgressRepository } = require('./progress/repositories/ProgressRepository');
const { EvaluationRepository } = require('./evaluation/repositories/evaluationRepository');
const { FocusAreaRepository } = require('./focusArea/repositories/focusAreaRepository');
const { PersonalityRepository } = require('./personality/repositories/PersonalityRepository');

// Repository instances
let repositories = null;

/**
 * Initialize repository instances
 * @returns {Object} Repository instances
 */
function initRepositories() {
  if (repositories) {
    return repositories;
  }
  
  repositories = {
    user: new UserRepository(),
    challenge: new ChallengeRepository(),
    progress: new ProgressRepository(),
    evaluation: new EvaluationRepository(),
    focusArea: new FocusAreaRepository(),
    personality: new PersonalityRepository()
  };
  
  return repositories;
}

/**
 * Get repository by entity type
 * @param {string} entityType - The entity type
 * @returns {Object|null} Repository instance or null if not found
 */
function getRepositoryByEntityType(entityType) {
  // Ensure repositories are initialized
  const repos = initRepositories();
  
  // Map entity type to repository name
  const repoName = entityType.toLowerCase();
  
  return repos[repoName] || null;
}

module.exports = {
  initRepositories,
  getRepositoryByEntityType
}; 