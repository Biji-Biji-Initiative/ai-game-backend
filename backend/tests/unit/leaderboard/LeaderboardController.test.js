'use strict';

import LeaderboardController from '../../core/leaderboard/controllers/LeaderboardController.js';

/**
 * Unit tests for LeaderboardController
 */
describe('LeaderboardController', () => {
  let leaderboardController;
  let mockLeaderboardCoordinator;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Create mock coordinator with all required methods
    mockLeaderboardCoordinator = {
      getGlobalLeaderboard: jest.fn(),
      getFocusAreaLeaderboard: jest.fn(),
      getChallengeLeaderboard: jest.fn(),
      getSimilarProfilesLeaderboard: jest.fn(),
      getFriendsLeaderboard: jest.fn(),
      submitScore: jest.fn(),
      getUserRank: jest.fn(),
      getLeaderboardInsights: jest.fn()
    };
    
    // Create controller instance with mock coordinator
    leaderboardController = new LeaderboardController({
      leaderboardCoordinator: mockLeaderboardCoordinator
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
  
  describe('getGlobalLeaderboard', () => {
    it('should return the global leaderboard', async () => {
      // Setup
      const mockLeaderboard = {
        timeframe: 'all-time',
        entries: [
          { rank: 1, userId: 'user-1', score: 1000 },
          { rank: 2, userId: 'user-2', score: 900 }
        ]
      };
      mockReq.query = { timeframe: 'all-time', limit: 10 };
      mockLeaderboardCoordinator.getGlobalLeaderboard.mockResolvedValue(mockLeaderboard);
      
      // Execute
      await leaderboardController.getGlobalLeaderboard(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.getGlobalLeaderboard).toHaveBeenCalledWith({
        timeframe: 'all-time',
        limit: 10
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLeaderboard
      });
    });
    
    it('should handle errors properly', async () => {
      // Setup
      const error = new Error('Test error');
      mockLeaderboardCoordinator.getGlobalLeaderboard.mockRejectedValue(error);
      
      // Execute
      await leaderboardController.getGlobalLeaderboard(mockReq, mockRes);
      
      // Verify
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });
  });
  
  describe('getFocusAreaLeaderboard', () => {
    it('should return the focus area leaderboard', async () => {
      // Setup
      const mockLeaderboard = {
        focusAreaId: 'focus-123',
        timeframe: 'monthly',
        entries: [
          { rank: 1, userId: 'user-1', score: 500 },
          { rank: 2, userId: 'user-2', score: 450 }
        ]
      };
      mockReq.params.focusAreaId = 'focus-123';
      mockReq.query = { timeframe: 'monthly', limit: 10 };
      mockLeaderboardCoordinator.getFocusAreaLeaderboard.mockResolvedValue(mockLeaderboard);
      
      // Execute
      await leaderboardController.getFocusAreaLeaderboard(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.getFocusAreaLeaderboard).toHaveBeenCalledWith(
        'focus-123',
        {
          timeframe: 'monthly',
          limit: 10
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLeaderboard
      });
    });
  });
  
  describe('getChallengeLeaderboard', () => {
    it('should return the challenge leaderboard', async () => {
      // Setup
      const mockLeaderboard = {
        challengeId: 'challenge-123',
        timeframe: 'weekly',
        entries: [
          { rank: 1, userId: 'user-1', score: 300 },
          { rank: 2, userId: 'user-2', score: 250 }
        ]
      };
      mockReq.params.challengeId = 'challenge-123';
      mockReq.query = { timeframe: 'weekly', limit: 10 };
      mockLeaderboardCoordinator.getChallengeLeaderboard.mockResolvedValue(mockLeaderboard);
      
      // Execute
      await leaderboardController.getChallengeLeaderboard(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.getChallengeLeaderboard).toHaveBeenCalledWith(
        'challenge-123',
        {
          timeframe: 'weekly',
          limit: 10
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLeaderboard
      });
    });
  });
  
  describe('getSimilarProfilesLeaderboard', () => {
    it('should return the similar profiles leaderboard', async () => {
      // Setup
      const mockLeaderboard = {
        timeframe: 'all-time',
        entries: [
          { rank: 1, userId: 'user-1', score: 800 },
          { rank: 2, userId: 'user-123', score: 750 }
        ]
      };
      mockReq.query = { timeframe: 'all-time', limit: 10 };
      mockLeaderboardCoordinator.getSimilarProfilesLeaderboard.mockResolvedValue(mockLeaderboard);
      
      // Execute
      await leaderboardController.getSimilarProfilesLeaderboard(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.getSimilarProfilesLeaderboard).toHaveBeenCalledWith(
        'user-123',
        {
          timeframe: 'all-time',
          limit: 10
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLeaderboard
      });
    });
  });
  
  describe('getFriendsLeaderboard', () => {
    it('should return the friends leaderboard', async () => {
      // Setup
      const mockLeaderboard = {
        timeframe: 'daily',
        entries: [
          { rank: 1, userId: 'friend-1', score: 200 },
          { rank: 2, userId: 'friend-2', score: 150 },
          { rank: 3, userId: 'user-123', score: 100 }
        ]
      };
      mockReq.query = { timeframe: 'daily', limit: 10 };
      mockLeaderboardCoordinator.getFriendsLeaderboard.mockResolvedValue(mockLeaderboard);
      
      // Execute
      await leaderboardController.getFriendsLeaderboard(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.getFriendsLeaderboard).toHaveBeenCalledWith(
        'user-123',
        {
          timeframe: 'daily',
          limit: 10
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLeaderboard
      });
    });
  });
  
  describe('submitScore', () => {
    it('should submit a score to the leaderboard', async () => {
      // Setup
      const mockSubmission = {
        submission: { id: 'submission-123', score: 500 },
        userRank: { rank: 5, rankChange: 3 },
        insights: 'You moved up 3 positions!'
      };
      mockReq.params.challengeId = 'challenge-123';
      mockReq.body = { score: 500, metadata: { timeframe: 'weekly' } };
      mockLeaderboardCoordinator.submitScore.mockResolvedValue(mockSubmission);
      
      // Execute
      await leaderboardController.submitScore(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.submitScore).toHaveBeenCalledWith(
        'user-123',
        'challenge-123',
        500,
        { timeframe: 'weekly' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockSubmission
      });
    });
  });
  
  describe('getUserRank', () => {
    it('should return the user rank', async () => {
      // Setup
      const mockRank = {
        global: { rank: 42, total: 1000, percentile: 95.8 },
        focusAreas: {
          'focus-123': { rank: 15, total: 500, percentile: 97.0 }
        },
        challenges: {
          'challenge-123': { rank: 3, total: 100, percentile: 97.0 }
        }
      };
      mockReq.query = { timeframe: 'all-time' };
      mockLeaderboardCoordinator.getUserRank.mockResolvedValue(mockRank);
      
      // Execute
      await leaderboardController.getUserRank(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.getUserRank).toHaveBeenCalledWith(
        'user-123',
        { timeframe: 'all-time' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRank
      });
    });
  });
  
  describe('getLeaderboardInsights', () => {
    it('should return leaderboard insights', async () => {
      // Setup
      const mockInsights = {
        trends: 'Your performance has improved by 15% over the last month.',
        recommendations: 'Focus on memory challenges to improve your overall rank.',
        achievements: 'You are in the top 5% of all users globally.'
      };
      mockReq.query = { timeframe: 'monthly' };
      mockLeaderboardCoordinator.getLeaderboardInsights.mockResolvedValue(mockInsights);
      
      // Execute
      await leaderboardController.getLeaderboardInsights(mockReq, mockRes);
      
      // Verify
      expect(mockLeaderboardCoordinator.getLeaderboardInsights).toHaveBeenCalledWith(
        'user-123',
        { timeframe: 'monthly' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockInsights
      });
    });
  });
});
