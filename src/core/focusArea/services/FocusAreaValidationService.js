import { FocusArea } from "@/core/common/valueObjects/index.js";
'use strict';
/**
 * Service for validating focus areas
 */
class FocusAreaValidationService {
    /**
     * Create a new FocusAreaValidationService
     * @param {Object} focusAreaConfigRepository - Repository for focus area configuration
     * @param {Object} logger - Logger instance
     */
    constructor(focusAreaConfigRepository, logger) {
        this.repository = focusAreaConfigRepository;
        this.logger = logger;
        this.cachedFocusAreas = null;
        this.lastCacheTime = null;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    }
    /**
     * Validate if a focus area exists in the system
     * @param {string} focusAreaCode - Focus area code to validate
     * @returns {Promise<boolean>} True if the focus area exists
     */
    async exists(focusAreaCode) {
        try {
            // First validate the format using the value object
            if (!focusAreaCode || !FocusArea.isValidFormat(focusAreaCode)) {
                return false;
            }
            // Check existence using the repository
            const focusArea = await this.repository.findByCode(focusAreaCode);
            return !!focusArea;
        }
        catch (error) {
            this.logger?.error('Error validating focus area existence', {
                focusAreaCode,
                error: error.message
            });
            return false;
        }
    }
    /**
     * Get all available focus areas
     * @param {boolean} useCache - Whether to use cached results
     * @returns {Promise<Array<Object>>} List of available focus areas
     */
    async getAvailableFocusAreas(useCache = true) {
        // Check cache first if enabled
        if (useCache && this.cachedFocusAreas && this.lastCacheTime) {
            const now = Date.now();
            if (now - this.lastCacheTime < this.cacheTTL) {
                return this.cachedFocusAreas;
            }
        }
        try {
            // Fetch from repository
            const focusAreas = await this.repository.findAll();
            // Update cache
            this.cachedFocusAreas = focusAreas;
            this.lastCacheTime = Date.now();
            return focusAreas;
        }
        catch (error) {
            this.logger?.error('Error fetching available focus areas', {
                error: error.message
            });
            // Return cache if available, even if expired
            if (this.cachedFocusAreas) {
                return this.cachedFocusAreas;
            }
            return [];
        }
    }
    /**
     * Validate if a focus area is valid (correct format and exists in system)
     * @param {string} focusAreaCode - Focus area code to validate
     * @returns {Promise<Object>} Validation result with isValid flag and errors
     */
    async validate(focusAreaCode) {
        const result = {
            isValid: false,
            errors: []
        };
        // Check format first
        if (!focusAreaCode) {
            result.errors.push('Focus area code is required');
            return result;
        }
        if (!FocusArea.isValidFormat(focusAreaCode)) {
            result.errors.push(`Invalid focus area format: ${focusAreaCode}`);
            return result;
        }
        // Check existence
        const exists = await this.exists(focusAreaCode);
        if (!exists) {
            result.errors.push(`Focus area does not exist: ${focusAreaCode}`);
            return result;
        }
        // Valid if we got here
        result.isValid = true;
        return result;
    }
    /**
     * Clear the focus area cache
     */
    clearCache() {
        this.cachedFocusAreas = null;
        this.lastCacheTime = null;
    }
}
export default FocusAreaValidationService;
