import { expect } from 'chai';
import { describe, it } from 'mocha';
import { 
  InfraError, 
  DatabaseError, 
  CacheError,
  CacheKeyNotFoundError,
  CacheOperationError 
} from "@/core/infra/errors/InfraErrors.js";

describe('Infrastructure Errors', () => {
  describe('InfraError', () => {
    it('should create a basic infra error with minimal context', () => {
      const error = new InfraError('Something went wrong');
      
      expect(error).to.be.instanceof(Error);
      expect(error.name).to.equal('InfraError');
      expect(error.message).to.equal('Something went wrong');
      expect(error.component).to.equal('infrastructure');
      expect(error.metadata).to.deep.equal({});
    });
    
    it('should capture original error in cause and metadata', () => {
      const originalError = new Error('Original error');
      const error = new InfraError('Something went wrong', {
        cause: originalError,
        component: 'test-component',
        operation: 'test-operation'
      });
      
      expect(error.cause).to.equal(originalError);
      expect(error.originalErrorName).to.equal('Error');
      expect(error.originalErrorMessage).to.equal('Original error');
      expect(error.component).to.equal('test-component');
      expect(error.operation).to.equal('test-operation');
    });
    
    it('should properly serialize to JSON for logging', () => {
      const originalError = new Error('Original error');
      const error = new InfraError('Something went wrong', {
        cause: originalError,
        component: 'test-component',
        operation: 'test-operation',
        resource: { type: 'table', name: 'users' },
        metadata: { requestId: '123', userId: '456' }
      });
      
      const json = error.toJSON();
      
      expect(json).to.have.property('name', 'InfraError');
      expect(json).to.have.property('message', 'Something went wrong');
      expect(json).to.have.property('component', 'test-component');
      expect(json).to.have.property('operation', 'test-operation');
      expect(json).to.have.deep.property('resource', { type: 'table', name: 'users' });
      expect(json).to.have.deep.property('originalError', {
        name: 'Error',
        message: 'Original error'
      });
      expect(json).to.have.deep.property('metadata', { requestId: '123', userId: '456' });
    });
  });
  
  describe('DatabaseError', () => {
    it('should create a database error with database-specific context', () => {
      const error = new DatabaseError('Database query failed', {
        operation: 'query',
        entityType: 'user',
        queryType: 'SELECT',
        resource: { table: 'users' }
      });
      
      expect(error).to.be.instanceof(InfraError);
      expect(error.name).to.equal('DatabaseError');
      expect(error.component).to.equal('database');
      expect(error.operation).to.equal('query');
      expect(error.entityType).to.equal('user');
      expect(error.queryType).to.equal('SELECT');
      expect(error.resource).to.deep.equal({ table: 'users' });
      
      // Check metadata includes the database-specific fields
      expect(error.metadata).to.have.property('entityType', 'user');
      expect(error.metadata).to.have.property('queryType', 'SELECT');
    });
  });
  
  describe('CacheError', () => {
    it('should create a cache error with cache-specific context', () => {
      const error = new CacheError('Cache operation failed', {
        operation: 'get',
        cacheKey: 'user:123',
        cacheProvider: 'redis'
      });
      
      expect(error).to.be.instanceof(InfraError);
      expect(error.name).to.equal('CacheError');
      expect(error.component).to.equal('cache');
      expect(error.operation).to.equal('get');
      expect(error.cacheKey).to.equal('user:123');
      expect(error.cacheProvider).to.equal('redis');
      
      // Check metadata includes the cache-specific fields
      expect(error.metadata).to.have.property('cacheKey', 'user:123');
      expect(error.metadata).to.have.property('cacheProvider', 'redis');
    });
  });
  
  describe('CacheKeyNotFoundError', () => {
    it('should create a specialized cache error for missing keys', () => {
      const error = new CacheKeyNotFoundError('user:123');
      
      expect(error).to.be.instanceof(CacheError);
      expect(error.name).to.equal('CacheKeyNotFoundError');
      expect(error.message).to.equal('Cache key not found: user:123');
      expect(error.cacheKey).to.equal('user:123');
      expect(error.operation).to.equal('get');
    });
  });
  
  describe('CacheOperationError', () => {
    it('should create a specialized cache error for failed operations', () => {
      const error = new CacheOperationError('set', 'user:123', {
        cause: new Error('Connection refused'),
        cacheProvider: 'redis'
      });
      
      expect(error).to.be.instanceof(CacheError);
      expect(error.name).to.equal('CacheOperationError');
      expect(error.message).to.equal("Cache operation 'set' failed for key: user:123");
      expect(error.operation).to.equal('set');
      expect(error.cacheKey).to.equal('user:123');
      expect(error.cacheProvider).to.equal('redis');
      expect(error.cause).to.be.instanceof(Error);
      expect(error.cause.message).to.equal('Connection refused');
    });
  });
}); 