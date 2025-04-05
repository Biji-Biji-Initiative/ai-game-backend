'use strict';

import BadgeController from '../../core/badge/controllers/BadgeController.js';

/**
 * Unit tests for BadgeController
 */
describe('BadgeController', () => {
  let badgeController;
  let mockBadgeCoordinator;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Create mock coordinator with all required methods
    mockBadgeCoordinator = {
      getUserBadges: jest.fn(),
      getBadgeTypes: jest.fn(),
      getBadgeProgress: jest.fn(),
      getBadgeById: jest.fn(),
      getBadgesByCategory: jest.fn(),
      checkUnlockedBadges: jest.fn(),
      acknowledgeBadge: jest.fn(),
      getBadgeStats: jest.fn()
    };
    
    // Create controller instance with mock coordinator
    badgeController = new BadgeController({
      badgeCoordinator: mockBadgeCoordinator
    });
    
    // Create mock request and response objects
    mockReq = {
      user: { id: 'user-123' },
      params: {},
      query: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });
  
  describe('getUserBadges', () => {
    it('should return badges for the current user', async () => {
      // Setup
      const mockBadges = [{ id: 'badge-1' }, { id: 'badge-2' }];
      mockBadgeCoordinator.getUserBadges.mockResolvedValue(mockBadges);
      
      // Execute
      await badgeController.getUserBadges(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.getUserBadges).toHaveBeenCalledWith('user-123', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockBadges
      });
    });
    
    it('should handle errors properly', async () => {
      // Setup
      const error = new Error('Test error');
      mockBadgeCoordinator.getUserBadges.mockRejectedValue(error);
      
      // Execute
      await badgeController.getUserBadges(mockReq, mockRes);
      
      // Verify
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });
  });
  
  describe('getBadgeTypes', () => {
    it('should return all available badge types', async () => {
      // Setup
      const mockTypes = [
        { id: 'type-1', name: 'Achievement' },
        { id: 'type-2', name: 'Milestone' }
      ];
      mockBadgeCoordinator.getBadgeTypes.mockResolvedValue(mockTypes);
      
      // Execute
      await badgeController.getBadgeTypes(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.getBadgeTypes).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockTypes
      });
    });
  });
  
  describe('getBadgeProgress', () => {
    it('should return badge progress for the current user', async () => {
      // Setup
      const mockProgress = {
        total: 20,
        unlocked: 5,
        categories: {
          achievement: { total: 10, unlocked: 3 },
          milestone: { total: 10, unlocked: 2 }
        }
      };
      mockBadgeCoordinator.getBadgeProgress.mockResolvedValue(mockProgress);
      
      // Execute
      await badgeController.getBadgeProgress(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.getBadgeProgress).toHaveBeenCalledWith('user-123', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockProgress
      });
    });
  });
  
  describe('getBadgeById', () => {
    it('should return a specific badge by ID', async () => {
      // Setup
      const mockBadge = { id: 'badge-123', name: 'Test Badge' };
      mockReq.params.id = 'badge-123';
      mockBadgeCoordinator.getBadgeById.mockResolvedValue(mockBadge);
      
      // Execute
      await badgeController.getBadgeById(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.getBadgeById).toHaveBeenCalledWith('badge-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockBadge
      });
    });
  });
  
  describe('getBadgesByCategory', () => {
    it('should return badges by category', async () => {
      // Setup
      const mockBadges = [{ id: 'badge-1' }, { id: 'badge-2' }];
      mockReq.params.category = 'achievement';
      mockBadgeCoordinator.getBadgesByCategory.mockResolvedValue(mockBadges);
      
      // Execute
      await badgeController.getBadgesByCategory(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.getBadgesByCategory).toHaveBeenCalledWith(
        'achievement',
        'user-123',
        {}
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockBadges
      });
    });
  });
  
  describe('checkUnlockedBadges', () => {
    it('should check for newly unlocked badges', async () => {
      // Setup
      const mockUnlockedBadges = [
        { id: 'badge-1', name: 'New Badge', achievementMessage: 'Congratulations!' }
      ];
      mockReq.body = { context: { challengeId: 'challenge-123' } };
      mockBadgeCoordinator.checkUnlockedBadges.mockResolvedValue(mockUnlockedBadges);
      
      // Execute
      await badgeController.checkUnlockedBadges(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.checkUnlockedBadges).toHaveBeenCalledWith(
        'user-123',
        { challengeId: 'challenge-123' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockUnlockedBadges
      });
    });
  });
  
  describe('acknowledgeBadge', () => {
    it('should mark a badge as acknowledged', async () => {
      // Setup
      const mockBadge = { id: 'badge-123', acknowledged: true };
      mockReq.params.id = 'badge-123';
      mockBadgeCoordinator.acknowledgeBadge.mockResolvedValue(mockBadge);
      
      // Execute
      await badgeController.acknowledgeBadge(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.acknowledgeBadge).toHaveBeenCalledWith('badge-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockBadge
      });
    });
  });
  
  describe('getBadgeStats', () => {
    it('should return badge statistics for the user', async () => {
      // Setup
      const mockStats = {
        totalBadges: 20,
        unlockedBadges: 5,
        completionPercentage: 25,
        categoryBreakdown: {
          achievement: { total: 10, unlocked: 3, percentage: 30 },
          milestone: { total: 10, unlocked: 2, percentage: 20 }
        }
      };
      mockBadgeCoordinator.getBadgeStats.mockResolvedValue(mockStats);
      
      // Execute
      await badgeController.getBadgeStats(mockReq, mockRes);
      
      // Verify
      expect(mockBadgeCoordinator.getBadgeStats).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockStats
      });
    });
  });
});
