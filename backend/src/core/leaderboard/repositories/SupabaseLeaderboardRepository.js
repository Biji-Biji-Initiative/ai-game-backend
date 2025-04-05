import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
'use strict';

/**
 * Repository for leaderboard persistence using Supabase
 * Handles storage and retrieval of leaderboard entries
 */
class SupabaseLeaderboardRepository {
  /**
   * Create a new SupabaseLeaderboardRepository
   * @param {Object} config - Configuration for the repository
   * @param {string} config.supabaseUrl - Supabase URL
   * @param {string} config.supabaseKey - Supabase API key
   * @param {string} [config.entriesTable='leaderboard_entries'] - Table name for leaderboard entries
   * @param {string} [config.userStatsTable='user_stats'] - Table name for user statistics
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.entriesTable = config.entriesTable || 'leaderboard_entries';
    this.userStatsTable = config.userStatsTable || 'user_stats';
    this.logger = config.logger || console;
  }

  /**
   * Get leaderboard data with filtering
   * @param {Object} params - Parameters for leaderboard retrieval
   * @param {string} [params.type] - Type of leaderboard to retrieve
   * @param {string} [params.timeframe='all_time'] - Time period for the leaderboard
   * @param {string} [params.focusArea] - Focus area to filter by
   * @param {string} [params.challengeId] - Challenge to filter by
   * @param {number} [params.limit=20] - Maximum number of entries to return
   * @param {number} [params.offset=0] - Number of entries to skip
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(params = {}) {
    try {
      // Build query
      let query = this.supabase
        .from(this.entriesTable)
        .select('*');
      
      // Apply filters
      if (params.type) {
        query = query.eq('type', params.type);
      }
      
      if (params.timeframe) {
        query = query.eq('timeframe', params.timeframe);
      }
      
      if (params.focusArea) {
        query = query.eq('focusArea', params.focusArea);
      }
      
      if (params.challengeId) {
        query = query.eq('challengeId', params.challengeId);
      }
      
      // Apply pagination
      query = query
        .order('score', { ascending: false })
        .range(
          params.offset || 0,
          (params.offset || 0) + (params.limit || 20) - 1
        );
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Get total count
      const { count, error: countError } = await this.supabase
        .from(this.entriesTable)
        .select('*', { count: 'exact', head: true })
        .eq('type', params.type || 'global')
        .eq('timeframe', params.timeframe || 'all_time');
      
      if (countError) {
        throw countError;
      }
      
      // Add rank to entries
      const entriesWithRank = data.map((entry, index) => ({
        ...entry,
        rank: (params.offset || 0) + index + 1
      }));
      
      // Construct leaderboard
      const leaderboard = {
        id: uuidv4(),
        title: this.getLeaderboardTitle(params),
        description: this.getLeaderboardDescription(params),
        entries: entriesWithRank,
        totalEntries: count,
        lastUpdated: new Date().toISOString(),
        type: params.type || 'global',
        timeframe: params.timeframe || 'all_time',
        focusAreaId: params.focusArea,
        challengeId: params.challengeId
      };
      
      return leaderboard;
    } catch (error) {
      this.logger.error('Error getting leaderboard', {
        type: params.type,
        timeframe: params.timeframe,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Submit a score to the leaderboard
   * @param {Object} entry - Leaderboard entry to submit
   * @returns {Promise<Object>} Submission result with leaderboard position
   */
  async submitScore(entry) {
    try {
      // Ensure entry has an ID
      if (!entry.id) {
        entry.id = uuidv4();
      }
      
      // Determine leaderboard type and timeframe
      const type = entry.challengeId ? 'challenge' : (entry.focusArea ? 'focus' : 'global');
      const timeframe = 'all_time'; // Default timeframe
      
      // Add type and timeframe to entry
      const fullEntry = {
        ...entry,
        type,
        timeframe,
        createdAt: new Date().toISOString()
      };
      
      // Save entry
      const { data, error } = await this.supabase
        .from(this.entriesTable)
        .upsert(fullEntry, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Get user's rank
      const { data: rankData, error: rankError } = await this.supabase
        .from(this.entriesTable)
        .select('id')
        .eq('type', type)
        .eq('timeframe', timeframe)
        .gte('score', entry.score)
        .order('score', { ascending: false });
      
      if (rankError) {
        throw rankError;
      }
      
      const rank = rankData.findIndex(item => item.id === entry.id) + 1;
      
      // Get total entries
      const { count, error: countError } = await this.supabase
        .from(this.entriesTable)
        .select('*', { count: 'exact', head: true })
        .eq('type', type)
        .eq('timeframe', timeframe);
      
      if (countError) {
        throw countError;
      }
      
      // Calculate percentile
      const percentile = Math.round((1 - (rank / count)) * 100);
      
      return {
        entry: data,
        rank,
        totalEntries: count,
        percentile
      };
    } catch (error) {
      this.logger.error('Error submitting score', {
        userId: entry.userId,
        score: entry.score,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a user's position on a leaderboard
   * @param {Object} params - Parameters for position retrieval
   * @param {string} params.userId - ID of the user
   * @param {string} [params.type='global'] - Type of leaderboard
   * @param {string} [params.timeframe='all_time'] - Time period
   * @param {string} [params.challengeId] - Challenge ID
   * @param {string} [params.focusArea] - Focus area
   * @param {boolean} [params.includeNeighbors=true] - Include entries above and below
   * @param {number} [params.neighborCount=3] - Number of neighbors
   * @returns {Promise<Object>} User's position and neighboring entries
   */
  async getUserPosition(params) {
    try {
      // Build query to get user's entry
      let query = this.supabase
        .from(this.entriesTable)
        .select('*')
        .eq('userId', params.userId)
        .eq('type', params.type || 'global')
        .eq('timeframe', params.timeframe || 'all_time');
      
      if (params.challengeId) {
        query = query.eq('challengeId', params.challengeId);
      }
      
      if (params.focusArea) {
        query = query.eq('focusArea', params.focusArea);
      }
      
      // Execute query
      const { data, error } = await query.order('createdAt', { ascending: false }).limit(1);
      
      if (error) {
        throw error;
      }
      
      // If user has no entry, return default position
      if (!data || data.length === 0) {
        return {
          rank: null,
          score: 0,
          percentile: 0,
          entry: null,
          neighbors: {
            above: [],
            below: []
          }
        };
      }
      
      const userEntry = data[0];
      
      // Get user's rank
      const { data: rankData, error: rankError } = await this.supabase
        .from(this.entriesTable)
        .select('id')
        .eq('type', params.type || 'global')
        .eq('timeframe', params.timeframe || 'all_time')
        .gte('score', userEntry.score)
        .order('score', { ascending: false });
      
      if (rankError) {
        throw rankError;
      }
      
      const rank = rankData.findIndex(item => item.id === userEntry.id) + 1;
      
      // Get total entries
      const { count, error: countError } = await this.supabase
        .from(this.entriesTable)
        .select('*', { count: 'exact', head: true })
        .eq('type', params.type || 'global')
        .eq('timeframe', params.timeframe || 'all_time');
      
      if (countError) {
        throw countError;
      }
      
      // Calculate percentile
      const percentile = Math.round((1 - (rank / count)) * 100);
      
      // Get neighboring entries if requested
      let neighbors = {
        above: [],
        below: []
      };
      
      if (params.includeNeighbors) {
        const neighborCount = params.neighborCount || 3;
        
        // Get entries above user
        const { data: aboveData, error: aboveError } = await this.supabase
          .from(this.entriesTable)
          .select('*')
          .eq('type', params.type || 'global')
          .eq('timeframe', params.timeframe || 'all_time')
          .gt('score', userEntry.score)
          .order('score', { ascending: true })
          .limit(neighborCount);
        
        if (!aboveError && aboveData) {
          neighbors.above = aboveData.reverse().map((entry, index) => ({
            ...entry,
            rank: rank - (aboveData.length - index)
          }));
        }
        
        // Get entries below user
        const { data: belowData, error: belowError } = await this.supabase
          .from(this.entriesTable)
          .select('*')
          .eq('type', params.type || 'global')
          .eq('timeframe', params.timeframe || 'all_time')
          .lt('score', userEntry.score)
          .order('score', { ascending: false })
          .limit(neighborCount);
        
        if (!belowError && belowData) {
          neighbors.below = belowData.map((entry, index) => ({
            ...entry,
            rank: rank + index + 1
          }));
        }
      }
      
      return {
        rank,
        score: userEntry.score,
        percentile,
        entry: {
          ...userEntry,
          rank,
          isCurrentUser: true
        },
        neighbors
      };
    } catch (error) {
      this.logger.error('Error getting user position', {
        userId: params.userId,
        type: params.type,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get top performers on a leaderboard
   * @param {Object} params - Parameters for top performers retrieval
   * @param {string} [params.type='global'] - Type of leaderboard
   * @param {string} [params.timeframe='all_time'] - Time period
   * @param {string} [params.challengeId] - Challenge ID
   * @param {string} [params.focusArea] - Focus area
   * @param {number} [params.limit=5] - Number of top performers to retrieve
   * @returns {Promise<Array<Object>>} Top performers
   */
  async getTopPerformers(params = {}) {
    try {
      // Build query
      let query = this.supabase
        .from(this.entriesTable)
        .select('*')
        .eq('type', params.type || 'global')
        .eq('timeframe', params.timeframe || 'all_time');
      
      if (params.challengeId) {
        query = query.eq('challengeId', params.challengeId);
      }
      
      if (params.focusArea) {
        query = query.eq('focusArea', params.focusArea);
      }
      
      // Execute query
      const { data, error } = await query
        .order('score', { ascending: false })
        .limit(params.limit || 5);
      
      if (error) {
        throw error;
      }
      
      // Add rank to entries
      const topPerformers = data.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      return topPerformers;
    } catch (error) {
      this.logger.error('Error getting top performers', {
        type: params.type,
        timeframe: params.timeframe,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user performance data
   * @param {string} userId - ID of the user
   * @param {string} [challengeId] - ID of the challenge
   * @returns {Promise<Object>} User performance data
   */
  async getUserPerformance(userId, challengeId) {
    try {
      if (challengeId) {
        // Get user's entry for specific challenge
        const { data, error } = await this.supabase
          .from(this.entriesTable)
          .select('*')
          .eq('userId', userId)
          .eq('challengeId', challengeId)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }
        
        if (!data) {
          return {
            userId,
            challengeId,
            score: 0,
            completionTime: null,
            attempts: 0
          };
        }
        
        return {
          userId,
          challengeId,
          score: data.score,
          completionTime: data.metadata?.completionTime,
          attempts: data.metadata?.attempts || 1
        };
      } else {
        // Get user's overall stats
        const { data, error } = await this.supabase
          .from(this.userStatsTable)
          .select('*')
          .eq('userId', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }
        
        if (!data) {
          return {
            userId,
            averageScore: 0,
            totalChallenges: 0,
            bestScore: 0,
            worstScore: 0
          };
        }
        
        return {
          userId,
          averageScore: data.average_score || 0,
          totalChallenges: data.completed_challenges || 0,
          bestScore: data.best_score || 0,
          worstScore: data.worst_score || 0,
          focusAreas: data.focus_areas || []
        };
      }
    } catch (error) {
      this.logger.error('Error getting user performance', {
        userId,
        challengeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get average performance data
   * @param {string} [challengeId] - ID of the challenge
   * @returns {Promise<Object>} Average performance data
   */
  async getAveragePerformance(challengeId) {
    try {
      if (challengeId) {
        // Get average for specific challenge
        const { data, error } = await this.supabase
          .from(this.entriesTable)
          .select('score')
          .eq('challengeId', challengeId);
        
        if (error) {
          throw error;
        }
        
        if (!data || data.length === 0) {
          return {
            challengeId,
            averageScore: 0,
            totalEntries: 0
          };
        }
        
        const scores = data.map(entry => entry.score);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        return {
          challengeId,
          averageScore,
          totalEntries: scores.length
        };
      } else {
        // Get overall average from stats
        const { data, error } = await this.supabase
          .from(this.userStatsTable)
          .select('average_score, completed_challenges');
        
        if (error) {
          throw error;
        }
        
        if (!data || data.length === 0) {
          return {
            averageScore: 0,
            totalUsers: 0,
            totalChallenges: 0
          };
        }
        
        const validData = data.filter(entry => entry.average_score !== null);
        
        if (validData.length === 0) {
          return {
            averageScore: 0,
            totalUsers: 0,
            totalChallenges: 0
          };
        }
        
        const averageScore = validData.reduce((sum, entry) => sum + entry.average_score, 0) / validData.length;
        const totalChallenges = validData.reduce((sum, entry) => sum + (entry.completed_challenges || 0), 0);
        
        return {
          averageScore,
          totalUsers: validData.length,
          totalChallenges
        };
      }
    } catch (error) {
      this.logger.error('Error getting average performance', {
        challengeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get top performance data
   * @param {string} [challengeId] - ID of the challenge
   * @returns {Promise<Object>} Top performance data
   */
  async getTopPerformance(challengeId) {
    try {
      if (challengeId) {
        // Get top score for specific challenge
        const { data, error } = await this.supabase
          .from(this.entriesTable)
          .select('*')
          .eq('challengeId', challengeId)
          .order('score', { ascending: false })
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }
        
        if (!data) {
          return {
            challengeId,
            topScore: 0,
            completionTime: null
          };
        }
        
        return {
          challengeId,
          topScore: data.score,
          completionTime: data.metadata?.completionTime,
          username: data.username
        };
      } else {
        // Get overall top performers
        const { data, error } = await this.supabase
          .from(this.userStatsTable)
          .select('*')
          .order('average_score', { ascending: false })
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }
        
        if (!data) {
          return {
            topAverageScore: 0,
            topTotalChallenges: 0
          };
        }
        
        return {
          topAverageScore: data.average_score || 0,
          topTotalChallenges: data.completed_challenges || 0,
          userId: data.userId,
          username: data.username
        };
      }
    } catch (error) {
      this.logger.error('Error getting top performance', {
        challengeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get leaderboard title based on parameters
   * @param {Object} params - Leaderboard parameters
   * @returns {string} Leaderboard title
   * @private
   */
  getLeaderboardTitle(params) {
    const type = params.type || 'global';
    const timeframe = params.timeframe || 'all_time';
    
    let title = '';
    
    switch (type) {
      case 'global':
        title = 'Global Leaderboard';
        break;
      case 'similar':
        title = 'Similar Profiles Leaderboard';
        break;
      case 'friends':
        title = 'Friends Leaderboard';
        break;
      case 'focus':
        title = `${params.focusArea || 'Focus'} Leaderboard`;
        break;
      case 'challenge':
        title = 'Challenge Leaderboard';
        break;
      default:
        title = 'Leaderboard';
    }
    
    if (timeframe !== 'all_time') {
      switch (timeframe) {
        case 'monthly':
          title += ' - Monthly';
          break;
        case 'weekly':
          title += ' - Weekly';
          break;
        case 'daily':
          title += ' - Daily';
          break;
      }
    }
    
    return title;
  }

  /**
   * Get leaderboard description based on parameters
   * @param {Object} params - Leaderboard parameters
   * @returns {string} Leaderboard description
   * @private
   */
  getLeaderboardDescription(params) {
    const type = params.type || 'global';
    const timeframe = params.timeframe || 'all_time';
    
    let description = '';
    
    switch (type) {
      case 'global':
        description = 'Top scores from all players';
        break;
      case 'similar':
        description = 'Top scores from players with similar cognitive profiles';
        break;
      case 'friends':
        description = 'Top scores from your friends';
        break;
      case 'focus':
        description = `Top scores in the ${params.focusArea || 'focus'} area`;
        break;
      case 'challenge':
        description = 'Top scores for this specific challenge';
        break;
      default:
        description = 'Top scores';
    }
    
    if (timeframe !== 'all_time') {
      switch (timeframe) {
        case 'monthly':
          description += ' from the past month';
          break;
        case 'weekly':
          description += ' from the past week';
          break;
        case 'daily':
          description += ' from today';
          break;
      }
    }
    
    return description;
  }
}

export default SupabaseLeaderboardRepository;
