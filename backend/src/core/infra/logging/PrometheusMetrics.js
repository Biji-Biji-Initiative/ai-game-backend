'use strict';

import express from 'express';
import os from 'os';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import { infraLogger } from './domainLogger.js';

/**
 * Prometheus metrics integration for standardized monitoring
 */
class PrometheusMetrics {
  /**
   * Create a new PrometheusMetrics instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.router = express.Router();
    this.options = {
      defaultMetricsInterval: 10000, // Default metrics collection interval in ms
      ...options
    };
    
    this.registry = new Registry();
    this.metrics = {};
    
    // Initialize metrics
    this.initializeMetrics();
    
    // Start collecting default metrics
    collectDefaultMetrics({ 
      register: this.registry,
      prefix: 'api_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      eventLoopMonitoringPrecision: 10
    });
    
    this.setupRoutes();
    this.logger = infraLogger.child('prometheus-metrics');
    this.logger.info('Prometheus metrics initialized');
  }

  /**
   * Initialize Prometheus metrics
   */
  initializeMetrics() {
    // System metrics
    this.metrics.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry]
    });
    
    this.metrics.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });
    
    this.metrics.httpRequestSizeBytes = new Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000],
      registers: [this.registry]
    });
    
    this.metrics.httpResponseSizeBytes = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path', 'status'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000],
      registers: [this.registry]
    });
    
    // Domain-specific metrics
    this.metrics.domainRequestsTotal = new Counter({
      name: 'domain_requests_total',
      help: 'Total number of requests per domain',
      labelNames: ['domain'],
      registers: [this.registry]
    });
    
    this.metrics.domainErrorsTotal = new Counter({
      name: 'domain_errors_total',
      help: 'Total number of errors per domain',
      labelNames: ['domain', 'error_type'],
      registers: [this.registry]
    });
    
    this.metrics.domainRequestDuration = new Histogram({
      name: 'domain_request_duration_seconds',
      help: 'Request duration per domain in seconds',
      labelNames: ['domain'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });
    
    // Database metrics
    this.metrics.dbOperationsTotal = new Counter({
      name: 'db_operations_total',
      help: 'Total number of database operations',
      labelNames: ['operation', 'table'],
      registers: [this.registry]
    });
    
    this.metrics.dbOperationDuration = new Histogram({
      name: 'db_operation_duration_seconds',
      help: 'Database operation duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    });
    
    // External API metrics
    this.metrics.externalApiRequestsTotal = new Counter({
      name: 'external_api_requests_total',
      help: 'Total number of external API requests',
      labelNames: ['api', 'endpoint', 'status'],
      registers: [this.registry]
    });
    
    this.metrics.externalApiRequestDuration = new Histogram({
      name: 'external_api_request_duration_seconds',
      help: 'External API request duration in seconds',
      labelNames: ['api', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry]
    });
    
    // Memory usage gauge
    this.metrics.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Process memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry]
    });
    
    // Update memory usage periodically
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.metrics.memoryUsage.set({ type: 'rss' }, memoryUsage.rss);
      this.metrics.memoryUsage.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
      this.metrics.memoryUsage.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
      this.metrics.memoryUsage.set({ type: 'external' }, memoryUsage.external);
    }, this.options.defaultMetricsInterval);
  }

  /**
   * Set up routes for Prometheus metrics
   */
  setupRoutes() {
    // Metrics endpoint for Prometheus scraping
    this.router.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', this.registry.contentType);
        res.end(await this.registry.metrics());
      } catch (error) {
        this.logger.error('Error generating metrics', { error: error.message });
        res.status(500).end();
      }
    });
    
    // Documentation endpoint
    this.router.get('/', (req, res) => {
      res.send(this.generateDocsHtml());
    });
  }

  /**
   * Create middleware to track HTTP metrics
   * @returns {Function} Express middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      // Skip metrics endpoint itself to avoid circular measurements
      if (req.path === '/prometheus/metrics') {
        return next();
      }
      
      const startTime = process.hrtime();
      const requestSize = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;
      
      // Track request size
      this.metrics.httpRequestSizeBytes.observe(
        { method: req.method, path: this.normalizePath(req.path) }, 
        requestSize
      );
      
      // Store original end method
      const originalEnd = res.end;
      
      // Override end method to capture response metrics
      res.end = (...args) => {
        const responseSize = res.getHeader('content-length') ? 
          parseInt(res.getHeader('content-length'), 10) : 
          (args[0] ? args[0].length : 0);
        
        // Calculate duration
        const duration = this.getDurationInSeconds(startTime);
        
        // Track response metrics
        this.metrics.httpRequestsTotal.inc({
          method: req.method,
          path: this.normalizePath(req.path),
          status: res.statusCode
        });
        
        this.metrics.httpRequestDuration.observe(
          { method: req.method, path: this.normalizePath(req.path), status: res.statusCode },
          duration
        );
        
        this.metrics.httpResponseSizeBytes.observe(
          { method: req.method, path: this.normalizePath(req.path), status: res.statusCode },
          responseSize
        );
        
        // Track domain-specific metrics
        this.trackDomainMetrics(req, res, duration);
        
        // Call original end method
        return originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Track domain-specific metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} duration - Request duration in seconds
   */
  trackDomainMetrics(req, res, duration) {
    const path = req.path.toLowerCase();
    const isError = res.statusCode >= 400;
    
    // List of domains to check
    const domains = [
      'user', 
      'personality', 
      'challenge', 
      'evaluation', 
      'focusArea', 
      'progress', 
      'adaptive', 
      'userJourney',
      'rival',
      'badge',
      'leaderboard',
      'network'
    ];
    
    // Check if path contains a domain name
    domains.forEach(domain => {
      if (path.includes(`/${domain}/`) || path.includes(`/${domain}?`)) {
        // Increment domain request counter
        this.metrics.domainRequestsTotal.inc({ domain });
        
        // Track request duration
        this.metrics.domainRequestDuration.observe({ domain }, duration);
        
        // Track errors if status code >= 400
        if (isError) {
          const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
          this.metrics.domainErrorsTotal.inc({ domain, error_type: errorType });
        }
      }
    });
  }

  /**
   * Track database operation metrics
   * @param {string} operation - Database operation (query, insert, update, delete)
   * @param {string} table - Database table
   * @param {number} duration - Operation duration in seconds
   */
  trackDbOperation(operation, table, duration) {
    this.metrics.dbOperationsTotal.inc({ operation, table });
    this.metrics.dbOperationDuration.observe({ operation, table }, duration);
  }

  /**
   * Track external API request metrics
   * @param {string} api - External API name
   * @param {string} endpoint - API endpoint
   * @param {number} status - HTTP status code
   * @param {number} duration - Request duration in seconds
   */
  trackExternalApiRequest(api, endpoint, status, duration) {
    this.metrics.externalApiRequestsTotal.inc({ api, endpoint, status });
    this.metrics.externalApiRequestDuration.observe({ api, endpoint }, duration);
  }

  /**
   * Normalize path for consistent metrics
   * @param {string} path - Request path
   * @returns {string} Normalized path
   */
  normalizePath(path) {
    // Replace numeric IDs with placeholders
    return path.replace(/\/[0-9a-f]{8,}(?:-[0-9a-f]{4,}){3,}-[0-9a-f]{12,}/gi, '/:uuid')
               .replace(/\/[0-9]+/g, '/:id');
  }

  /**
   * Calculate duration in seconds from hrtime
   * @param {Array} startTime - Process hrtime array
   * @returns {number} Duration in seconds
   */
  getDurationInSeconds(startTime) {
    const diff = process.hrtime(startTime);
    return diff[0] + diff[1] / 1e9;
  }

  /**
   * Generate HTML documentation for Prometheus metrics
   * @returns {string} HTML documentation
   */
  generateDocsHtml() {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prometheus Metrics Documentation</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            h1, h2, h3 {
              color: #2c3e50;
            }
            .header {
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #ddd;
            }
            .metrics-container {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 20px;
              margin-bottom: 20px;
            }
            .metric-group {
              margin-bottom: 30px;
            }
            .metric-group h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .metric {
              margin-bottom: 20px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eee;
            }
            .metric:last-child {
              border-bottom: none;
            }
            .metric-name {
              font-weight: bold;
              font-family: monospace;
              background-color: #f8f9fa;
              padding: 4px 8px;
              border-radius: 4px;
            }
            .metric-help {
              margin: 10px 0;
            }
            .metric-type {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 12px;
              background-color: #e9ecef;
              color: #495057;
              margin-left: 10px;
            }
            .metric-labels {
              margin-top: 10px;
              font-family: monospace;
              font-size: 14px;
            }
            .label {
              display: inline-block;
              margin-right: 10px;
              background-color: #f1f8ff;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #c8e1ff;
            }
            .endpoint-info {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              margin-top: 20px;
            }
            .endpoint-url {
              font-family: monospace;
              font-weight: bold;
            }
            code {
              background-color: #f8f9fa;
              padding: 2px 4px;
              border-radius: 4px;
              font-family: monospace;
            }
            .integration-example {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              margin-top: 20px;
              overflow-x: auto;
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Prometheus Metrics Documentation</h1>
            <p>This page documents the Prometheus metrics available in this API.</p>
          </div>
          
          <div class="metrics-container">
            <div class="endpoint-info">
              <h3>Metrics Endpoint</h3>
              <p>Prometheus metrics are available at: <span class="endpoint-url">/prometheus/metrics</span></p>
              <p>This endpoint returns metrics in the Prometheus exposition format, suitable for scraping by a Prometheus server.</p>
            </div>
            
            <div class="metric-group">
              <h2>HTTP Metrics</h2>
              
              <div class="metric">
                <div>
                  <span class="metric-name">http_requests_total</span>
                  <span class="metric-type">Counter</span>
                </div>
                <div class="metric-help">Total number of HTTP requests</div>
                <div class="metric-labels">
                  Labels: <span class="label">method</span> <span class="label">path</span> <span class="label">status</span>
                </div>
              </div>
              
              <div class="metric">
                <div>
                  <span class="metric-name">http_request_duration_seconds</span>
                  <span class="metric-type">Histogram</span>
                </div>
                <div class="metric-help">HTTP request duration in seconds</div>
                <div class="metric-labels">
                  Labels: <span class="label">method</span> <span class="label">path</span> <span class="label">status</span>
                </div>
              </div>
              
              <div class="metric">
                <div>
                  <span class="metric-name">http_request_size_bytes</span>
                  <span class="metric-type">Histogram</span>
                </div>
                <div class="metric-help">HTTP request size in bytes</div>
                <div class="metric-labels">
                  Labels: <span class="label">method</span> <span class="label">path</span>
                </div>
              </div>
              
              <div class="metric">
                <div>
                  <span class="metric-name">http_response_size_bytes</span>
                  <span class="metric-type">Histogram</span>
                </div>
                <div class="metric-help">HTTP response size in bytes</div>
                <div class="metric-labels">
                  Labels: <span class="label">method</span> <span class="label">path</span> <span class="label">status</span>
                </div>
              </div>
            </div>
            
            <div class="metric-group">
              <h2>Domain Metrics</h2>
              
              <div class="metric">
                <div>
                  <span class="metric-name">domain_requests_total</span>
                  <span class="metric-type">Counter</span>
                </div>
                <div class="metric-help">Total number of requests per domain</div>
                <div class="metric-labels">
                  Labels: <span class="label">domain</span>
                </div>
              </div>
              
              <div class="metric">
                <div>
                  <span class="metric-name">domain_errors_total</span>
                  <span class="metric-type">Counter</span>
                </div>
                <div class="metric-help">Total number of errors per domain</div>
                <div class="metric-labels">
                  Labels: <span class="label">domain</span> <span class="label">error_type</span>
                </div>
              </div>
              
              <div class="metric">
                <div>
                  <span class="metric-name">domain_request_duration_seconds</span>
                  <span class="metric-type">Histogram</span>
                </div>
                <div class="metric-help">Request duration per domain in seconds</div>
                <div class="metric-labels">
                  Labels: <span class="label">domain</span>
                </div>
              </div>
            </div>
            
            <div class="metric-group">
              <h2>Database Metrics</h2>
              
              <div class="metric">
                <div>
                  <span class="metric-name">db_operations_total</span>
                  <span class="metric-type">Counter</span>
                </div>
                <div class="metric-help">Total number of database operations</div>
                <div class="metric-labels">
                  Labels: <span class="label">operation</span> <span class="label">table</span>
                </div>
              </div>
              
              <div class="metric">
                <div>
                  <span class="metric-name">db_operation_duration_seconds</span>
                  <span class="metric-type">Histogram</span>
                </div>
                <div class="metric-help">Database operation duration in seconds</div>
                <div class="metric-labels">
                  Labels: <span class="label">operation</span> <span class="label">table</span>
                </div>
              </div>
            </div>
            
            <div class="metric-group">
              <h2>External API Metrics</h2>
              
              <div class="metric">
                <div>
                  <span class="metric-name">external_api_requests_total</span>
                  <span class="metric-type">Counter</span>
                </div>
                <div class="metric-help">Total number of external API requests</div>
                <div class="metric-labels">
                  Labels: <span class="label">api</span> <span class="label">endpoint</span> <span class="label">status</span>
                </div>
              </div>
              
              <div class="metric">
                <div>
                  <span class="metric-name">external_api_request_duration_seconds</span>
                  <span class="metric-type">Histogram</span>
                </div>
                <div class="metric-help">External API request duration in seconds</div>
                <div class="metric-labels">
                  Labels: <span class="label">api</span> <span class="label">endpoint</span>
                </div>
              </div>
            </div>
            
            <div class="metric-group">
              <h2>System Metrics</h2>
              
              <div class="metric">
                <div>
                  <span class="metric-name">memory_usage_bytes</span>
                  <span class="metric-type">Gauge</span>
                </div>
                <div class="metric-help">Process memory usage in bytes</div>
                <div class="metric-labels">
                  Labels: <span class="label">type</span>
                </div>
              </div>
              
              <p>Additionally, the following default Node.js metrics are collected:</p>
              <ul>
                <li><code>api_process_cpu_user_seconds_total</code></li>
                <li><code>api_process_cpu_system_seconds_total</code></li>
                <li><code>api_process_cpu_seconds_total</code></li>
                <li><code>api_process_start_time_seconds</code></li>
                <li><code>api_process_resident_memory_bytes</code></li>
                <li><code>api_nodejs_eventloop_lag_seconds</code></li>
                <li><code>api_nodejs_active_handles</code></li>
                <li><code>api_nodejs_active_requests</code></li>
                <li><code>api_nodejs_heap_size_total_bytes</code></li>
                <li><code>api_nodejs_heap_size_used_bytes</code></li>
                <li><code>api_nodejs_external_memory_bytes</code></li>
                <li><code>api_nodejs_heap_space_size_total_bytes</code></li>
                <li><code>api_nodejs_heap_space_size_used_bytes</code></li>
                <li><code>api_nodejs_heap_space_size_available_bytes</code></li>
                <li><code>api_nodejs_version_info</code></li>
              </ul>
            </div>
          </div>
          
          <div class="metrics-container">
            <h2>Integration with Prometheus</h2>
            
            <p>To scrape these metrics with Prometheus, add the following job to your Prometheus configuration:</p>
            
            <div class="integration-example">
              <pre>
scrape_configs:
  - job_name: 'api'
    metrics_path: '/prometheus/metrics'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-api-host:3000']
              </pre>
            </div>
            
            <h3>Example Grafana Queries</h3>
            
            <p>Here are some example PromQL queries for Grafana dashboards:</p>
            
            <ul>
              <li>Request rate: <code>sum(rate(http_requests_total[5m]))</code></li>
              <li>Error rate: <code>sum(rate(http_requests_total{status=~"5.."}[5m]))</code></li>
              <li>Average response time: <code>sum(rate(http_request_duration_seconds_sum[5m])) / sum(rate(http_request_duration_seconds_count[5m]))</code></li>
              <li>95th percentile response time: <code>histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))</code></li>
              <li>Requests by domain: <code>sum(rate(domain_requests_total[5m])) by (domain)</code></li>
              <li>Memory usage: <code>memory_usage_bytes{type="heapUsed"}</code></li>
            </ul>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get the Express router for Prometheus metrics
   * @returns {express.Router} Prometheus router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Get middleware for tracking HTTP metrics
   * @returns {Function} Express middleware
   */
  getMiddleware() {
    return this.createMiddleware();
  }

  /**
   * Get the Prometheus registry
   * @returns {Registry} Prometheus registry
   */
  getRegistry() {
    return this.registry;
  }

  /**
   * Get all metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return this.metrics;
  }
}

// Create a singleton instance
const prometheusMetrics = new PrometheusMetrics();

export { PrometheusMetrics, prometheusMetrics };
export default prometheusMetrics;
