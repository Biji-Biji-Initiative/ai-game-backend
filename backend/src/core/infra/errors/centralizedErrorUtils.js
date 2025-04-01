/**
 * Centralized Error Utilities
 * 
 * This file re-exports all error handling utilities from errorStandardization.js
 * to provide a consistent import path across the application.
 */

import { 
  createErrorMapper, 
  createErrorCollector, 
  withRepositoryErrorHandling, 
  withServiceErrorHandling, 
  withControllerErrorHandling,
  handleServiceError,
  StandardErrorCodes,
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling
} from "#app/core/infra/errors/errorStandardization.js";

export {
  createErrorMapper,
  createErrorCollector,
  withRepositoryErrorHandling,
  withServiceErrorHandling,
  withControllerErrorHandling,
  handleServiceError,
  StandardErrorCodes,
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling
};

export default {
  createErrorMapper,
  createErrorCollector,
  withRepositoryErrorHandling,
  withServiceErrorHandling,
  withControllerErrorHandling,
  handleServiceError,
  StandardErrorCodes,
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling
}; 