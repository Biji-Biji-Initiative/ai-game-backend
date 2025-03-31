import { expect } from 'chai';
import sinon from 'sinon';
import { CacheInvalidationManager, CacheKeyPrefixes } from '../../../../../src/core/infra/cache/CacheInvalidationManager.js';

describe('CacheInvalidationManager', () => {
  let cacheService;
  let cacheInvalidationManager;
  
  beforeEach(() => {
    // Mock cache service
    cacheService = {
      del: sinon.stub().resolves(),
      delPattern: sinon.stub().resolves(),
      clear: sinon.stub().resolves()
    };
    
    // Create instance with mocked cache service
    cacheInvalidationManager = new CacheInvalidationManager(cacheService);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('initialization', () => {
    it('should throw error if cache service is not provided', () => {
      expect(() => new CacheInvalidationManager()).to.throw(Error, 'Cache service is required');
    });
    
    it('should initialize metrics object', () => {
      const metrics = cacheInvalidationManager.getMetrics();
      expect(metrics).to.have.property('invalidationsByEntityType').that.is.an('object');
      expect(metrics).to.have.property('patternInvalidations').that.equals(0);
      expect(metrics).to.have.property('keyInvalidations').that.equals(0);
      expect(metrics).to.have.property('failedInvalidations').that.equals(0);
      expect(metrics).to.have.property('uptime').that.is.a('number');
      expect(metrics).to.have.property('totalInvalidations').that.equals(0);
    });
  });
  
  describe('invalidateKey', () => {
    it('should call cache delete with the provided key', async () => {
      await cacheInvalidationManager.invalidateKey('test:key');
      expect(cacheService.del.calledOnceWith('test:key')).to.be.true;
    });
    
    it('should increment keyInvalidations metric', async () => {
      await cacheInvalidationManager.invalidateKey('test:key');
      const metrics = cacheInvalidationManager.getMetrics();
      expect(metrics.keyInvalidations).to.equal(1);
    });
    
    it('should handle cache service errors gracefully', async () => {
      cacheService.del.rejects(new Error('Fake cache error'));
      const result = await cacheInvalidationManager.invalidateKey('test:key');
      expect(result).to.be.false;
      
      const metrics = cacheInvalidationManager.getMetrics();
      expect(metrics.failedInvalidations).to.equal(1);
    });
  });
  
  describe('invalidatePattern', () => {
    it('should call cache deletePattern with the provided pattern', async () => {
      await cacheInvalidationManager.invalidatePattern('test:*');
      expect(cacheService.delPattern.calledOnceWith('test:*')).to.be.true;
    });
    
    it('should increment patternInvalidations metric', async () => {
      await cacheInvalidationManager.invalidatePattern('test:*');
      const metrics = cacheInvalidationManager.getMetrics();
      expect(metrics.patternInvalidations).to.equal(1);
    });
    
    it('should handle cache service errors gracefully', async () => {
      cacheService.delPattern.rejects(new Error('Fake cache error'));
      const result = await cacheInvalidationManager.invalidatePattern('test:*');
      expect(result).to.be.false;
      
      const metrics = cacheInvalidationManager.getMetrics();
      expect(metrics.failedInvalidations).to.equal(1);
    });
  });
  
  describe('invalidateEntity', () => {
    it('should return false for missing entityType or entityId', async () => {
      const result1 = await cacheInvalidationManager.invalidateEntity(null, 'id123');
      const result2 = await cacheInvalidationManager.invalidateEntity('user', null);
      
      expect(result1).to.be.false;
      expect(result2).to.be.false;
    });
    
    it('should invalidate specific entity and related pattern keys', async () => {
      await cacheInvalidationManager.invalidateEntity('user', 'user123');
      
      expect(cacheService.del.calledWith('user:byId:user123')).to.be.true;
      expect(cacheService.delPattern.calledWith('user:*:user123:*')).to.be.true;
      expect(cacheService.delPattern.calledWith('user:*:*:user123')).to.be.true;
    });
    
    it('should update entity-specific invalidation metrics', async () => {
      await cacheInvalidationManager.invalidateEntity('user', 'user123');
      await cacheInvalidationManager.invalidateEntity('user', 'user456');
      await cacheInvalidationManager.invalidateEntity('challenge', 'chal123');
      
      const metrics = cacheInvalidationManager.getMetrics();
      expect(metrics.invalidationsByEntityType.user).to.equal(2);
      expect(metrics.invalidationsByEntityType.challenge).to.equal(1);
    });
  });
  
  describe('invalidateUserCaches', () => {
    it('should return false if userId is not provided', async () => {
      const result = await cacheInvalidationManager.invalidateUserCaches(null);
      expect(result).to.be.false;
    });
    
    it('should invalidate user entity and related domain patterns', async () => {
      await cacheInvalidationManager.invalidateUserCaches('user123');
      
      // Should invalidate the user entity first
      expect(cacheService.del.calledWith('user:byId:user123')).to.be.true;
      
      // Should invalidate patterns in user domain
      expect(cacheService.delPattern.calledWith('user:list:*')).to.be.true;
      expect(cacheService.delPattern.calledWith('user:search:*')).to.be.true;
      
      // Should invalidate user-specific data in other domains
      expect(cacheService.delPattern.calledWith('challenge:byUser:user123:*')).to.be.true;
      expect(cacheService.delPattern.calledWith('focusarea:byUser:user123:*')).to.be.true;
      expect(cacheService.delPattern.calledWith('evaluation:byUser:user123:*')).to.be.true;
      expect(cacheService.delPattern.calledWith('personality:byUser:user123:*')).to.be.true;
      expect(cacheService.delPattern.calledWith('recommendation:byUser:user123:*')).to.be.true;
    });
  });
  
  describe('resetMetrics', () => {
    it('should reset all metrics counters', async () => {
      // Generate some activity
      await cacheInvalidationManager.invalidateKey('test:key');
      await cacheInvalidationManager.invalidatePattern('test:*');
      await cacheInvalidationManager.invalidateEntity('user', 'user123');
      
      // Verify metrics were recorded
      let metrics = cacheInvalidationManager.getMetrics();
      expect(metrics.keyInvalidations).to.equal(1);
      expect(metrics.patternInvalidations).to.equal(1);
      expect(metrics.invalidationsByEntityType.user).to.equal(1);
      
      // Reset metrics
      cacheInvalidationManager.resetMetrics();
      
      // Verify metrics were reset
      metrics = cacheInvalidationManager.getMetrics();
      expect(metrics.keyInvalidations).to.equal(0);
      expect(metrics.patternInvalidations).to.equal(0);
      expect(metrics.invalidationsByEntityType).to.be.an('object').that.is.empty;
    });
    
    it('should preserve lastInvalidation info when resetting metrics', async () => {
      // Generate activity
      await cacheInvalidationManager.invalidateKey('test:key');
      
      // Get current lastInvalidation
      const originalMetrics = cacheInvalidationManager.getMetrics();
      const lastInvalidation = originalMetrics.lastInvalidation;
      
      // Reset metrics
      cacheInvalidationManager.resetMetrics();
      
      // Verify lastInvalidation was preserved
      const newMetrics = cacheInvalidationManager.getMetrics();
      expect(newMetrics.lastInvalidation).to.deep.equal(lastInvalidation);
    });
  });
  
  describe('invalidateAll', () => {
    it('should call cache clear method', async () => {
      await cacheInvalidationManager.invalidateAll();
      expect(cacheService.clear.calledOnce).to.be.true;
    });
    
    it('should handle cache service errors gracefully', async () => {
      cacheService.clear.rejects(new Error('Fake cache error'));
      const result = await cacheInvalidationManager.invalidateAll();
      expect(result).to.be.false;
    });
  });
}); 