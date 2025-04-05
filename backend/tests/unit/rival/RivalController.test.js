'use strict';

import RivalController from '../../core/rival/controllers/RivalController.js';

/**
 * Unit tests for RivalController
 */
describe('RivalController', () => {
  let rivalController;
  let mockRivalCoordinator;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Create mock coordinator with all required methods
    mockRivalCoordinator = {
      generateRival: jest.fn(),
      getUserRivals: jest.fn(),
      getRivalById: jest.fn(),
      challengeRival: jest.fn(),
      updateRival: jest.fn(),
      deleteRival: jest.fn(),
      getRivalChallengeHistory: jest.fn()
    };
    
    // Create controller instance with mock coordinator
    rivalController = new RivalController({
      rivalCoordinator: mockRivalCoordinator
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
  
  describe('getUserRivals', () => {
    it('should return rivals for the current user', async () => {
      // Setup
      const mockRivals = [{ id: 'rival-1' }, { id: 'rival-2' }];
      mockRivalCoordinator.getUserRivals.mockResolvedValue(mockRivals);
      
      // Execute
      await rivalController.getUserRivals(mockReq, mockRes);
      
      // Verify
      expect(mockRivalCoordinator.getUserRivals).toHaveBeenCalledWith('user-123', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRivals
      });
    });
    
    it('should handle errors properly', async () => {
      // Setup
      const error = new Error('Test error');
      mockRivalCoordinator.getUserRivals.mockRejectedValue(error);
      
      // Execute
      await rivalController.getUserRivals(mockReq, mockRes);
      
      // Verify
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });
  });
  
  describe('generateRival', () => {
    it('should generate a new rival for the user', async () => {
      // Setup
      const mockRival = { id: 'new-rival-1', name: 'Test Rival' };
      mockReq.body = { options: { difficulty: 'medium' } };
      mockRivalCoordinator.generateRival.mockResolvedValue(mockRival);
      
      // Execute
      await rivalController.generateRival(mockReq, mockRes);
      
      // Verify
      expect(mockRivalCoordinator.generateRival).toHaveBeenCalledWith(
        'user-123', 
        { difficulty: 'medium' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRival
      });
    });
  });
  
  describe('getRivalById', () => {
    it('should return a specific rival by ID', async () => {
      // Setup
      const mockRival = { id: 'rival-123', name: 'Test Rival' };
      mockReq.params.id = 'rival-123';
      mockRivalCoordinator.getRivalById.mockResolvedValue(mockRival);
      
      // Execute
      await rivalController.getRivalById(mockReq, mockRes);
      
      // Verify
      expect(mockRivalCoordinator.getRivalById).toHaveBeenCalledWith('rival-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRival
      });
    });
  });
  
  describe('challengeRival', () => {
    it('should create a challenge against a rival', async () => {
      // Setup
      const mockChallenge = { id: 'challenge-123', rivalId: 'rival-123' };
      mockReq.params.id = 'rival-123';
      mockReq.body = { options: { focusArea: 'memory' } };
      mockRivalCoordinator.challengeRival.mockResolvedValue(mockChallenge);
      
      // Execute
      await rivalController.challengeRival(mockReq, mockRes);
      
      // Verify
      expect(mockRivalCoordinator.challengeRival).toHaveBeenCalledWith(
        'rival-123', 
        'user-123', 
        { focusArea: 'memory' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockChallenge
      });
    });
  });
  
  describe('updateRival', () => {
    it('should update a rival', async () => {
      // Setup
      const mockUpdatedRival = { id: 'rival-123', name: 'Updated Rival' };
      mockReq.params.id = 'rival-123';
      mockReq.body = { name: 'Updated Rival' };
      mockRivalCoordinator.updateRival.mockResolvedValue(mockUpdatedRival);
      
      // Execute
      await rivalController.updateRival(mockReq, mockRes);
      
      // Verify
      expect(mockRivalCoordinator.updateRival).toHaveBeenCalledWith(
        'rival-123', 
        'user-123', 
        { name: 'Updated Rival' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockUpdatedRival
      });
    });
  });
  
  describe('deleteRival', () => {
    it('should delete a rival', async () => {
      // Setup
      mockReq.params.id = 'rival-123';
      mockRivalCoordinator.deleteRival.mockResolvedValue(true);
      
      // Execute
      await rivalController.deleteRival(mockReq, mockRes);
      
      // Verify
      expect(mockRivalCoordinator.deleteRival).toHaveBeenCalledWith('rival-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Rival deleted successfully'
      });
    });
  });
  
  describe('getRivalChallengeHistory', () => {
    it('should return challenge history for a rival', async () => {
      // Setup
      const mockHistory = [{ id: 'challenge-1' }, { id: 'challenge-2' }];
      mockReq.params.id = 'rival-123';
      mockRivalCoordinator.getRivalChallengeHistory.mockResolvedValue(mockHistory);
      
      // Execute
      await rivalController.getRivalChallengeHistory(mockReq, mockRes);
      
      // Verify
      expect(mockRivalCoordinator.getRivalChallengeHistory).toHaveBeenCalledWith(
        'rival-123', 
        'user-123', 
        {}
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockHistory
      });
    });
  });
});
