import { InfraError } from "@/core/infra/errors/InfraErrors.js";
'use strict';

/**
 * File storage error
 * @extends InfraError
 */
class FileStorageError extends InfraError {
  /**
   * Create a new file storage error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {Error} options.cause - Original storage error
   * @param {string} options.operation - Storage operation
   * @param {string} options.storageProvider - Storage provider name
   * @param {string} options.filePath - File path or identifier
   * @param {number} options.fileSize - File size in bytes
   * @param {Object} options.metadata - Additional metadata
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      component: 'fileStorage'
    });
    
    // File storage specific context
    this.storageProvider = options.storageProvider;
    this.filePath = options.filePath;
    this.fileSize = options.fileSize;
    
    // Add to metadata for serialization
    this.metadata = {
      ...this.metadata,
      storageProvider: this.storageProvider,
      filePath: this.filePath,
      fileSize: this.fileSize
    };
  }
}

export {
  FileStorageError
}; 