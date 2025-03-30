/**
 * Challenge Repository Wrapper
 * 
 * This wrapper extends ChallengeRepository and ensures it properly
 * extends BaseRepository and follows the project's architectural patterns.
 */

import ChallengeRepository from '../../challenge/repositories/challengeRepository.js';
import { createErrorMapper } from '../../infra/errors/errorStandardization.js';
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
        
        // Create error mapper for consistent error mapping (used by parent class)
        createErrorMapper({
            EntityNotFoundError: ChallengeNotFoundError,
            ValidationError: ChallengeValidationError,
            DatabaseError: ChallengeRepositoryError
        }, ChallengeError);
        
        // Make sure initialization flag is set
        this._initialized = true;
    }
    
    /**
     * Check if the repository is properly initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this._initialized === true;
    }
}

// Use lazy initialization for the singleton
let _instance = null;
function getWrapperInstance() {
    if (!_instance) {
        _instance = new ChallengeRepositoryWrapper();
    }
    return _instance;
}

// Export the singleton getter and the class
export const challengeRepositoryWrapper = getWrapperInstance();
export { ChallengeRepositoryWrapper };
export default challengeRepositoryWrapper; 