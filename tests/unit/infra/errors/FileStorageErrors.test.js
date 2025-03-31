import { expect } from 'chai';
import { describe, it } from 'mocha';
import { FileStorageError } from "@/core/infra/errors/FileStorageErrors.js";
import { InfraError } from "@/core/infra/errors/InfraErrors.js";

describe('File Storage Errors', () => {
  describe('FileStorageError', () => {
    it('should create a basic file storage error with minimal context', () => {
      const error = new FileStorageError('File upload failed');
      
      expect(error).to.be.instanceof(InfraError);
      expect(error.name).to.equal('FileStorageError');
      expect(error.message).to.equal('File upload failed');
      expect(error.component).to.equal('fileStorage');
      expect(error.metadata).to.be.an('object');
    });
    
    it('should capture file storage-specific context', () => {
      const originalError = new Error('Access denied');
      
      const error = new FileStorageError('Failed to upload file', {
        cause: originalError,
        operation: 'upload',
        storageProvider: 's3',
        filePath: 'uploads/images/profile.jpg',
        fileSize: 1024 * 1024 // 1MB
      });
      
      expect(error.cause).to.equal(originalError);
      expect(error.operation).to.equal('upload');
      expect(error.storageProvider).to.equal('s3');
      expect(error.filePath).to.equal('uploads/images/profile.jpg');
      expect(error.fileSize).to.equal(1024 * 1024);
      
      // Check metadata includes file storage-specific fields
      expect(error.metadata).to.have.property('storageProvider', 's3');
      expect(error.metadata).to.have.property('filePath', 'uploads/images/profile.jpg');
      expect(error.metadata).to.have.property('fileSize', 1024 * 1024);
    });
    
    it('should properly serialize to JSON for logging', () => {
      const error = new FileStorageError('Failed to read file', {
        operation: 'read',
        storageProvider: 'local',
        filePath: '/tmp/data.json',
        fileSize: 2048,
        metadata: { 
          userId: '123', 
          mimeType: 'application/json' 
        }
      });
      
      const json = error.toJSON();
      
      expect(json).to.have.property('name', 'FileStorageError');
      expect(json).to.have.property('message', 'Failed to read file');
      expect(json).to.have.property('component', 'fileStorage');
      expect(json).to.have.property('operation', 'read');
      expect(json.metadata).to.have.property('storageProvider', 'local');
      expect(json.metadata).to.have.property('filePath', '/tmp/data.json');
      expect(json.metadata).to.have.property('fileSize', 2048);
      expect(json.metadata).to.have.property('userId', '123');
      expect(json.metadata).to.have.property('mimeType', 'application/json');
    });
    
    it('should handle missing optional properties', () => {
      const error = new FileStorageError('File operation failed', {
        operation: 'delete'
      });
      
      expect(error.operation).to.equal('delete');
      expect(error.storageProvider).to.be.undefined;
      expect(error.filePath).to.be.undefined;
      expect(error.fileSize).to.be.undefined;
      
      // Even without specific properties, we can still serialize to JSON
      const json = error.toJSON();
      expect(json).to.have.property('name', 'FileStorageError');
      expect(json).to.have.property('operation', 'delete');
    });
  });
}); 