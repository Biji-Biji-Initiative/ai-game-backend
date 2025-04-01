import { expect } from 'chai';
import sinon from 'sinon';
import { BaseRepository } from "#app/core/infra/repositories/BaseRepository.js";
import { CacheInvalidationManager } from "#app/core/infra/cache/CacheInvalidationManager.js";

describe('BaseRepository Cache Invalidation', () => {
  let repository;
  let mockDb;
  let mockCacheInvalidator;
  let mockTransaction;
  let mockEventBus;
  
  beforeEach(() => {
    // Create mocks
    mockTransaction = {
      commit: sinon.stub().resolves(),
      rollback: sinon.stub().resolves()
    };
    
    mockDb = {
      transaction: sinon.stub().resolves(mockTransaction),
      from: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      insert: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      delete: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis()
    };
    
    mockCacheInvalidator = {
      invalidateEntity: sinon.stub().resolves(true),
      invalidateUserCaches: sinon.stub().resolves(true),
      invalidateChallengeCaches: sinon.stub().resolves(true),
      invalidateEvaluationCaches: sinon.stub().resolves(true),
      invalidatePattern: sinon.stub().resolves(true),
      invalidateListCaches: sinon.stub().resolves(true)
    };
    
    mockEventBus = {
      publish: sinon.stub().resolves()
    };
    
    // Create repository instance
    repository = new BaseRepository({
      db: mockDb,
      tableName: 'test_table',
      domainName: 'test',
      cacheInvalidator: mockCacheInvalidator,
      eventBus: mockEventBus
    });
    
    // Mock internal methods
    repository._log = sinon.stub();
    repository.beginTransaction = sinon.stub().resolves(mockTransaction);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('withTransaction', () => {
    it('should invoke cache invalidation after successful commit', async () => {
      // Arrange
      const testEntity = { id: '123', name: 'Test Entity' };
      const transactionFn = sinon.stub().resolves(testEntity);
      
      // Spy on _invalidateRelatedCaches
      const invalidateSpy = sinon.spy(repository, '_invalidateRelatedCaches');
      
      // Act
      const result = await repository.withTransaction(transactionFn, {
        invalidateCache: true,
        cacheInvalidator: mockCacheInvalidator
      });
      
      // Assert
      expect(result).to.equal(testEntity);
      expect(mockTransaction.commit.calledOnce).to.be.true;
      expect(invalidateSpy.calledOnce).to.be.true;
      expect(invalidateSpy.calledWith(testEntity, mockCacheInvalidator)).to.be.true;
    });
    
    it('should not invoke cache invalidation when disabled', async () => {
      // Arrange
      const testEntity = { id: '123', name: 'Test Entity' };
      const transactionFn = sinon.stub().resolves(testEntity);
      
      // Spy on _invalidateRelatedCaches
      const invalidateSpy = sinon.spy(repository, '_invalidateRelatedCaches');
      
      // Act
      const result = await repository.withTransaction(transactionFn, {
        invalidateCache: false
      });
      
      // Assert
      expect(result).to.equal(testEntity);
      expect(mockTransaction.commit.calledOnce).to.be.true;
      expect(invalidateSpy.called).to.be.false;
    });
    
    it('should not invoke cache invalidation with null result', async () => {
      // Arrange
      const transactionFn = sinon.stub().resolves(null);
      
      // Spy on _invalidateRelatedCaches
      const invalidateSpy = sinon.spy(repository, '_invalidateRelatedCaches');
      
      // Act
      const result = await repository.withTransaction(transactionFn, {
        invalidateCache: true
      });
      
      // Assert
      expect(result).to.be.null;
      expect(mockTransaction.commit.calledOnce).to.be.true;
      
      // The implementation doesn't call _invalidateRelatedCaches when result is null
      expect(invalidateSpy.called).to.be.false;
    });
    
    it('should rollback and not invalidate cache on error', async () => {
      // Arrange
      const testError = new Error('Transaction failed');
      const transactionFn = sinon.stub().rejects(testError);
      
      // Spy on _invalidateRelatedCaches
      const invalidateSpy = sinon.spy(repository, '_invalidateRelatedCaches');
      
      // Act & Assert using try/catch instead of rejectedWith
      try {
        await repository.withTransaction(transactionFn, {
          invalidateCache: true
        });
        // If we get here, the test should fail
        expect.fail('Expected error was not thrown');
      } catch (error) {
        expect(error.message).to.include('Transaction failed');
        expect(mockTransaction.rollback.calledOnce).to.be.true;
        expect(mockTransaction.commit.called).to.be.false;
        expect(invalidateSpy.called).to.be.false;
      }
    });
  });
  
  describe('_invalidateRelatedCaches', () => {
    it('should invalidate entity by ID for single entity', async () => {
      // Arrange
      const entity = { id: '123', name: 'Test Entity' };
      
      // Act
      await repository._invalidateRelatedCaches(entity, mockCacheInvalidator);
      
      // Assert
      expect(mockCacheInvalidator.invalidateEntity.calledOnce).to.be.true;
      expect(mockCacheInvalidator.invalidateEntity.calledWith('test', '123')).to.be.true;
      expect(mockCacheInvalidator.invalidateListCaches.calledOnce).to.be.true;
      expect(mockCacheInvalidator.invalidateListCaches.calledWith('test')).to.be.true;
    });
    
    it('should invalidate entity by ID for collection of entities', async () => {
      // Arrange
      const entities = [
        { id: '123', name: 'Entity 1' },
        { id: '456', name: 'Entity 2' }
      ];
      
      // Act
      await repository._invalidateRelatedCaches(entities, mockCacheInvalidator);
      
      // Assert
      expect(mockCacheInvalidator.invalidateEntity.calledTwice).to.be.true;
      expect(mockCacheInvalidator.invalidateEntity.calledWith('test', '123')).to.be.true;
      expect(mockCacheInvalidator.invalidateEntity.calledWith('test', '456')).to.be.true;
      expect(mockCacheInvalidator.invalidateListCaches.calledTwice).to.be.true;
    });
    
    it('should skip entities without an ID', async () => {
      // Arrange
      const entities = [
        { id: '123', name: 'Valid Entity' },
        { name: 'Invalid Entity - No ID' }
      ];
      
      // Act
      await repository._invalidateRelatedCaches(entities, mockCacheInvalidator);
      
      // Assert
      expect(mockCacheInvalidator.invalidateEntity.calledOnce).to.be.true;
      expect(mockCacheInvalidator.invalidateEntity.calledWith('test', '123')).to.be.true;
    });
    
    it('should invoke domain-specific invalidation for user entities', async () => {
      // Arrange
      repository.domainName = 'user';
      const entity = { id: '123', email: 'test@example.com' };
      
      // Act
      await repository._invalidateRelatedCaches(entity, mockCacheInvalidator);
      
      // Assert
      expect(mockCacheInvalidator.invalidateEntity.calledWith('user', '123')).to.be.true;
      expect(mockCacheInvalidator.invalidateUserCaches.calledWith('123')).to.be.true;
      expect(mockCacheInvalidator.invalidatePattern.calledWith('user:byEmail:test@example.com:*')).to.be.true;
    });
    
    it('should invoke domain-specific invalidation for challenge entities', async () => {
      // Arrange
      repository.domainName = 'challenge';
      const entity = { 
        id: '123', 
        userId: '456',
        focusArea: 'javascript',
        status: 'completed'
      };
      
      // Act
      await repository._invalidateRelatedCaches(entity, mockCacheInvalidator);
      
      // Assert
      expect(mockCacheInvalidator.invalidateEntity.calledWith('challenge', '123')).to.be.true;
      expect(mockCacheInvalidator.invalidateChallengeCaches.calledWith('123')).to.be.true;
      expect(mockCacheInvalidator.invalidatePattern.calledWith('challenge:byUser:456:*')).to.be.true;
      expect(mockCacheInvalidator.invalidatePattern.calledWith('challenge:byFocusArea:javascript:*')).to.be.true;
      expect(mockCacheInvalidator.invalidatePattern.calledWith('focusarea:withChallenges:javascript:*')).to.be.true;
      expect(mockCacheInvalidator.invalidatePattern.calledWith('challenge:byStatus:completed:*')).to.be.true;
    });
    
    it('should handle cache invalidation errors gracefully', async () => {
      // Arrange
      const entity = { id: '123', name: 'Test Entity' };
      const testError = new Error('Cache invalidation failed');
      mockCacheInvalidator.invalidateEntity.rejects(testError);
      
      // Act
      await repository._invalidateRelatedCaches(entity, mockCacheInvalidator);
      
      // Assert
      expect(repository._log.calledWith('error', 'Error invalidating caches')).to.be.true;
      // The key point is that no exception was thrown to the caller
    });
  });
}); 