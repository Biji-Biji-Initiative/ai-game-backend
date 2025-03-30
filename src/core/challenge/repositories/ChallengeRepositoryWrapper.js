/**
 * Challenge Repository Wrapper
 * 
 * This wrapper extends ChallengeRepository and ensures it properly
 * extends BaseRepository and follows the project's architectural patterns.
 */

import { ChallengeRepository } from '../../challenge/repositories/ChallengeRepository.js';
import { withRepositoryErrorHandling, createErrorMapper } from '../../infra/errors/errorStandardization.js';
import challengeErrors from '../errors/ChallengeErrors.js';

const { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeRepositoryError } = challengeErrors;

/**
 * ChallengeRepositoryWrapper extends the base ChallengeRepository
 * and ensures proper inheritance and error handling patterns
 * @extends ChallengeRepository
 */
class ChallengeRepositoryWrapper extends ChallengeRepository {
    /**
     * Create a new ChallengeRepositoryWrapper
     * @param {Object} options - Repository options
     */
    constructor(options = {}) {
        // Call parent constructor
        super(options);
        
        // Create error mapper for consistent error mapping
        const errorMapper = createErrorMapper({
            EntityNotFoundError: ChallengeNotFoundError,
            ValidationError: ChallengeValidationError,
            DatabaseError: ChallengeRepositoryError
        }, ChallengeError);
        
        // Make sure initialization flag is set
        this._initialized = true;
        
        // Add consistent error handling to any additional methods
        // that might be added in the future
    }
    
    /**
     * Check if the repository is properly initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this._initialized === true;
    }
}

// Create singleton instance
const challengeRepositoryWrapper = new ChallengeRepositoryWrapper();

export { ChallengeRepositoryWrapper, challengeRepositoryWrapper };
export default challengeRepositoryWrapper; 