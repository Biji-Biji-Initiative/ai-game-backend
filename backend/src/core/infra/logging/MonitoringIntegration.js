'use strict';

import { StartupLogger } from './StartupLogger.js';
import { StartupDashboard } from './StartupDashboard.js';
import { HealthCheckDashboard } from './HealthCheckDashboard.js';
import { ApiRouteExplorer } from './ApiRouteExplorer.js';
import { MetricsDashboard } from './MetricsDashboard.js';
import { PrometheusMetrics } from './PrometheusMetrics.js';
import express from 'express';
import { infraLogger } from './domainLogger.js';

/**
 * Integrates all monitoring and visualization components
 */
class MonitoringIntegration {
  /**
   * Create a new MonitoringIntegration instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.router = express.Router();
    this.options = {
      basePath: '/monitoring',
      ...options
    };
    
    this.logger = infraLogger.child('monitoring-integration');
    
    // Initialize components
    this.startupLogger = new StartupLogger();
    this.startupDashboard = new StartupDashboard();
    this.healthCheckDashboard = new HealthCheckDashboard();
    this.apiRouteExplorer = new ApiRouteExplorer();
    this.metricsDashboard = new MetricsDashboard();
    this.prometheusMetrics = new PrometheusMetrics();
    
    this.setupRoutes();
    this.logger.info('Monitoring integration initialized');
  }

  /**
   * Set up monitoring routes
   */
  setupRoutes() {
    // Main monitoring dashboard
    this.router.get('/', this.renderDashboard.bind(this));
    
    // Mount component routers
    this.router.use('/startup', this.startupDashboard.getRouter());
    this.router.use('/health', this.healthCheckDashboard.getRouter());
    this.router.use('/api-explorer', this.apiRouteExplorer.getRouter());
    this.router.use('/metrics-dashboard', this.metricsDashboard.getRouter());
    this.router.use('/prometheus', this.prometheusMetrics.getRouter());
  }

  /**
   * Render the main monitoring dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  renderDashboard(req, res) {
    const html = this.generateDashboardHtml();
    res.send(html);
  }

  /**
   * Generate the main dashboard HTML
   * @returns {string} Dashboard HTML
   */
  generateDashboardHtml() {
    const basePath = this.options.basePath;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Monitoring Dashboard</title>
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
            .dashboard-header {
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #ddd;
            }
            .dashboard-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .dashboard-card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 20px;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .dashboard-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            .dashboard-card h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .dashboard-card p {
              color: #6c757d;
              margin-bottom: 20px;
            }
            .dashboard-link {
              display: inline-block;
              padding: 8px 16px;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 500;
              transition: background-color 0.2s;
            }
            .dashboard-link:hover {
              background-color: #0069d9;
            }
            .system-info {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 20px;
              margin-bottom: 20px;
            }
            .system-info h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 15px;
            }
            .info-item {
              padding: 10px;
              background-color: #f8f9fa;
              border-radius: 4px;
            }
            .info-label {
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 5px;
            }
            .info-value {
              font-weight: 500;
            }
            @media (max-width: 768px) {
              .dashboard-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <div class="dashboard-header">
            <h1>API Monitoring Dashboard</h1>
            <p>Comprehensive monitoring and visualization tools for your API</p>
          </div>
          
          <div class="system-info">
            <h2>System Information</h2>
            <div class="info-grid" id="system-info">
              <!-- System info will be populated by JavaScript -->
            </div>
          </div>
          
          <div class="dashboard-grid">
            <div class="dashboard-card">
              <h2>Health Check</h2>
              <p>Monitor the health of your API, database connections, and external services.</p>
              <a href="${basePath}/health" class="dashboard-link">View Health Status</a>
            </div>
            
            <div class="dashboard-card">
              <h2>API Explorer</h2>
              <p>Explore all available API routes, methods, and documentation.</p>
              <a href="${basePath}/api-explorer" class="dashboard-link">Explore API</a>
            </div>
            
            <div class="dashboard-card">
              <h2>Real-Time Metrics</h2>
              <p>View real-time metrics for system resources and API performance.</p>
              <a href="${basePath}/metrics-dashboard" class="dashboard-link">View Metrics</a>
            </div>
            
            <div class="dashboard-card">
              <h2>Startup Dashboard</h2>
              <p>Visualize the API startup process and component initialization.</p>
              <a href="${basePath}/startup" class="dashboard-link">View Startup</a>
            </div>
            
            <div class="dashboard-card">
              <h2>Prometheus Metrics</h2>
              <p>Access standardized metrics for integration with Prometheus and Grafana.</p>
              <a href="${basePath}/prometheus" class="dashboard-link">View Prometheus Docs</a>
            </div>
            
            <div class="dashboard-card">
              <h2>API Documentation</h2>
              <p>Access the OpenAPI documentation for your API.</p>
              <a href="/api-docs" class="dashboard-link">View API Docs</a>
            </div>
          </div>
          
          <script>
            // Fetch system information
            document.addEventListener('DOMContentLoaded', () => {
              const systemInfo = document.getElementById('system-info');
              
              // Get system information
              fetch('/monitoring/health/api/system-info')
                .then(response => response.json())
                .then(info => {
                  // Create system info items
                  const items = [
                    { label: 'Node.js Version', value: info.nodejs || 'Unknown' },
                    { label: 'Uptime', value: formatUptime(info.uptime) },
                    { label: 'Memory Usage', value: formatMemory(info.memory?.used, info.memory?.total) },
                    { label: 'CPU Usage', value: info.cpu ? \`\${info.cpu.toFixed(2)}%\` : 'Unknown' },
                    { label: 'Platform', value: info.platform || 'Unknown' },
                    { label: 'Environment', value: info.environment || 'Unknown' }
                  ];
                  
                  // Add items to grid
                  items.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'info-item';
                    div.innerHTML = \`
                      <div class="info-label">\${item.label}</div>
                      <div class="info-value">\${item.value}</div>
                    \`;
                    systemInfo.appendChild(div);
                  });
                })
                .catch(error => {
                  console.error('Error fetching system info:', error);
                  systemInfo.innerHTML = '<div class="info-item">Error loading system information</div>';
                });
            });
            
            // Format uptime
            function formatUptime(seconds) {
              if (!seconds && seconds !== 0) return 'Unknown';
              
              const days = Math.floor(seconds / 86400);
              const hours = Math.floor((seconds % 86400) / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);
              
              const parts = [];
              if (days > 0) parts.push(\`\${days}d\`);
              if (hours > 0) parts.push(\`\${hours}h\`);
              if (minutes > 0) parts.push(\`\${minutes}m\`);
              
              return parts.join(' ') || '< 1m';
            }
            
            // Format memory
            function formatMemory(used, total) {
              if (!used || !total) return 'Unknown';
              
              const usedMB = Math.round(used / 1024 / 1024);
              const totalMB = Math.round(total / 1024 / 1024);
              const percentage = Math.round((used / total) * 100);
              
              return \`\${usedMB} MB / \${totalMB} MB (\${percentage}%)\`;
            }
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Get the Express router for the monitoring dashboard
   * @returns {express.Router} Monitoring router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Get middleware for tracking HTTP metrics
   * @returns {Function} Express middleware
   */
  getMetricsMiddleware() {
    return this.prometheusMetrics.getMiddleware();
  }

  /**
   * Get the startup logger for tracking startup progress
   * @returns {StartupLogger} Startup logger
   */
  getStartupLogger() {
    return this.startupLogger;
  }

  /**
   * Track domain-specific metrics
   * @param {string} domain - Domain name
   * @param {string} operation - Operation name
   * @param {number} duration - Operation duration in milliseconds
   * @param {boolean} isError - Whether operation resulted in error
   */
  trackDomainOperation(domain, operation, duration, isError = false) {
    // Convert duration to seconds for Prometheus
    const durationSeconds = duration / 1000;
    
    // Track in Prometheus metrics
    this.prometheusMetrics.trackDomainMetrics(
      { path: `/${domain}/${operation}` },
      { statusCode: isError ? 500 : 200 },
      durationSeconds
    );
  }

  /**
   * Track database operation metrics
   * @param {string} operation - Database operation (query, insert, update, delete)
   * @param {string} table - Database table
   * @param {number} duration - Operation duration in milliseconds
   */
  trackDbOperation(operation, table, duration) {
    // Convert duration to seconds for Prometheus
    const durationSeconds = duration / 1000;
    
    // Track in Prometheus metrics
    this.prometheusMetrics.trackDbOperation(operation, table, durationSeconds);
  }

  /**
   * Track external API request metrics
   * @param {string} api - External API name
   * @param {string} endpoint - API endpoint
   * @param {number} status - HTTP status code
   * @param {number} duration - Request duration in milliseconds
   */
  trackExternalApiRequest(api, endpoint, status, duration) {
    // Convert duration to seconds for Prometheus
    const durationSeconds = duration / 1000;
    
    // Track in Prometheus metrics
    this.prometheusMetrics.trackExternalApiRequest(api, endpoint, status, durationSeconds);
  }
}

// Create a singleton instance
const monitoringIntegration = new MonitoringIntegration();

export { MonitoringIntegration, monitoringIntegration };
export default monitoringIntegration;
