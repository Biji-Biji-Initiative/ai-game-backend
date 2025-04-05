import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
'use strict';

/**
 * Repository for neural network persistence using Supabase
 * Handles storage and retrieval of network entities
 */
class SupabaseNetworkRepository {
  /**
   * Create a new SupabaseNetworkRepository
   * @param {Object} config - Configuration for the repository
   * @param {string} config.supabaseUrl - Supabase URL
   * @param {string} config.supabaseKey - Supabase API key
   * @param {string} [config.networksTable='neural_networks'] - Table name for networks
   * @param {string} [config.userTraitsTable='user_traits'] - Table name for user traits
   * @param {string} [config.performanceTable='user_performance'] - Table name for performance history
   * @param {string} [config.rivalsTable='rivals'] - Table name for rivals
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.networksTable = config.networksTable || 'neural_networks';
    this.userTraitsTable = config.userTraitsTable || 'user_traits';
    this.performanceTable = config.performanceTable || 'user_performance';
    this.rivalsTable = config.rivalsTable || 'rivals';
    this.logger = config.logger || console;
  }

  /**
   * Get a network by user ID
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} User's network
   */
  async getNetworkByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.networksTable)
        .select('*')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting network by user ID', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Save a network
   * @param {Object} network - Network to save
   * @returns {Promise<Object>} Saved network
   */
  async saveNetwork(network) {
    try {
      // Ensure network has an ID
      if (!network.id) {
        network.id = uuidv4();
      }
      
      // Ensure timestamps are set
      if (!network.createdAt) {
        network.createdAt = new Date().toISOString();
      }
      network.updatedAt = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from(this.networksTable)
        .upsert(network, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error saving network', {
        networkId: network.id,
        userId: network.userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user traits for network initialization
   * @param {string} userId - ID of the user
   * @returns {Promise<Array<Object>>} User traits
   */
  async getUserTraits(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.userTraitsTable)
        .select('*')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      if (!data) {
        return [];
      }
      
      // Extract traits from data
      const traits = data.traits || [];
      
      return traits;
    } catch (error) {
      this.logger.error('Error getting user traits', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get user performance history
   * @param {string} userId - ID of the user
   * @returns {Promise<Array<Object>>} Performance history
   */
  async getUserPerformanceHistory(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.performanceTable)
        .select('*')
        .eq('userId', userId)
        .order('completedAt', { ascending: false })
        .limit(20);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      this.logger.error('Error getting user performance history', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a rival's network
   * @param {string} rivalId - ID of the rival
   * @returns {Promise<Object>} Rival's network
   */
  async getRivalNetwork(rivalId) {
    try {
      // First get the rival to get the userId
      const { data: rival, error: rivalError } = await this.supabase
        .from(this.rivalsTable)
        .select('*')
        .eq('id', rivalId)
        .single();
      
      if (rivalError) {
        throw rivalError;
      }
      
      if (!rival) {
        throw new Error(`Rival not found with ID: ${rivalId}`);
      }
      
      // Check if rival has a network property
      if (rival.network) {
        return rival.network;
      }
      
      // If not, create a synthetic network based on rival traits
      return {
        id: `synthetic-${rivalId}`,
        userId: rivalId,
        nodes: this.generateNodesFromRival(rival),
        connections: this.generateConnectionsFromRival(rival),
        stats: {
          overallProgress: rival.overallStrength || 50,
          cognitiveAreas: this.generateStatsFromRival(rival)
        },
        createdAt: rival.createdAt,
        updatedAt: rival.updatedAt || rival.createdAt
      };
    } catch (error) {
      this.logger.error('Error getting rival network', {
        rivalId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate network nodes from rival data
   * @param {Object} rival - Rival data
   * @returns {Array<Object>} Generated nodes
   * @private
   */
  generateNodesFromRival(rival) {
    const nodes = [];
    const traits = rival.traits || [];
    
    // Create nodes for each trait
    traits.forEach((trait, index) => {
      nodes.push({
        id: `node-${index}`,
        type: 'trait',
        label: trait.name,
        value: trait.value,
        x: Math.cos(index * (2 * Math.PI / traits.length)) * 100 + 150,
        y: Math.sin(index * (2 * Math.PI / traits.length)) * 100 + 150,
        size: 10 + (trait.value / 10),
        color: this.getColorForValue(trait.value)
      });
    });
    
    // Add central node
    nodes.push({
      id: 'central',
      type: 'central',
      label: rival.name,
      value: rival.overallStrength || 50,
      x: 150,
      y: 150,
      size: 20,
      color: '#FF5722'
    });
    
    return nodes;
  }

  /**
   * Generate network connections from rival data
   * @param {Object} rival - Rival data
   * @returns {Array<Object>} Generated connections
   * @private
   */
  generateConnectionsFromRival(rival) {
    const connections = [];
    const traits = rival.traits || [];
    
    // Connect each trait to central node
    traits.forEach((trait, index) => {
      connections.push({
        source: 'central',
        target: `node-${index}`,
        strength: trait.value / 100,
        color: this.getColorForValue(trait.value)
      });
    });
    
    // Connect some traits to each other
    for (let i = 0; i < traits.length; i++) {
      const nextIndex = (i + 1) % traits.length;
      connections.push({
        source: `node-${i}`,
        target: `node-${nextIndex}`,
        strength: 0.5,
        color: '#999999'
      });
    }
    
    return connections;
  }

  /**
   * Generate stats from rival data
   * @param {Object} rival - Rival data
   * @returns {Object} Generated stats
   * @private
   */
  generateStatsFromRival(rival) {
    const stats = {};
    const traits = rival.traits || [];
    
    // Group traits by category
    const categories = {};
    traits.forEach(trait => {
      const category = trait.category || 'general';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(trait);
    });
    
    // Calculate average for each category
    Object.keys(categories).forEach(category => {
      const categoryTraits = categories[category];
      const sum = categoryTraits.reduce((acc, trait) => acc + trait.value, 0);
      const average = sum / categoryTraits.length;
      
      stats[category] = {
        value: average,
        level: this.getLevelForValue(average)
      };
    });
    
    return stats;
  }

  /**
   * Get color for a value
   * @param {number} value - Value to get color for
   * @returns {string} Color in hex format
   * @private
   */
  getColorForValue(value) {
    if (value >= 80) {
      return '#4CAF50'; // Green
    } else if (value >= 60) {
      return '#8BC34A'; // Light green
    } else if (value >= 40) {
      return '#FFC107'; // Amber
    } else if (value >= 20) {
      return '#FF9800'; // Orange
    } else {
      return '#F44336'; // Red
    }
  }

  /**
   * Get level for a value
   * @param {number} value - Value to get level for
   * @returns {string} Level description
   * @private
   */
  getLevelForValue(value) {
    if (value >= 80) {
      return 'expert';
    } else if (value >= 60) {
      return 'advanced';
    } else if (value >= 40) {
      return 'intermediate';
    } else if (value >= 20) {
      return 'beginner';
    } else {
      return 'novice';
    }
  }
  
  /**
   * Save network progress
   * @param {Object} progress - Progress data to save
   * @returns {Promise<Object>} Saved progress
   */
  async saveNetworkProgress(progress) {
    try {
      // Ensure progress has an ID
      if (!progress.id) {
        progress.id = uuidv4();
      }
      
      // Ensure timestamp is set
      if (!progress.timestamp) {
        progress.timestamp = new Date().toISOString();
      }
      
      const { data, error } = await this.supabase
        .from('network_progress')
        .insert(progress)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error saving network progress', {
        userId: progress.userId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get network progress history
   * @param {string} userId - ID of the user
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array<Object>>} Progress history
   */
  async getNetworkProgressHistory(userId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('network_progress')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      this.logger.error('Error getting network progress history', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get network stats history
   * @param {string} userId - ID of the user
   * @param {string} timeframe - Time period for stats
   * @returns {Promise<Array<Object>>} Stats history
   */
  async getNetworkStatsHistory(userId, timeframe = 'all_time') {
    try {
      let query = this.supabase
        .from('network_stats')
        .select('*')
        .eq('userId', userId);
      
      // Apply timeframe filter
      if (timeframe !== 'all_time') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
          case 'year':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            break;
          default:
            startDate = new Date(0); // Beginning of time
        }
        
        query = query.gte('timestamp', startDate.toISOString());
      }
      
      const { data, error } = await query
        .order('timestamp', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      this.logger.error('Error getting network stats history', {
        userId,
        timeframe,
        error: error.message
      });
      throw error;
    }
  }
}

export default SupabaseNetworkRepository;
