import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";

/**
 * Validates that required dependencies are provided for a service
 * Used to ensure services don't start with mock repositories in production
 * 
 * @param {Object} dependencies - Object containing service dependencies
 * @param {Object} options - Validation options
 * @param {string} options.serviceName - Name of the service (for error messages)
 * @param {string[]} options.required - Array of dependency names that are required
 * @param {boolean} options.productionOnly - If true, validation only runs in production
 * @returns {void} - Throws ConfigurationError if validation fails
 */
export function validateDependencies(dependencies = {}, options = {}) {
    const { serviceName = 'Service', required = [], productionOnly = true } = options;
    
    // Skip validation in non-production environments if productionOnly is true
    if (productionOnly && process.env.NODE_ENV !== 'production') {
        return;
    }
    
    // Validate each required dependency
    for (const dependencyName of required) {
        if (!dependencies[dependencyName]) {
            throw new ConfigurationError(
                `${dependencyName} is required for ${serviceName}` + 
                (productionOnly ? ' in production mode' : ''),
                {
                    serviceName,
                    dependencyName
                }
            );
        }
    }
} 