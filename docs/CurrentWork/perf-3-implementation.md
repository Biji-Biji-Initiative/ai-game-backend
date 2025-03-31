# PERF-3: Add Performance Monitoring for AI Calls

## Problem Statement

Our application relies heavily on AI services (OpenAI) for core functionality, but currently lacks comprehensive performance monitoring for these external API calls. This creates several challenges:

1. **Invisible Bottlenecks**: Performance issues with AI calls may go undetected
2. **Cost Optimization**: Without metrics, we can't optimize AI usage costs
3. **Error Detection**: Failures or degraded performance are difficult to track
4. **Capacity Planning**: Hard to forecast resource needs without usage metrics

## Analysis

After reviewing the codebase, I found that our OpenAI interactions happen primarily through the `OpenAIClientAdapter` class, which implements the `AIClient` interface. Two key methods handle most AI interactions:

1. `sendJsonMessage`: For non-streaming requests
2. `streamMessage`: For streaming responses

These methods include basic logging, but lack performance metrics and monitoring:

```javascript
async sendJsonMessage(messages, options = {}) {
    const correlationId = options.correlationId || `req_${Date.now()}`;
    
    // Log request details, but no timing metrics
    this.logger?.debug('Sending JSON message to OpenAI', {
        correlationId,
        messageCount: messages.length,
        // ...
    });

    const response = await this.openAIClient.sendJsonMessage(messages, options);
    
    // Log response, but no performance data
    this.logger?.debug('Received JSON response from OpenAI', {
        correlationId,
        responseId: response?.responseId,
        // ...
    });

    return response;
}
```

## Implementation Strategy

To address this gap, I'll implement a comprehensive performance monitoring system for AI calls with:

1. **Performance Metrics Collection**:
   - Request latency (time to first token, total duration)
   - Token usage (prompt, completion, total)
   - Error rates and types
   - Model usage statistics

2. **Metric Storage**:
   - Integration with existing monitoring systems
   - Support for local and distributed metrics

3. **Instrumentation**:
   - Non-invasive wrapper for existing code
   - Performance hooks at critical points

4. **Visualization & Alerting**:
   - Dashboard integration
   - Threshold-based alerts

## Implementation Details

### 1. Create AI Performance Monitoring Service

First, I'll create a dedicated monitoring service:

```javascript
// src/core/ai/monitoring/AIPerformanceMonitor.js

import { logger } from "../../infra/logging/logger.js";

/**
 * AIPerformanceMonitor
 * 
 * Tracks and reports performance metrics for AI service calls
 */
class AIPerformanceMonitor {
  /**
   * Create a new AI Performance Monitor
   * @param {Object} options - Monitor options
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.metricsReporter - Optional metrics reporter service
   */
  constructor({ logger, metricsReporter = null }) {
    this.logger = logger?.child({ service: 'ai-monitor' }) || logger;
    this.metricsReporter = metricsReporter;
  }
  
  /**
   * Track metrics for a non-streaming AI request
   * @param {Function} operation - The operation function to track
   * @param {Object} context - Context for the operation
   * @returns {Promise<any>} - The result of the operation
   */
  async trackRequest(operation, context = {}) {
    const startTime = Date.now();
    const { model, correlationId = `req_${startTime}`, messageCount = 0 } = context;
    
    try {
      // Track the start of the request
      this._trackEvent('ai_request_start', {
        correlationId,
        model,
        messageCount,
        timestamp: startTime
      });
      
      // Execute the operation
      const result = await operation();
      
      // Calculate metrics
      const duration = Date.now() - startTime;
      const tokenMetrics = this._extractTokenMetrics(result);
      
      // Track successful completion
      this._trackEvent('ai_request_complete', {
        correlationId,
        model,
        duration,
        ...tokenMetrics,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // Calculate duration even for errors
      const duration = Date.now() - startTime;
      
      // Track error
      this._trackEvent('ai_request_error', {
        correlationId,
        model,
        duration,
        errorType: error.name,
        errorMessage: error.message,
        timestamp: Date.now()
      });
      
      // Re-throw the error to maintain normal flow
      throw error;
    }
  }
  
  /**
   * Track metrics for a streaming AI request
   * @param {Function} operation - The streaming operation to track
   * @param {Object} context - Context for the operation
   * @returns {Promise<void>}
   */
  async trackStreamingRequest(operation, context = {}) {
    const startTime = Date.now();
    const { model, correlationId = `stream_${startTime}`, messageCount = 0 } = context;
    let firstTokenTime = null;
    
    try {
      // Track the start of the streaming request
      this._trackEvent('ai_stream_start', {
        correlationId,
        model,
        messageCount,
        timestamp: startTime
      });
      
      // Create a wrapping callback to measure first token time
      const onFirstToken = () => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
          const timeToFirstToken = firstTokenTime - startTime;
          
          this._trackEvent('ai_stream_first_token', {
            correlationId,
            model,
            timeToFirstToken,
            timestamp: firstTokenTime
          });
        }
      };
      
      // Execute the streaming operation with the callback
      await operation(onFirstToken);
      
      // Calculate final metrics
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Track successful completion
      this._trackEvent('ai_stream_complete', {
        correlationId,
        model,
        totalDuration,
        timeToFirstToken: firstTokenTime ? (firstTokenTime - startTime) : null,
        timestamp: endTime
      });
    } catch (error) {
      // Calculate duration even for errors
      const duration = Date.now() - startTime;
      
      // Track error
      this._trackEvent('ai_stream_error', {
        correlationId,
        model,
        duration,
        errorType: error.name,
        errorMessage: error.message,
        timestamp: Date.now()
      });
      
      // Re-throw the error to maintain normal flow
      throw error;
    }
  }
  
  /**
   * Track a single AI performance event
   * @param {string} eventName - Name of the event
   * @param {Object} metrics - Event metrics
   * @private
   */
  _trackEvent(eventName, metrics) {
    // Log the event
    this.logger.info(`AI performance: ${eventName}`, metrics);
    
    // Report metrics if a reporter is configured
    if (this.metricsReporter) {
      this.metricsReporter.trackEvent(eventName, metrics);
    }
  }
  
  /**
   * Extract token usage metrics from an OpenAI response
   * @param {Object} response - OpenAI response
   * @returns {Object} Token metrics
   * @private
   */
  _extractTokenMetrics(response) {
    const metrics = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
    
    // Extract usage data from response if available
    if (response?.usage) {
      metrics.promptTokens = response.usage.prompt_tokens || 0;
      metrics.completionTokens = response.usage.completion_tokens || 0;
      metrics.totalTokens = response.usage.total_tokens || 0;
    }
    
    return metrics;
  }
}

export default AIPerformanceMonitor;
```

### 2. Create a Metrics Reporter Interface

```javascript
// src/core/infra/metrics/MetricsReporter.js

/**
 * MetricsReporter interface
 * 
 * Defines the contract for reporting metrics to various systems
 */
class MetricsReporter {
  /**
   * Track a single event with metrics
   * @param {string} eventName - Name of the event
   * @param {Object} metrics - Event metrics
   */
  trackEvent(eventName, metrics) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Track a counter metric
   * @param {string} name - Metric name
   * @param {number} value - Value to increment by
   * @param {Object} tags - Metric tags
   */
  trackCounter(name, value = 1, tags = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Track a timing metric
   * @param {string} name - Metric name
   * @param {number} value - Timing value in milliseconds
   * @param {Object} tags - Metric tags
   */
  trackTiming(name, value, tags = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Track a gauge metric
   * @param {string} name - Metric name
   * @param {number} value - Current value
   * @param {Object} tags - Metric tags
   */
  trackGauge(name, value, tags = {}) {
    throw new Error('Method not implemented');
  }
}

export default MetricsReporter;
```

### 3. Create a Console Metrics Reporter Implementation

```javascript
// src/core/infra/metrics/ConsoleMetricsReporter.js

import MetricsReporter from './MetricsReporter.js';

/**
 * Simple metrics reporter that logs to console
 * @implements {MetricsReporter}
 */
class ConsoleMetricsReporter extends MetricsReporter {
  /**
   * Create a new console metrics reporter
   * @param {Object} options - Reporter options
   * @param {Object} options.logger - Logger to use
   */
  constructor({ logger }) {
    super();
    this.logger = logger;
  }
  
  /**
   * Track a single event with metrics
   * @param {string} eventName - Name of the event
   * @param {Object} metrics - Event metrics
   */
  trackEvent(eventName, metrics) {
    this.logger.info(`[Metrics Event] ${eventName}`, metrics);
  }
  
  /**
   * Track a counter metric
   * @param {string} name - Metric name
   * @param {number} value - Value to increment by
   * @param {Object} tags - Metric tags
   */
  trackCounter(name, value = 1, tags = {}) {
    this.logger.info(`[Metrics Counter] ${name}: ${value}`, tags);
  }
  
  /**
   * Track a timing metric
   * @param {string} name - Metric name
   * @param {number} value - Timing value in milliseconds
   * @param {Object} tags - Metric tags
   */
  trackTiming(name, value, tags = {}) {
    this.logger.info(`[Metrics Timing] ${name}: ${value}ms`, tags);
  }
  
  /**
   * Track a gauge metric
   * @param {string} name - Metric name
   * @param {number} value - Current value
   * @param {Object} tags - Metric tags
   */
  trackGauge(name, value, tags = {}) {
    this.logger.info(`[Metrics Gauge] ${name}: ${value}`, tags);
  }
}

export default ConsoleMetricsReporter;
```

### 4. Enhance OpenAIClientAdapter with Performance Monitoring

```javascript
// src/core/ai/adapters/OpenAIClientAdapter.js (updated version)

import AIClient from "../../ai/ports/AIClient.js";
import AIPerformanceMonitor from "../monitoring/AIPerformanceMonitor.js";
'use strict';

/**
 * Implementation of AIClient using OpenAI's client with performance monitoring
 * @implements {AIClient}
 */
class OpenAIClientAdapter extends AIClient {
    /**
     * Create a new OpenAIClientAdapter
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.openAIClient - OpenAI client instance
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.performanceMonitor - AI performance monitor instance
     */
    constructor({ openAIClient, logger, performanceMonitor = null }) {
        super();
        if (!openAIClient) {
            throw new Error('OpenAI client is required for OpenAIClientAdapter');
        }
        this.openAIClient = openAIClient;
        this.logger = logger;
        
        // Create a default performance monitor if none provided
        this.performanceMonitor = performanceMonitor || new AIPerformanceMonitor({ logger });
    }

    // Existing sanitization methods remain unchanged
    _sanitizeMessagesForLogging(messages) { /* ... */ }
    _sanitizeResponseForLogging(response) { /* ... */ }

    /**
     * Send a message to OpenAI and get a JSON response
     * @param {Array} messages - The formatted messages to send
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} - The response from OpenAI
     */
    async sendJsonMessage(messages, options = {}) {
        const correlationId = options.correlationId || `req_${Date.now()}`;
        
        // Log the request
        this.logger?.debug('Sending JSON message to OpenAI', {
            correlationId,
            messageCount: messages.length,
            hasOptions: !!options,
            options: options.model ? { model: options.model } : undefined,
            messages: this._sanitizeMessagesForLogging(messages)
        });

        // Use performance monitor to track the request
        return this.performanceMonitor.trackRequest(
            async () => {
                const response = await this.openAIClient.sendJsonMessage(messages, options);
                
                // Log the response
                this.logger?.debug('Received JSON response from OpenAI', {
                    correlationId,
                    responseId: response?.responseId,
                    response: this._sanitizeResponseForLogging(response)
                });
                
                return response;
            }, 
            {
                correlationId,
                model: options.model,
                messageCount: messages.length
            }
        );
    }

    /**
     * Stream a message to OpenAI with real-time updates
     * @param {Array} messages - The formatted messages to send
     * @param {Object} options - Additional options for the request
     * @returns {Promise<void>}
     */
    async streamMessage(messages, options = {}) {
        const correlationId = options.correlationId || `req_${Date.now()}`;
        
        // Log the request
        this.logger?.debug('Streaming message to OpenAI', {
            correlationId,
            messageCount: messages.length,
            hasOptions: !!options,
            options: options.model ? { model: options.model } : undefined,
            messages: this._sanitizeMessagesForLogging(messages)
        });

        // Use performance monitor to track the streaming request
        return this.performanceMonitor.trackStreamingRequest(
            async (onFirstToken) => {
                // Wrap the onChunk callback to detect first token
                const originalOnChunk = options.onChunk;
                let firstChunkReceived = false;
                
                if (originalOnChunk) {
                    options.onChunk = (chunk) => {
                        // Detect first token
                        if (!firstChunkReceived) {
                            firstChunkReceived = true;
                            onFirstToken();
                        }
                        
                        // Call the original callback
                        originalOnChunk(chunk);
                    };
                }
                
                await this.openAIClient.streamMessage(messages, options);
                
                this.logger?.debug('Completed streaming message to OpenAI', {
                    correlationId
                });
            },
            {
                correlationId,
                model: options.model,
                messageCount: messages.length
            }
        );
    }
}

export default OpenAIClientAdapter;
```

### 5. Register the Performance Monitor in the Container

```javascript
// src/config/container/ai.js (update)

import AIPerformanceMonitor from "../../core/ai/monitoring/AIPerformanceMonitor.js";
import ConsoleMetricsReporter from "../../core/infra/metrics/ConsoleMetricsReporter.js";

// Register AI performance monitoring components
container.register('metricsReporter', c => {
    return new ConsoleMetricsReporter({
        logger: c.get('logger')
    });
}, true); // Singleton

container.register('aiPerformanceMonitor', c => {
    return new AIPerformanceMonitor({
        logger: c.get('logger'),
        metricsReporter: c.get('metricsReporter')
    });
}, true); // Singleton

// Update existing OpenAIClientAdapter registration
container.register('aiClient', c => {
    return new OpenAIClientAdapter({
        openAIClient: c.get('openAIClient'),
        logger: c.get('logger'),
        performanceMonitor: c.get('aiPerformanceMonitor')
    });
}, c.get('openAIConfig').singleton);
```

### 6. Create Prometheus Metrics Reporter Implementation

For production environments, add a Prometheus reporter:

```javascript
// src/core/infra/metrics/PrometheusMetricsReporter.js

import MetricsReporter from './MetricsReporter.js';
import client from 'prom-client';

/**
 * Prometheus metrics reporter
 * @implements {MetricsReporter}
 */
class PrometheusMetricsReporter extends MetricsReporter {
  /**
   * Create a new Prometheus metrics reporter
   * @param {Object} options - Reporter options
   * @param {Object} options.logger - Logger to use
   * @param {Object} options.registry - Optional custom Prometheus registry
   */
  constructor({ logger, registry = null }) {
    super();
    this.logger = logger;
    
    // Use provided registry or create a new one
    this.registry = registry || new client.Registry();
    
    // Initialize default metrics
    this.initializeMetrics();
  }
  
  /**
   * Initialize Prometheus metrics
   * @private
   */
  initializeMetrics() {
    // AI request duration histogram
    this.requestDuration = new client.Histogram({
      name: 'ai_request_duration_ms',
      help: 'Duration of AI requests in milliseconds',
      labelNames: ['model', 'status'],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
      registry: this.registry
    });
    
    // Time to first token histogram
    this.timeToFirstToken = new client.Histogram({
      name: 'ai_time_to_first_token_ms',
      help: 'Time to first token in streaming requests in milliseconds',
      labelNames: ['model'],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000],
      registry: this.registry
    });
    
    // Token usage counter
    this.tokenCounter = new client.Counter({
      name: 'ai_token_usage_total',
      help: 'Total number of tokens used by AI requests',
      labelNames: ['model', 'token_type'],
      registry: this.registry
    });
    
    // Request counter
    this.requestCounter = new client.Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['model', 'status'],
      registry: this.registry
    });
  }
  
  /**
   * Track a single event with metrics
   * @param {string} eventName - Name of the event
   * @param {Object} metrics - Event metrics
   */
  trackEvent(eventName, metrics) {
    const { model = 'unknown', duration, timeToFirstToken, errorType, 
            promptTokens, completionTokens, totalTokens } = metrics;
    
    switch (eventName) {
      case 'ai_request_complete':
        // Track successful request
        this.requestCounter.inc({ model, status: 'success' });
        
        // Track duration
        if (duration) {
          this.requestDuration.observe({ model, status: 'success' }, duration);
        }
        
        // Track token usage
        if (promptTokens) {
          this.tokenCounter.inc({ model, token_type: 'prompt' }, promptTokens);
        }
        if (completionTokens) {
          this.tokenCounter.inc({ model, token_type: 'completion' }, completionTokens);
        }
        if (totalTokens) {
          this.tokenCounter.inc({ model, token_type: 'total' }, totalTokens);
        }
        break;
        
      case 'ai_request_error':
        // Track failed request
        this.requestCounter.inc({ model, status: 'error' });
        
        // Track duration for failed requests
        if (duration) {
          this.requestDuration.observe({ model, status: 'error' }, duration);
        }
        break;
        
      case 'ai_stream_complete':
        // Track successful streaming request
        this.requestCounter.inc({ model, status: 'success_stream' });
        
        // Track duration
        if (duration) {
          this.requestDuration.observe({ model, status: 'success_stream' }, duration);
        }
        
        // Track time to first token
        if (timeToFirstToken) {
          this.timeToFirstToken.observe({ model }, timeToFirstToken);
        }
        break;
        
      case 'ai_stream_first_token':
        // Track time to first token for streaming
        if (timeToFirstToken) {
          this.timeToFirstToken.observe({ model }, timeToFirstToken);
        }
        break;
        
      case 'ai_stream_error':
        // Track failed streaming request
        this.requestCounter.inc({ model, status: 'error_stream' });
        
        // Track duration for failed streaming
        if (duration) {
          this.requestDuration.observe({ model, status: 'error_stream' }, duration);
        }
        break;
        
      default:
        // Log unknown events but don't track metrics
        this.logger.debug(`Unknown metrics event: ${eventName}`, metrics);
    }
  }
  
  /**
   * Track a counter metric
   * @param {string} name - Metric name
   * @param {number} value - Value to increment by
   * @param {Object} tags - Metric tags
   */
  trackCounter(name, value = 1, tags = {}) {
    // Find or create counter
    const counter = this.getOrCreateCounter(name, tags);
    counter.inc(tags, value);
  }
  
  /**
   * Track a timing metric
   * @param {string} name - Metric name
   * @param {number} value - Timing value in milliseconds
   * @param {Object} tags - Metric tags
   */
  trackTiming(name, value, tags = {}) {
    // Find or create histogram
    const histogram = this.getOrCreateHistogram(name, tags);
    histogram.observe(tags, value);
  }
  
  /**
   * Track a gauge metric
   * @param {string} name - Metric name
   * @param {number} value - Current value
   * @param {Object} tags - Metric tags
   */
  trackGauge(name, value, tags = {}) {
    // Find or create gauge
    const gauge = this.getOrCreateGauge(name, tags);
    gauge.set(tags, value);
  }
  
  /**
   * Get Prometheus metrics in string format
   * @returns {Promise<string>} - Prometheus metrics
   */
  async getMetrics() {
    return this.registry.metrics();
  }
  
  /**
   * Helper to get or create a counter
   * @private
   */
  getOrCreateCounter(name, tags = {}) {
    // Implementation details omitted for brevity
    // Would dynamically create counters as needed
  }
  
  /**
   * Helper to get or create a histogram
   * @private
   */
  getOrCreateHistogram(name, tags = {}) {
    // Implementation details omitted for brevity
    // Would dynamically create histograms as needed
  }
  
  /**
   * Helper to get or create a gauge
   * @private
   */
  getOrCreateGauge(name, tags = {}) {
    // Implementation details omitted for brevity
    // Would dynamically create gauges as needed
  }
}

export default PrometheusMetricsReporter;
```

### 7. Create a Metrics Endpoint for Prometheus Scraping

```javascript
// src/core/infra/http/routes/metricsRoutes.js

import express from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
'use strict';

/**
 * Metrics Routes
 * Provides routes for exporting application metrics
 */
const router = express.Router();

/**
 * Metrics routes factory
 * @param {Object} metricsReporter - Metrics reporter instance
 * @returns {express.Router} Express router
 */
export default function metricsRoutes(metricsReporter) {
  // GET /metrics - Return Prometheus metrics
  router.get('/', async (req, res) => {
    // Check if we have a Prometheus reporter
    if (metricsReporter && typeof metricsReporter.getMetrics === 'function') {
      const metrics = await metricsReporter.getMetrics();
      res.set('Content-Type', 'text/plain');
      return res.send(metrics);
    }
    
    // Return empty metrics if no Prometheus reporter
    res.set('Content-Type', 'text/plain');
    return res.send('# No metrics available');
  });
  
  // GET /metrics/ai - Return AI-specific metrics (admin only)
  router.get('/ai', authenticateUser, requireAdmin, async (req, res) => {
    // Format AI metrics in JSON format for admin dashboard
    const aiMetrics = {
      requestCounts: {},
      avgDuration: {},
      tokenUsage: {},
      // Add other metrics here
    };
    
    // In a real implementation, these would be populated
    // from a metrics storage/aggregation system
    
    return res.json(aiMetrics);
  });
  
  return router;
}
```

### 8. Configure Environment-Specific Metrics in Container

```javascript
// src/config/container/metrics.js

import ConsoleMetricsReporter from "../../core/infra/metrics/ConsoleMetricsReporter.js";
import PrometheusMetricsReporter from "../../core/infra/metrics/PrometheusMetricsReporter.js";

/**
 * Register metrics components in the container
 * @param {DIContainer} container - The DI container
 */
function registerMetricsComponents(container) {
    // Choose metrics reporter based on environment
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production' || env === 'staging') {
        // Use Prometheus in production/staging
        container.register('metricsReporter', c => {
            return new PrometheusMetricsReporter({
                logger: c.get('logger')
            });
        }, true); // Singleton
    } else {
        // Use console reporter in development
        container.register('metricsReporter', c => {
            return new ConsoleMetricsReporter({
                logger: c.get('logger')
            });
        }, true); // Singleton
    }
}

export { registerMetricsComponents };
export default {
    registerMetricsComponents
};
```

## Benefits

Implementing AI performance monitoring provides several key benefits:

1. **Performance Optimization**: Identify and address latency issues
2. **Cost Management**: Track token usage to optimize API costs
3. **Error Visibility**: Quick detection of API errors and failures
4. **Capacity Planning**: Better forecasting based on actual usage
5. **SLA Monitoring**: Measure against service level objectives
6. **User Experience**: Ensure AI responses are consistently fast

## Testing Strategy

1. **Unit Tests**: Test monitoring components in isolation
2. **Integration Tests**: Verify metrics are properly captured during AI calls
3. **Load Tests**: Confirm monitoring overhead is minimal under load
4. **End-to-End Tests**: Validate metrics are correctly reported to dashboards

## Next Steps

1. **Alert Configuration**: Set up alerts for latency and error thresholds
2. **Cost Reporting**: Add cost estimation based on token usage
3. **Advanced Anomaly Detection**: Implement ML-based anomaly detection for AI performance
4. **User Impact Analysis**: Correlate AI performance with user experience metrics