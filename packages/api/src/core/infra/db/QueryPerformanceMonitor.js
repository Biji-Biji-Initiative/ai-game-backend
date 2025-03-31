/**
 * Query Performance Monitor
 * 
 * Tracks query performance metrics and detects potential N+1 issues.
 * This middleware can be used to monitor database queries and log 
 * potentially problematic patterns.
 * 
 * @module QueryPerformanceMonitor
 */

import { logger } from '../logging/logger.js';
'use strict';

// Collection period in milliseconds (default: 60 seconds)
const DEFAULT_COLLECTION_PERIOD = 60000;

// Threshold for identifying potential N+1 patterns (similar queries)
const N_PLUS_1_THRESHOLD = 5;

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD = 200;

/**
 * Query Performance Monitor class
 */
class QueryPerformanceMonitor {
  /**
   * Create a new QueryPerformanceMonitor instance
   * 
   * @param {Object} options - Configuration options
   * @param {number} options.collectionPeriod - Time period in milliseconds to collect stats before analyzing
   * @param {number} options.n1Threshold - Threshold for detecting potential N+1 issues
   * @param {number} options.slowQueryThreshold - Threshold for slow queries in milliseconds
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.collectionPeriod = options.collectionPeriod || DEFAULT_COLLECTION_PERIOD;
    this.n1Threshold = options.n1Threshold || N_PLUS_1_THRESHOLD;
    this.slowQueryThreshold = options.slowQueryThreshold || SLOW_QUERY_THRESHOLD;
    this.log = options.logger || logger.child({ component: 'query-performance-monitor' });
    
    // Initialize metrics
    this.queryStats = new Map();
    this.queriesByPattern = new Map();
    this.slowQueries = [];
    this.totalQueries = 0;
    this.totalDuration = 0;
    
    // Start collecting metrics
    this._startCollection();
  }
  
  /**
   * Start the collection period timer
   * @private
   */
  _startCollection() {
    this.collectionStartTime = Date.now();
    this.collectionTimer = setTimeout(() => {
      this._analyzeAndReport();
      // Reset and restart collection
      this._resetMetrics();
      this._startCollection();
    }, this.collectionPeriod);
  }
  
  /**
   * Reset all collected metrics
   * @private
   */
  _resetMetrics() {
    this.queryStats.clear();
    this.queriesByPattern.clear();
    this.slowQueries = [];
    this.totalQueries = 0;
    this.totalDuration = 0;
    this.collectionStartTime = Date.now();
  }
  
  /**
   * Analyze collected data and report issues
   * @private
   */
  _analyzeAndReport() {
    if (this.totalQueries === 0) {
      return;
    }
    
    const collectionPeriodSeconds = (Date.now() - this.collectionStartTime) / 1000;
    const queriesPerSecond = this.totalQueries / collectionPeriodSeconds;
    const avgQueryTime = this.totalDuration / this.totalQueries;
    
    // Log general statistics
    this.log.info('Query performance statistics', {
      totalQueries: this.totalQueries,
      queriesPerSecond: queriesPerSecond.toFixed(2),
      avgQueryTime: `${avgQueryTime.toFixed(2)}ms`,
      collectionPeriodSeconds: collectionPeriodSeconds.toFixed(1),
      slowQueriesCount: this.slowQueries.length
    });
    
    // Report potential N+1 issues
    for (const [pattern, queries] of this.queriesByPattern.entries()) {
      if (queries.length >= this.n1Threshold) {
        this.log.warn('Potential N+1 query pattern detected', {
          pattern,
          count: queries.length,
          examples: queries.slice(0, 3).map(q => q.query),
          avgDuration: (queries.reduce((sum, q) => sum + q.duration, 0) / queries.length).toFixed(2) + 'ms'
        });
      }
    }
    
    // Report slow queries
    if (this.slowQueries.length > 0) {
      this.log.warn('Slow queries detected', {
        count: this.slowQueries.length,
        slowest: this.slowQueries
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
          .map(q => ({
            query: q.query,
            duration: `${q.duration.toFixed(2)}ms`,
            timestamp: q.timestamp
          }))
      });
    }
  }
  
  /**
   * Track a database query
   * 
   * @param {Object} queryInfo - Information about the executed query
   * @param {string} queryInfo.query - The query text or identifier
   * @param {string} queryInfo.operation - The operation type (select, insert, update, delete)
   * @param {string} queryInfo.repository - The repository that executed the query
   * @param {string} queryInfo.method - The repository method that executed the query
   * @param {number} queryInfo.duration - Query execution duration in milliseconds
   * @param {Object} queryInfo.params - Query parameters
   */
  trackQuery(queryInfo) {
    const { query, operation, repository, method, duration, params } = queryInfo;
    
    // Increment total counters
    this.totalQueries++;
    this.totalDuration += duration;
    
    // Get or create stats for this query type
    const key = `${repository}.${method}`;
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        count: 0,
        totalDuration: 0,
        min: Infinity,
        max: 0
      });
    }
    
    // Update stats
    const stats = this.queryStats.get(key);
    stats.count++;
    stats.totalDuration += duration;
    stats.min = Math.min(stats.min, duration);
    stats.max = Math.max(stats.max, duration);
    
    // Check for slow queries
    if (duration > this.slowQueryThreshold) {
      this.slowQueries.push({
        query,
        operation,
        repository,
        method,
        duration,
        timestamp: new Date().toISOString(),
        params: JSON.stringify(params)
      });
      
      // Log slow query immediately
      this.log.warn('Slow query detected', {
        query,
        operation,
        repository,
        method,
        duration: `${duration.toFixed(2)}ms`
      });
    }
    
    // Group similar queries to detect N+1 patterns
    // Create a pattern by removing specific values
    const pattern = this._createQueryPattern(query, operation);
    
    if (!this.queriesByPattern.has(pattern)) {
      this.queriesByPattern.set(pattern, []);
    }
    
    this.queriesByPattern.get(pattern).push({
      query,
      operation,
      repository,
      method,
      duration,
      timestamp: Date.now()
    });
  }
  
  /**
   * Create a query pattern by removing specific values
   * @param {string} query - The original query
   * @param {string} operation - The operation type
   * @returns {string} The query pattern
   * @private
   */
  _createQueryPattern(query, operation) {
    // Simple pattern creation - ideally we would use a SQL parser
    // and properly extract the structure without values
    let pattern = query;
    
    // Replace numbers
    pattern = pattern.replace(/\b\d+\b/g, 'N');
    
    // Replace UUIDs
    pattern = pattern.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 
      'UUID'
    );
    
    // Replace quoted strings
    pattern = pattern.replace(/'[^']*'/g, "'STRING'");
    pattern = pattern.replace(/"[^"]*"/g, '"STRING"');
    
    return `${operation}:${pattern}`;
  }
  
  /**
   * Stop collecting metrics and clear resources
   */
  stop() {
    if (this.collectionTimer) {
      clearTimeout(this.collectionTimer);
      this.collectionTimer = null;
    }
    this._resetMetrics();
  }
}

// Singleton instance
let monitorInstance = null;

/**
 * Get the query performance monitor instance
 * @param {Object} options - Configuration options
 * @returns {QueryPerformanceMonitor} The monitor instance
 */
function getMonitor(options = {}) {
  if (!monitorInstance) {
    monitorInstance = new QueryPerformanceMonitor(options);
  }
  return monitorInstance;
}

export {
  QueryPerformanceMonitor,
  getMonitor
}; 