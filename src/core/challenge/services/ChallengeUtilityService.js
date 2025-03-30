'use strict';
/**
 * Challenge Utility Service
 *
 * Domain service that provides utility functions for challenge operations.
 * Contains only generic, stateless helper functions for the challenge domain.
 */
/**
 * Service for generic challenge utility functions
 */
class ChallengeUtilityService {
    /**
     * Create a new ChallengeUtilityService instance
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies = {}) {
        const { logger } = dependencies;
        if (!logger) {
            throw new Error('Logger is required for ChallengeUtilityService');
        }
        this.logger = logger;
    }
}
export default ChallengeUtilityService;
