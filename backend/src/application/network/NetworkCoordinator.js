'use strict';

import BaseCoordinator from '../BaseCoordinator.js';

/**
 * NetworkCoordinator class
 * 
 * Coordinates operations related to neural network progression, orchestrating the interaction
 * between controllers, services, and repositories while maintaining separation of concerns.
 */
class NetworkCoordinator extends BaseCoordinator {
  /**
   * Create a new NetworkCoordinator
   * 
   * @param {Object} dependencies - Dependencies required by the coordinator
   * @param {Object} dependencies.networkService - Service for managing networks
   * @param {Object} dependencies.userService - Service for user operations
   * @param {Object} dependencies.progressService - Service for progress operations
   * @param {Object} dependencies.rivalService - Service for rival operations
   * @param {Object} dependencies.promptService - Service for generating prompts
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor(dependencies = {}) {
    super({ name: 'NetworkCoordinator', logger: dependencies.logger });
    
    this.validateDependencies(dependencies, [
      'networkService',
      'userService',
      'progressService',
      'rivalService',
      'promptService'
    ]);
    
    this.networkService = dependencies.networkService;
    this.userService = dependencies.userService;
    this.progressService = dependencies.progressService;
    this.rivalService = dependencies.rivalService;
    this.promptService = dependencies.promptService;
  }
  
  /**
   * Get user's neural network
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Network data
   */
  async getUserNetwork(userId, options = {}) {
    return this.executeOperation(async () => {
      return this.networkService.getUserNetwork(userId, options);
    }, 'getUserNetwork', { userId, options });
  }
  
  /**
   * Get network growth over time
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options (timeframe, focusArea)
   * @returns {Promise<Object>} Network growth data
   */
  async getNetworkGrowth(userId, options = {}) {
    return this.executeOperation(async () => {
      return this.networkService.getNetworkGrowth(userId, options);
    }, 'getNetworkGrowth', { userId, options });
  }
  
  /**
   * Get network node details
   * 
   * @param {string} nodeId - ID of the node
   * @param {string} userId - ID of the user (for authorization)
   * @returns {Promise<Object>} Node details
   */
  async getNodeDetails(nodeId, userId) {
    return this.executeOperation(async () => {
      const node = await this.networkService.getNodeById(nodeId);
      
      // Verify ownership
      if (node.userId !== userId) {
        throw new Error('Unauthorized access to network node');
      }
      
      return node;
    }, 'getNodeDetails', { nodeId, userId });
  }
  
  /**
   * Get network connection details
   * 
   * @param {string} connectionId - ID of the connection
   * @param {string} userId - ID of the user (for authorization)
   * @returns {Promise<Object>} Connection details
   */
  async getConnectionDetails(connectionId, userId) {
    return this.executeOperation(async () => {
      const connection = await this.networkService.getConnectionById(connectionId);
      
      // Verify ownership
      if (connection.userId !== userId) {
        throw new Error('Unauthorized access to network connection');
      }
      
      return connection;
    }, 'getConnectionDetails', { connectionId, userId });
  }
  
  /**
   * Get network insights and recommendations
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Network insights
   */
  async getNetworkInsights(userId, options = {}) {
    return this.executeOperation(async () => {
      // Get user data
      const user = await this.userService.getUserById(userId);
      
      // Get network data
      const network = await this.networkService.getUserNetwork(userId);
      
      // Get progress history
      const progressHistory = await this.progressService.getUserProgressHistory(userId, options);
      
      // Generate insights
      const prompt = await this.promptService.createPrompt({
        type: 'network_insight',
        user,
        network,
        progressHistory
      });
      
      return this.networkService.generateNetworkInsights(userId, prompt);
    }, 'getNetworkInsights', { userId, options });
  }
  
  /**
   * Compare network with rival
   * 
   * @param {string} rivalId - ID of the rival
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Comparison data
   */
  async compareWithRival(rivalId, userId) {
    return this.executeOperation(async () => {
      // Get user data
      const user = await this.userService.getUserById(userId);
      
      // Get rival data
      const rival = await this.rivalService.getRivalById(rivalId);
      
      // Verify ownership
      if (rival.userId !== userId) {
        throw new Error('Unauthorized access to rival');
      }
      
      // Get user's network
      const userNetwork = await this.networkService.getUserNetwork(userId);
      
      // Get rival's network
      const rivalNetwork = await this.networkService.getRivalNetwork(rivalId);
      
      // Generate comparison
      const prompt = await this.promptService.createPrompt({
        type: 'network_comparison',
        user,
        userNetwork,
        rival,
        rivalNetwork
      });
      
      return this.networkService.compareNetworks(userId, rivalId, prompt);
    }, 'compareWithRival', { rivalId, userId });
  }
  
  /**
   * Get network statistics
   * 
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats(userId) {
    return this.executeOperation(async () => {
      return this.networkService.getNetworkStats(userId);
    }, 'getNetworkStats', { userId });
  }
  
  /**
   * Update network visualization preferences
   * 
   * @param {string} userId - ID of the user
   * @param {Object} preferences - Visualization preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateNetworkPreferences(userId, preferences = {}) {
    return this.executeOperation(async () => {
      return this.networkService.updateNetworkPreferences(userId, preferences);
    }, 'updateNetworkPreferences', { userId, preferences });
  }
}

export default NetworkCoordinator;
