'use strict';
/**
 * Challenge Data Transfer Object (DTO)
 *
 * Represents the API representation of a Challenge.
 * Decouples the domain model from the API contract.
 */
/**
 * Challenge DTO
 * Used for sending challenge data to clients
 */
class ChallengeDTO {
    /**
     * Create a new ChallengeDTO
     * @param {Object} data - DTO data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.content = data.content || '';
        this.userEmail = data.userEmail || '';
        this.focusArea = data.focusArea || null;
        this.challengeType = data.challengeType || null;
        this.formatType = data.formatType || null;
        this.difficulty = data.difficulty || null;
        this.status = data.status || 'pending';
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        // Add only API-relevant fields, omitting internal implementation details
        this.isEvaluated = data.status === 'evaluated';
        this.responseCount = data.responseCount || 0;
    }
    /**
     * Convert to plain object format suitable for JSON serialization
     * @returns {Object} Plain object
     */
    toJSON() {
        return {
            id: this.id,
            content: this.content,
            userEmail: this.userEmail,
            focusArea: this.focusArea,
            challengeType: this.challengeType,
            formatType: this.formatType,
            difficulty: this.difficulty,
            status: this.status,
            createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
            updatedAt: this.updatedAt instanceof Date ? this.updatedAt.toISOString() : this.updatedAt,
            isEvaluated: this.isEvaluated,
            responseCount: this.responseCount,
        };
    }
}
/**
 * Challenge Response DTO
 * Used for sending challenge response data to clients
 */
class ChallengeResponseDTO {
    /**
     * Create a new ChallengeResponseDTO
     * @param {Object} data - DTO data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.challengeId = data.challengeId || null;
        this.userEmail = data.userEmail || '';
        this.response = data.response || '';
        this.evaluationId = data.evaluationId || null;
        this.submittedAt = data.submittedAt || null;
        this.score = data.score || null;
        this.feedback = data.feedback || null;
    }
    /**
     * Convert to plain object format suitable for JSON serialization
     * @returns {Object} Plain object
     */
    toJSON() {
        return {
            id: this.id,
            challengeId: this.challengeId,
            userEmail: this.userEmail,
            response: this.response,
            evaluationId: this.evaluationId,
            submittedAt: this.submittedAt instanceof Date ? this.submittedAt.toISOString() : this.submittedAt,
            score: this.score,
            feedback: this.feedback,
        };
    }
}
/**
 * Challenge DTO Mapper
 * Converts between domain entities and DTOs
 */
class ChallengeDTOMapper {
    /**
     * Convert a domain Challenge to a ChallengeDTO
     * @param {Challenge} challenge - Domain Challenge entity
     * @param {Object} options - Additional options
     * @returns {ChallengeDTO} Challenge DTO for API consumption
     */
    static toDTO(challenge, options = {}) {
        if (!challenge) {
            return null;
        }
        // Extract only the properties needed for the API
        const dto = new ChallengeDTO({
            id: challenge.id,
            content: challenge.content,
            userEmail: challenge.userEmail,
            focusArea: challenge.focusArea,
            challengeType: challenge.challengeType,
            formatType: challenge.formatType,
            difficulty: challenge.difficulty,
            status: challenge.status,
            createdAt: challenge.createdAt,
            updatedAt: challenge.updatedAt,
            responseCount: options.responseCount || 0,
        });
        return dto;
    }
    /**
     * Convert an array of domain Challenges to ChallengeDTOs
     * @param {Array<Challenge>} challenges - Array of domain Challenge entities
     * @param {Object} options - Additional options
     * @returns {Array<ChallengeDTO>} Array of Challenge DTOs
     */
    static toDTOCollection(challenges, options = {}) {
        if (!Array.isArray(challenges)) {
            return [];
        }
        return challenges.map(challenge => ChallengeDTOMapper.toDTO(challenge, options));
    }
    /**
     * Convert a domain ChallengeResponse to a ChallengeResponseDTO
     * @param {ChallengeResponse} response - Domain ChallengeResponse entity
     * @returns {ChallengeResponseDTO} ChallengeResponse DTO for API consumption
     */
    static responseToDTO(response) {
        if (!response) {
            return null;
        }
        const dto = new ChallengeResponseDTO({
            id: response.id,
            challengeId: response.challengeId,
            userEmail: response.userEmail,
            response: response.response,
            evaluationId: response.evaluationId,
            submittedAt: response.submittedAt,
            score: response.evaluation ? response.evaluation.score : null,
            feedback: response.evaluation ? response.evaluation.feedback : null,
        });
        return dto;
    }
    /**
     * Convert an array of domain ChallengeResponses to ChallengeResponseDTOs
     * @param {Array<ChallengeResponse>} responses - Array of domain ChallengeResponse entities
     * @returns {Array<ChallengeResponseDTO>} Array of ChallengeResponse DTOs
     */
    static responseToDTOCollection(responses) {
        if (!Array.isArray(responses)) {
            return [];
        }
        return responses.map(response => ChallengeDTOMapper.responseToDTO(response));
    }
    /**
     * Convert a request body to parameters for domain operations
     * @param {Object} requestBody - API request body
     * @returns {Object} Parameters for domain operations
     */
    static fromRequest(requestBody) {
        // Extract and validate fields from request
        const { userEmail, focusArea, challengeType, formatType, difficulty, response } = requestBody;
        // Return an object with validated and sanitized properties
        return {
            userEmail: userEmail ? userEmail.trim().toLowerCase() : null,
            focusArea: focusArea ? focusArea.trim() : null,
            challengeType: challengeType ? challengeType.trim() : null,
            formatType: formatType ? formatType.trim() : null,
            difficulty: difficulty ? difficulty.trim().toLowerCase() : null,
            response: response ? response.trim() : null,
        };
    }
}
export { ChallengeDTO };
export { ChallengeResponseDTO };
export { ChallengeDTOMapper };
export default {
    ChallengeDTO,
    ChallengeResponseDTO,
    ChallengeDTOMapper
};
