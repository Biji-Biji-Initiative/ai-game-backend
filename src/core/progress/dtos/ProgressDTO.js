'use strict';

/**
 * Progress Data Transfer Object (DTO)
 *
 * Represents the API representation of Progress data.
 * Decouples the domain model from the API contract.
 */

/**
 * Progress DTO
 * Used for sending progress data to clients
 */
class ProgressDTO {
  /**
   * Create a new ProgressDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    this.userEmail = data.userEmail || '';
    this.focusArea = data.focusArea || '';
    this.totalChallenges = data.totalChallenges || 0;
    this.completedChallenges = data.completedChallenges || 0;
    this.averageScore = data.averageScore || 0;
    this.level = data.level || 1;
    this.experience = data.experience || 0;
    this.streakDays = data.streakDays || 0;
    this.lastActive = data.lastActive || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;

    // Add only API-relevant fields, omitting internal implementation details
    this.completionRate =
      data.totalChallenges > 0
        ? Math.round((data.completedChallenges / data.totalChallenges) * 100)
        : 0;
    this.nextLevelProgress = data.nextLevelProgress || 0;
    this.isActive = data.lastActive
      ? new Date().getTime() - new Date(data.lastActive).getTime() < 7 * 24 * 60 * 60 * 1000
      : false;
  }

  /**
   * Convert to plain object format suitable for JSON serialization
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      userEmail: this.userEmail,
      focusArea: this.focusArea,
      totalChallenges: this.totalChallenges,
      completedChallenges: this.completedChallenges,
      averageScore: this.averageScore,
      level: this.level,
      experience: this.experience,
      streakDays: this.streakDays,
      lastActive: this.lastActive instanceof Date ? this.lastActive.toISOString() : this.lastActive,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: this.updatedAt instanceof Date ? this.updatedAt.toISOString() : this.updatedAt,
      completionRate: this.completionRate,
      nextLevelProgress: this.nextLevelProgress,
      isActive: this.isActive,
    };
  }
}

/**
 * Progress Summary DTO
 * Used for sending aggregated progress data to clients
 */
class ProgressSummaryDTO {
  /**
   * Create a new ProgressSummaryDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.userId = data.userId || null;
    this.userEmail = data.userEmail || '';
    this.totalChallengesCompleted = data.totalChallengesCompleted || 0;
    this.focusAreas = data.focusAreas || [];
    this.topFocusArea = data.topFocusArea || null;
    this.averageScoreOverall = data.averageScoreOverall || 0;
    this.highestLevel = data.highestLevel || 1;
    this.longestStreak = data.longestStreak || 0;
    this.currentStreak = data.currentStreak || 0;
    this.lastActive = data.lastActive || null;
  }

  /**
   * Convert to plain object format suitable for JSON serialization
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      userId: this.userId,
      userEmail: this.userEmail,
      totalChallengesCompleted: this.totalChallengesCompleted,
      focusAreas: this.focusAreas,
      topFocusArea: this.topFocusArea,
      averageScoreOverall: this.averageScoreOverall,
      highestLevel: this.highestLevel,
      longestStreak: this.longestStreak,
      currentStreak: this.currentStreak,
      lastActive: this.lastActive instanceof Date ? this.lastActive.toISOString() : this.lastActive,
    };
  }
}

/**
 * Progress DTO Mapper
 * Converts between domain entities and DTOs
 */
class ProgressDTOMapper {
  /**
   * Convert a domain Progress to a ProgressDTO
   * @param {Progress} progress - Domain Progress entity
   * @returns {ProgressDTO} Progress DTO for API consumption
   */
  static toDTO(progress) {
    if (!progress) {
      return null;
    }

    // Extract only the properties needed for the API
    const dto = new ProgressDTO({
      id: progress.id,
      userId: progress.userId,
      userEmail: progress.userEmail,
      focusArea: progress.focusArea,
      totalChallenges: progress.totalChallenges,
      completedChallenges: progress.completedChallenges,
      averageScore: progress.averageScore,
      level: progress.level,
      experience: progress.experience,
      streakDays: progress.streakDays,
      lastActive: progress.lastActive,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
      nextLevelProgress:
        progress.nextLevelProgress ||
        ProgressDTOMapper._calculateNextLevelProgress(progress.experience, progress.level),
    });

    return dto;
  }

  /**
   * Convert an array of domain Progress objects to ProgressDTOs
   * @param {Array<Progress>} progressItems - Array of domain Progress entities
   * @returns {Array<ProgressDTO>} Array of Progress DTOs
   */
  static toDTOCollection(progressItems) {
    if (!Array.isArray(progressItems)) {
      return [];
    }

    return progressItems.map(progress => ProgressDTOMapper.toDTO(progress));
  }

  /**
   * Convert domain progress data to a ProgressSummaryDTO
   * @param {Object} data - Summary data from domain
   * @returns {ProgressSummaryDTO} ProgressSummary DTO for API consumption
   */
  static toSummaryDTO(data) {
    if (!data) {
      return null;
    }

    const dto = new ProgressSummaryDTO({
      userId: data.userId,
      userEmail: data.userEmail,
      totalChallengesCompleted: data.totalChallengesCompleted,
      focusAreas: data.focusAreas,
      topFocusArea: data.topFocusArea,
      averageScoreOverall: data.averageScoreOverall,
      highestLevel: data.highestLevel,
      longestStreak: data.longestStreak,
      currentStreak: data.currentStreak,
      lastActive: data.lastActive,
    });

    return dto;
  }

  /**
   * Convert a request body to parameters for domain operations
   * @param {Object} requestBody - API request body
   * @returns {Object} Parameters for domain operations
   */
  static fromRequest(requestBody) {
    // Extract and validate fields from request
    const { userId, userEmail, focusArea, challengeId, challengeScore } = requestBody;

    // Return an object with validated and sanitized properties
    return {
      userId: userId ? userId.trim() : null,
      userEmail: userEmail ? userEmail.trim().toLowerCase() : null,
      focusArea: focusArea ? focusArea.trim() : null,
      challengeId: challengeId ? challengeId.trim() : null,
      challengeScore:
        typeof challengeScore === 'number'
          ? challengeScore
          : typeof challengeScore === 'string'
            ? parseInt(challengeScore, 10)
            : 0,
    };
  }

  /**
   * Calculate progress towards next level based on experience and current level
   * @param {number} experience - Current experience points
   * @param {number} level - Current level
   * @returns {number} Progress percentage towards next level (0-100)
   * @private
   */
  static _calculateNextLevelProgress(experience, level) {
    // Example formula: each level requires level * 1000 XP
    const currentLevelXP = (level - 1) * 1000;
    const nextLevelXP = level * 1000;
    const xpForNextLevel = nextLevelXP - currentLevelXP;
    const currentXPInLevel = experience - currentLevelXP;

    return Math.min(Math.round((currentXPInLevel / xpForNextLevel) * 100), 100);
  }
}

module.exports = {
  ProgressDTO,
  ProgressSummaryDTO,
  ProgressDTOMapper,
};
