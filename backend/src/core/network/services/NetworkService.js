import { NetworkSchema, networkNodeSchema, networkConnectionSchema, networkProgressSchema } from '../schemas/NetworkSchema.js';
import { getUserNetworkSchema, updateUserNetworkSchema, getNetworkStatsSchema, getNetworkProgressSchema } from '../schemas/networkApiSchemas.js';
'use strict';

/**
 * Service for managing neural network progression
 * Handles network visualization, updates, and insights
 */
class NetworkService {
  /**
   * Create a new NetworkService
   * @param {Object} config - Configuration for the service
   * @param {Object} config.repository - Repository for network persistence
   * @param {Object} config.aiModule - AI module for network insights
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.repository = config.repository;
    this.aiModule = config.aiModule;
    this.logger = config.logger || console;
  }

  /**
   * Get a user's neural network
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} User's neural network
   */
  async getUserNetwork(userId) {
    try {
      // Validate parameters
      const validatedParams = getUserNetworkSchema.parse({ userId });
      
      // Get network from repository
      const network = await this.repository.getNetworkByUserId(validatedParams.userId);
      
      // If no network exists, create a new one
      if (!network) {
        const newNetwork = await this.initializeNetwork(validatedParams.userId);
        return newNetwork;
      }
      
      return network;
    } catch (error) {
      this.logger.error('Error getting user network', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize a new neural network for a user
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Initialized network
   * @private
   */
  async initializeNetwork(userId) {
    try {
      // Get user traits if available
      const userTraits = await this.repository.getUserTraits(userId);
      
      // Import prompt builder
      const { NetworkPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new NetworkPromptBuilder();
      
      // Build prompt for network initialization
      const prompt = promptBuilder.buildNetworkInitializationPrompt({
        userId,
        userTraits
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId,
        contextType: 'network',
        contextId: `initialization-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let networkData;
      try {
        networkData = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing network initialization response', {
          userId,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse network initialization response');
      }
      
      // Validate network data
      const validatedNetwork = NetworkSchema.parse({
        userId,
        nodes: networkData.nodes,
        connections: networkData.connections,
        overallLevel: networkData.overallLevel || 1,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Save network to repository
      const savedNetwork = await this.repository.saveNetwork(validatedNetwork);
      
      this.logger.info('Network initialized', {
        userId,
        networkId: savedNetwork.id
      });
      
      return savedNetwork;
    } catch (error) {
      this.logger.error('Error initializing network', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update network progress based on challenge results
   * @param {Object} params - Parameters for progress update
   * @param {string} params.userId - ID of the user
   * @param {Object} params.challengeResults - Results from the completed challenge
   * @returns {Promise<Object>} Updated network
   */
  async updateNetworkProgress(params) {
    try {
      // Validate parameters
      const validatedParams = updateUserNetworkSchema.parse(params);
      
      // Get user's network
      const network = await this.getUserNetwork(validatedParams.userId);
      
      // Import prompt builder
      const { NetworkPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new NetworkPromptBuilder();
      
      // Build prompt for network update
      const prompt = promptBuilder.buildNetworkUpdatePrompt({
        userId: validatedParams.userId,
        network,
        challengeResults: validatedParams.challengeResults
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId: validatedParams.userId,
        contextType: 'network',
        contextId: `update-${network.id}-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let updateData;
      try {
        updateData = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing network update response', {
          userId: validatedParams.userId,
          networkId: network.id,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse network update response');
      }
      
      // Apply updates to network
      const updatedNetwork = {
        ...network,
        nodes: updateData.nodes || network.nodes,
        connections: updateData.connections || network.connections,
        overallLevel: updateData.overallLevel || network.overallLevel,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save updated network
      const savedNetwork = await this.repository.saveNetwork(updatedNetwork);
      
      // Record progress history
      await this.repository.saveNetworkProgress({
        userId: validatedParams.userId,
        previousLevel: network.overallLevel,
        currentLevel: updatedNetwork.overallLevel,
        levelProgress: updateData.levelProgress || 0,
        recentlyUnlockedNodes: updateData.recentlyUnlockedNodes || [],
        recentlyActivatedConnections: updateData.recentlyActivatedConnections || [],
        timestamp: new Date().toISOString()
      });
      
      this.logger.info('Network progress updated', {
        userId: validatedParams.userId,
        networkId: network.id,
        challengeId: validatedParams.challengeResults.challengeId
      });
      
      return savedNetwork;
    } catch (error) {
      this.logger.error('Error updating network progress', {
        userId: params.userId,
        challengeId: params.challengeResults?.challengeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get network statistics
   * @param {Object} params - Parameters for stats retrieval
   * @param {string} params.userId - ID of the user
   * @param {boolean} [params.includeHistory=false] - Whether to include historical stats
   * @param {string} [params.timeframe='all_time'] - Time period for historical stats
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats(params) {
    try {
      // Validate parameters
      const validatedParams = getNetworkStatsSchema.parse(params);
      
      // Get user's network
      const network = await this.getUserNetwork(validatedParams.userId);
      
      // Calculate basic stats
      const stats = this.calculateNetworkStats(network);
      
      // Include history if requested
      if (validatedParams.includeHistory) {
        const history = await this.repository.getNetworkStatsHistory(
          validatedParams.userId,
          validatedParams.timeframe
        );
        
        return {
          ...stats,
          history
        };
      }
      
      return stats;
    } catch (error) {
      this.logger.error('Error getting network stats', {
        userId: params.userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate statistics for a network
   * @param {Object} network - Neural network
   * @returns {Object} Network statistics
   * @private
   */
  calculateNetworkStats(network) {
    // Count total and unlocked nodes
    const totalNodes = network.nodes.length;
    const unlockedNodes = network.nodes.filter(node => node.unlocked).length;
    
    // Calculate average node level
    const nodeLevels = network.nodes.map(node => node.level);
    const averageNodeLevel = nodeLevels.reduce((sum, level) => sum + level, 0) / totalNodes;
    
    // Find dominant and weakest domains
    const domainLevels = {};
    network.nodes.forEach(node => {
      if (!domainLevels[node.domain]) {
        domainLevels[node.domain] = [];
      }
      domainLevels[node.domain].push(node.level);
    });
    
    const domainAverages = {};
    Object.entries(domainLevels).forEach(([domain, levels]) => {
      domainAverages[domain] = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    });
    
    const domains = Object.keys(domainAverages);
    const dominantDomain = domains.reduce((a, b) => domainAverages[a] > domainAverages[b] ? a : b);
    const weakestDomain = domains.reduce((a, b) => domainAverages[a] < domainAverages[b] ? a : b);
    
    // Count total and active connections
    const totalConnections = network.connections.length;
    const activeConnections = network.connections.filter(conn => conn.active).length;
    
    // Calculate network density
    const maxPossibleConnections = totalNodes * (totalNodes - 1) / 2;
    const networkDensity = maxPossibleConnections > 0 ? totalConnections / maxPossibleConnections : 0;
    
    return {
      totalNodes,
      unlockedNodes,
      averageNodeLevel,
      dominantDomain,
      weakestDomain,
      totalConnections,
      activeConnections,
      networkDensity
    };
  }

  /**
   * Get network progress history
   * @param {Object} params - Parameters for progress retrieval
   * @param {string} params.userId - ID of the user
   * @param {number} [params.limit=10] - Maximum number of progress records to return
   * @returns {Promise<Array<Object>>} Network progress history
   */
  async getNetworkProgress(params) {
    try {
      // Validate parameters
      const validatedParams = getNetworkProgressSchema.parse(params);
      
      // Get progress history from repository
      const progressHistory = await this.repository.getNetworkProgressHistory(
        validatedParams.userId,
        validatedParams.limit
      );
      
      return progressHistory;
    } catch (error) {
      this.logger.error('Error getting network progress', {
        userId: params.userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get insights about a user's neural network
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Network insights
   */
  async getNetworkInsights(userId) {
    try {
      // Get user's network
      const network = await this.getUserNetwork(userId);
      
      // Get network stats
      const stats = this.calculateNetworkStats(network);
      
      // Get progress history
      const progressHistory = await this.repository.getNetworkProgressHistory(userId, 5);
      
      // Import prompt builder
      const { NetworkPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new NetworkPromptBuilder();
      
      // Build prompt for network insights
      const prompt = promptBuilder.buildNetworkInsightsPrompt({
        userId,
        network,
        stats,
        progressHistory
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId,
        contextType: 'network',
        contextId: `insights-${network.id}-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let insights;
      try {
        insights = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing network insights response', {
          userId,
          networkId: network.id,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse network insights response');
      }
      
      return {
        network,
        stats,
        insights
      };
    } catch (error) {
      this.logger.error('Error getting network insights', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get growth recommendations for a user's network
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Growth recommendations
   */
  async getGrowthRecommendations(userId) {
    try {
      // Get user's network
      const network = await this.getUserNetwork(userId);
      
      // Import prompt builder
      const { NetworkPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new NetworkPromptBuilder();
      
      // Build prompt for growth recommendations
      const prompt = promptBuilder.buildGrowthRecommendationsPrompt({
        userId,
        network
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId,
        contextType: 'network',
        contextId: `growth-${network.id}-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let recommendations;
      try {
        recommendations = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing growth recommendations response', {
          userId,
          networkId: network.id,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse growth recommendations response');
      }
      
      return {
        network,
        recommendations
      };
    } catch (error) {
      this.logger.error('Error getting growth recommendations', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Compare networks between user and rival
   * @param {string} userId - ID of the user
   * @param {string} rivalId - ID of the rival
   * @returns {Promise<Object>} Network comparison
   */
  async compareNetworks(userId, rivalId) {
    try {
      // Get user's network
      const userNetwork = await this.getUserNetwork(userId);
      
      // Get rival's network
      const rivalNetwork = await this.repository.getRivalNetwork(rivalId);
      
      if (!rivalNetwork) {
        throw new Error(`Rival network not found for ID: ${rivalId}`);
      }
      
      // Import prompt builder
      const { NetworkPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new NetworkPromptBuilder();
      
      // Build prompt for network comparison
      const prompt = promptBuilder.buildNetworkComparisonPrompt({
        userId,
        rivalId,
        userNetwork,
        rivalNetwork
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId,
        contextType: 'network',
        contextId: `comparison-${userNetwork.id}-${rivalNetwork.id}`,
        prompt
      });
      
      // Parse AI response
      let comparison;
      try {
        comparison = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing network comparison response', {
          userId,
          rivalId,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse network comparison response');
      }
      
      return {
        userNetwork,
        rivalNetwork,
        comparison
      };
    } catch (error) {
      this.logger.error('Error comparing networks', {
        userId,
        rivalId,
        error: error.message
      });
      throw error;
    }
  }
}

export default NetworkService;
