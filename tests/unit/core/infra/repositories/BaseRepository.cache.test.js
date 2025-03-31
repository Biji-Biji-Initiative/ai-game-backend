import { expect } from 'chai';
import sinon from 'sinon';
import { BaseRepository } from '../../../../../src/core/infra/repositories/BaseRepository.js';

describe('BaseRepository Cache Invalidation', () => {
  let mockDb;
  let mockTransaction;
  let mockCacheInvalidator;
  let mockEventBus;
  let repository;
  
  beforeEach(() => {
    // Mock database and transaction
    mockTransaction = {
      commit: sinon.stub().resolves(),
      rollback: sinon.stub().resolves(),
      from: sinon.stub().returnsThis(),
      insert: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      delete: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis(),
      single: sinon.stub().returns({ data: { id: 'test-id' }, error: null })
    };
    
    mockDb = {
      transaction: sinon.stub().resolves(mockTransaction)
    };
    
    // Mock cache invalidator
    mockCacheInvalidator = {
      invalidateEntity: sinon.stub().resolves(true),
      invalidateUserCaches: sinon.stub().resolves(true),
      invalidateChallengeCaches: sinon.stub().resolves(true),
      invalidateEvaluationCaches: sinon.stub().resolves(true),
      invalidatePattern: sinon.stub().resolves(true),
      invalidateListCaches: sinon.stub().resolves(true)
    };
    
    // Mock event bus
    mockEventBus = {
      publish: sinon.stub().resolves()
    };
    
    // Create repository instance
    repository = new BaseRepository({
      db: mockDb,
      tableName: 'test_table',
      domainName: 'test',
      eventBus: mockEventBus,
      cacheInvalidator: mockCacheInvalidator
    });
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('constructor', () => {
    it('should initialize with cache invalidator if provided', () => {
      expect(repository.cacheInvalidator).to.equal(mockCacheInvalidator);
    });
    
    it('should use getCacheInvalidationManager if no invalidator provided', () => {
      // We can't easily test the default behavior without mocking the module import
      // Just verify that the property exists when not provided
      const repoWithoutInvalidator = new BaseRepository({
        db: mockDb,
        tableName: 'test_table'
      });
      expect(repoWithoutInvalidator.cacheInvalidator).to.exist;
    });
  });
  
  describe('withTransaction', () => {
    it('should invalidate caches after successful commit', async () => {
      // Mock entity returned from transaction function
      const mockEntity = { id: 'entity-123', name: 'Test Entity' };
      const transactionFn = sinon.stub().resolves(mockEntity);
      
      // Execute withTransaction
      const result = await repository.withTransaction(transactionFn);
      
      // Verify transaction was committed
      expect(mockTransaction.commit.calledOnce).to.be.true;
      
      // Verify invalidation was called with the result entity
      expect(mockCacheInvalidator.invalidateEntity.calledWith(
        'test', // domainName
        'entity-123' // entity.id
      )).to.be.true;
      
      // Verify the result is correct
      expect(result).to.equal(mockEntity);
    });
    
    it('should handle array results and invalidate each entity', async () => {
      // Mock array of entities returned from transaction function
      const mockEntities = [
        { id: 'entity-1', name: 'Entity 1' },
        { id: 'entity-2', name: 'Entity 2' }
      ];
      const transactionFn = sinon.stub().resolves(mockEntities);
      
      // Execute withTransaction
      await repository.withTransaction(transactionFn);
      
      // Verify invalidation was called for each entity
      expect(mockCacheInvalidator.invalidateEntity.calledWith('test', 'entity-1')).to.be.true;
      expect(mockCacheInvalidator.invalidateEntity.calledWith('test', 'entity-2')).to.be.true;
      expect(mockCacheInvalidator.invalidateEntity.callCount).to.equal(2);
    });
    
    it('should not invalidate caches if invalidateCache is false', async () => {
      const mockEntity = { id: 'entity-123', name: 'Test Entity' };
      const transactionFn = sinon.stub().resolves(mockEntity);
      
      // Execute withTransaction with invalidateCache: false
      await repository.withTransaction(transactionFn, { invalidateCache: false });
      
      // Verify invalidation was not called
      expect(mockCacheInvalidator.invalidateEntity.called).to.be.false;
    });
    
    it('should skip cache invalidation for null or undefined results', async () => {
      // Test with null result
      await repository.withTransaction(sinon.stub().resolves(null));
      expect(mockCacheInvalidator.invalidateEntity.called).to.be.false;
      
      // Reset stub
      mockCacheInvalidator.invalidateEntity.reset();
      
      // Test with undefined result
      await repository.withTransaction(sinon.stub().resolves(undefined));
      expect(mockCacheInvalidator.invalidateEntity.called).to.be.false;
    });
    
    it('should handle transaction failures and not invalidate cache', async () => {
      // Make transaction.commit throw an error
      mockTransaction.commit.rejects(new Error('Transaction failure'));
      
      // Execute withTransaction
      try {
        await repository.withTransaction(sinon.stub().resolves({ id: 'test' }));
        // Should not get here
        expect.fail('withTransaction should have thrown an error');
      } catch (error) {
        // Verify rollback was called
        expect(mockTransaction.rollback.calledOnce).to.be.true;
        
        // Verify invalidation was not called
        expect(mockCacheInvalidator.invalidateEntity.called).to.be.false;
      }
    });
  });
  
  describe('_invalidateRelatedCaches', () => {
    it('should handle user entities with specific invalidation', async () => {
      // Create user repository with user domain
      const userRepo = new BaseRepository({
        db: mockDb,
        tableName: 'users',
        domainName: 'user',
        cacheInvalidator: mockCacheInvalidator
      });
      
      // Invalidate user entity
      await userRepo._invalidateRelatedCaches({ id: 'user-123' }, mockCacheInvalidator);
      
      // Verify user-specific invalidation was called
      expect(mockCacheInvalidator.invalidateEntity.calledWith('user', 'user-123')).to.be.true;
      expect(mockCacheInvalidator.invalidateUserCaches.calledWith('user-123')).to.be.true;
    });
    
    it('should handle challenge entities with specific invalidation', async () => {
      // Create challenge repository
      const challengeRepo = new BaseRepository({
        db: mockDb,
        tableName: 'challenges',
        domainName: 'challenge',
        cacheInvalidator: mockCacheInvalidator
      });
      
      // Invalidate challenge entity with userId
      await challengeRepo._invalidateRelatedCaches({ 
        id: 'challenge-123', 
        userId: 'user-456' 
      }, mockCacheInvalidator);
      
      // Verify challenge-specific invalidation was called
      expect(mockCacheInvalidator.invalidateEntity.calledWith('challenge', 'challenge-123')).to.be.true;
      expect(mockCacheInvalidator.invalidateChallengeCaches.calledWith('challenge-123')).to.be.true;
      
      // Verify user-specific challenge pattern was invalidated
      expect(mockCacheInvalidator.invalidatePattern.calledWith('challenge:byUser:user-456:*')).to.be.true;
    });
    
    it('should handle evaluation entities with specific invalidation', async () => {
      // Create evaluation repository
      const evalRepo = new BaseRepository({
        db: mockDb,
        tableName: 'evaluations',
        domainName: 'evaluation',
        cacheInvalidator: mockCacheInvalidator
      });
      
      // Evaluation with related IDs
      const evaluation = {
        id: 'eval-123',
        userId: 'user-456',
        challengeId: 'challenge-789'
      };
      
      // Invalidate evaluation entity
      await evalRepo._invalidateRelatedCaches(evaluation, mockCacheInvalidator);
      
      // Verify evaluation-specific invalidation with related IDs
      expect(mockCacheInvalidator.invalidateEntity.calledWith('evaluation', 'eval-123')).to.be.true;
      expect(mockCacheInvalidator.invalidateEvaluationCaches.calledWith(
        'eval-123', 'user-456', 'challenge-789'
      )).to.be.true;
    });
    
    it('should invalidate list caches for the entity type', async () => {
      // Invalidate any entity
      await repository._invalidateRelatedCaches({ id: 'test-id' }, mockCacheInvalidator);
      
      // Verify list caches were invalidated
      expect(mockCacheInvalidator.invalidateListCaches.calledWith('test')).to.be.true;
    });
    
    it('should handle invalidation errors gracefully', async () => {
      // Make invalidateEntity throw error
      mockCacheInvalidator.invalidateEntity.rejects(new Error('Invalidation error'));
      
      // Should not throw when invalidation fails
      await expect(
        repository._invalidateRelatedCaches({ id: 'test-id' }, mockCacheInvalidator)
      ).to.not.be.rejected;
    });
  });
}); 