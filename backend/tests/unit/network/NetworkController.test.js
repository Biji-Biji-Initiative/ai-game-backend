'use strict';

import NetworkController from '../../core/network/controllers/NetworkController.js';

/**
 * Unit tests for NetworkController
 */
describe('NetworkController', () => {
  let networkController;
  let mockNetworkCoordinator;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Create mock coordinator with all required methods
    mockNetworkCoordinator = {
      getUserNetwork: jest.fn(),
      getNetworkGrowth: jest.fn(),
      getNodeDetails: jest.fn(),
      getConnectionDetails: jest.fn(),
      getNetworkInsights: jest.fn(),
      compareWithRival: jest.fn(),
      getNetworkStats: jest.fn(),
      updateNetworkPreferences: jest.fn()
    };
    
    // Create controller instance with mock coordinator
    networkController = new NetworkController({
      networkCoordinator: mockNetworkCoordinator
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
  
  describe('getUserNetwork', () => {
    it('should return the user network', async () => {
      // Setup
      const mockNetwork = {
        userId: 'user-123',
        nodes: [
          { id: 'node-1', type: 'memory', strength: 0.8 },
          { id: 'node-2', type: 'logic', strength: 0.6 }
        ],
        connections: [
          { id: 'conn-1', sourceId: 'node-1', targetId: 'node-2', strength: 0.5 }
        ]
      };
      mockNetworkCoordinator.getUserNetwork.mockResolvedValue(mockNetwork);
      
      // Execute
      await networkController.getUserNetwork(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.getUserNetwork).toHaveBeenCalledWith('user-123', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockNetwork
      });
    });
    
    it('should handle errors properly', async () => {
      // Setup
      const error = new Error('Test error');
      mockNetworkCoordinator.getUserNetwork.mockRejectedValue(error);
      
      // Execute
      await networkController.getUserNetwork(mockReq, mockRes);
      
      // Verify
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });
  });
  
  describe('getNetworkGrowth', () => {
    it('should return network growth data', async () => {
      // Setup
      const mockGrowth = {
        timeframe: 'last-3-months',
        dataPoints: [
          { date: '2025-01-01', overallStrength: 0.5 },
          { date: '2025-02-01', overallStrength: 0.6 },
          { date: '2025-03-01', overallStrength: 0.7 }
        ],
        growthRate: 0.2,
        focusAreas: {
          memory: { start: 0.4, end: 0.7, growth: 0.3 },
          logic: { start: 0.6, end: 0.7, growth: 0.1 }
        }
      };
      mockReq.query = { timeframe: 'last-3-months' };
      mockNetworkCoordinator.getNetworkGrowth.mockResolvedValue(mockGrowth);
      
      // Execute
      await networkController.getNetworkGrowth(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.getNetworkGrowth).toHaveBeenCalledWith(
        'user-123',
        { timeframe: 'last-3-months' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockGrowth
      });
    });
  });
  
  describe('getNodeDetails', () => {
    it('should return details for a specific node', async () => {
      // Setup
      const mockNode = {
        id: 'node-123',
        userId: 'user-123',
        type: 'memory',
        strength: 0.8,
        growthHistory: [
          { date: '2025-01-01', strength: 0.5 },
          { date: '2025-02-01', strength: 0.6 },
          { date: '2025-03-01', strength: 0.8 }
        ],
        relatedChallenges: [
          { id: 'challenge-1', name: 'Memory Master', score: 95 }
        ]
      };
      mockReq.params.nodeId = 'node-123';
      mockNetworkCoordinator.getNodeDetails.mockResolvedValue(mockNode);
      
      // Execute
      await networkController.getNodeDetails(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.getNodeDetails).toHaveBeenCalledWith('node-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockNode
      });
    });
  });
  
  describe('getConnectionDetails', () => {
    it('should return details for a specific connection', async () => {
      // Setup
      const mockConnection = {
        id: 'conn-123',
        userId: 'user-123',
        sourceId: 'node-1',
        targetId: 'node-2',
        strength: 0.7,
        growthHistory: [
          { date: '2025-01-01', strength: 0.3 },
          { date: '2025-02-01', strength: 0.5 },
          { date: '2025-03-01', strength: 0.7 }
        ],
        relatedChallenges: [
          { id: 'challenge-2', name: 'Connection Builder', score: 88 }
        ]
      };
      mockReq.params.connectionId = 'conn-123';
      mockNetworkCoordinator.getConnectionDetails.mockResolvedValue(mockConnection);
      
      // Execute
      await networkController.getConnectionDetails(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.getConnectionDetails).toHaveBeenCalledWith('conn-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockConnection
      });
    });
  });
  
  describe('getNetworkInsights', () => {
    it('should return insights for the user network', async () => {
      // Setup
      const mockInsights = {
        strengths: ['Strong memory capabilities', 'Good pattern recognition'],
        weaknesses: ['Logic could be improved', 'Spatial reasoning needs work'],
        recommendations: [
          'Focus on logic puzzles to strengthen connections',
          'Try spatial challenges to develop weaker nodes'
        ],
        growthOpportunities: {
          shortTerm: 'Complete 5 logic challenges this week',
          mediumTerm: 'Improve spatial reasoning by 20% in the next month',
          longTerm: 'Develop a more balanced network over the next 3 months'
        }
      };
      mockReq.query = { detailed: true };
      mockNetworkCoordinator.getNetworkInsights.mockResolvedValue(mockInsights);
      
      // Execute
      await networkController.getNetworkInsights(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.getNetworkInsights).toHaveBeenCalledWith(
        'user-123',
        { detailed: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockInsights
      });
    });
  });
  
  describe('compareWithRival', () => {
    it('should return comparison between user and rival networks', async () => {
      // Setup
      const mockComparison = {
        userStrengths: ['Memory', 'Pattern recognition'],
        rivalStrengths: ['Logic', 'Spatial reasoning'],
        overallComparison: {
          user: { overallStrength: 0.7 },
          rival: { overallStrength: 0.75 },
          difference: -0.05
        },
        nodeComparisons: [
          {
            type: 'memory',
            user: 0.8,
            rival: 0.6,
            difference: 0.2
          },
          {
            type: 'logic',
            user: 0.6,
            rival: 0.9,
            difference: -0.3
          }
        ],
        recommendations: [
          'Focus on improving logic to match your rival',
          'Maintain your strong memory advantage'
        ]
      };
      mockReq.params.rivalId = 'rival-123';
      mockNetworkCoordinator.compareWithRival.mockResolvedValue(mockComparison);
      
      // Execute
      await networkController.compareWithRival(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.compareWithRival).toHaveBeenCalledWith('rival-123', 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockComparison
      });
    });
  });
  
  describe('getNetworkStats', () => {
    it('should return network statistics', async () => {
      // Setup
      const mockStats = {
        overallStrength: 0.7,
        nodeCount: 8,
        connectionCount: 12,
        strongestNode: { type: 'memory', strength: 0.9 },
        weakestNode: { type: 'spatial', strength: 0.4 },
        averageNodeStrength: 0.65,
        averageConnectionStrength: 0.55,
        networkDensity: 0.42,
        growthRate: {
          overall: 0.15,
          byNode: {
            memory: 0.2,
            logic: 0.1,
            spatial: 0.15
          }
        }
      };
      mockNetworkCoordinator.getNetworkStats.mockResolvedValue(mockStats);
      
      // Execute
      await networkController.getNetworkStats(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.getNetworkStats).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockStats
      });
    });
  });
  
  describe('updateNetworkPreferences', () => {
    it('should update network visualization preferences', async () => {
      // Setup
      const mockPreferences = {
        layout: 'force-directed',
        theme: 'dark',
        showLabels: true,
        highlightStrengths: true,
        animationSpeed: 'medium'
      };
      mockReq.body = mockPreferences;
      mockNetworkCoordinator.updateNetworkPreferences.mockResolvedValue(mockPreferences);
      
      // Execute
      await networkController.updateNetworkPreferences(mockReq, mockRes);
      
      // Verify
      expect(mockNetworkCoordinator.updateNetworkPreferences).toHaveBeenCalledWith(
        'user-123',
        mockPreferences
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockPreferences
      });
    });
  });
});
