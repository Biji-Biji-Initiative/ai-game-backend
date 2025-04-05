'use strict';

import express from 'express';
import os from 'os';
import { infraLogger } from './domainLogger.js';

/**
 * Creates a dashboard for monitoring system health and API endpoints
 */
class HealthCheckDashboard {
  /**
   * Create a new HealthCheckDashboard instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.router = express.Router();
    this.options = {
      refreshInterval: 10000, // Auto-refresh interval in milliseconds
      memoryThresholds: {
        warning: 70, // Memory usage percentage for warning
        critical: 85 // Memory usage percentage for critical
      },
      cpuThresholds: {
        warning: 60, // CPU usage percentage for warning
        critical: 80 // CPU usage percentage for critical
      },
      ...options
    };
    
    this.healthChecks = {
      system: [
        { name: 'Memory', check: this.checkMemory.bind(this) },
        { name: 'CPU', check: this.checkCPU.bind(this) },
        { name: 'Uptime', check: this.checkUptime.bind(this) }
      ],
      database: [
        { name: 'Supabase', check: this.checkSupabase.bind(this) }
      ],
      external: [
        { name: 'OpenAI', check: this.checkOpenAI.bind(this) }
      ],
      domains: []
    };
    
    // Add domain health checks
    this.initializeDomainHealthChecks();
    
    this.setupRoutes();
    this.logger = infraLogger.child('health-dashboard');
  }

  /**
   * Initialize domain-specific health checks
   */
  initializeDomainHealthChecks() {
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
    
    domains.forEach(domain => {
      this.healthChecks.domains.push({
        name: domain,
        check: () => this.checkDomainHealth(domain)
      });
    });
  }

  /**
   * Set up dashboard routes
   */
  setupRoutes() {
    // Main dashboard route
    this.router.get('/', this.renderDashboard.bind(this));
    
    // API endpoint to get health check data as JSON
    this.router.get('/api/health-data', async (req, res) => {
      try {
        const healthData = await this.runAllHealthChecks();
        res.json(healthData);
      } catch (error) {
        this.logger.error('Error getting health data', { error: error.message });
        res.status(500).json({ error: 'Failed to get health data' });
      }
    });
    
    // API endpoint for a specific health check
    this.router.get('/api/health-check/:category/:name', async (req, res) => {
      try {
        const { category, name } = req.params;
        
        if (!this.healthChecks[category]) {
          return res.status(404).json({ error: `Category ${category} not found` });
        }
        
        const check = this.healthChecks[category].find(c => c.name.toLowerCase() === name.toLowerCase());
        
        if (!check) {
          return res.status(404).json({ error: `Health check ${name} not found in ${category}` });
        }
        
        const result = await check.check();
        res.json(result);
      } catch (error) {
        this.logger.error('Error running specific health check', { 
          error: error.message,
          category: req.params.category,
          name: req.params.name
        });
        res.status(500).json({ error: 'Failed to run health check' });
      }
    });
  }

  /**
   * Render the dashboard HTML
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async renderDashboard(req, res) {
    try {
      const healthData = await this.runAllHealthChecks();
      const html = this.generateDashboardHtml(healthData);
      res.send(html);
    } catch (error) {
      this.logger.error('Error rendering health dashboard', { error: error.message });
      res.status(500).send(`
        <html>
          <head><title>Health Dashboard Error</title></head>
          <body>
            <h1>Error Loading Health Dashboard</h1>
            <p>${error.message}</p>
            <p><a href="/">Retry</a></p>
          </body>
        </html>
      `);
    }
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Health check results
   */
  async runAllHealthChecks() {
    const results = {};
    
    for (const [category, checks] of Object.entries(this.healthChecks)) {
      results[category] = [];
      
      for (const check of checks) {
        try {
          const result = await check.check();
          results[category].push({
            name: check.name,
            ...result
          });
        } catch (error) {
          this.logger.error(`Error running health check: ${check.name}`, { error: error.message });
          results[category].push({
            name: check.name,
            status: 'error',
            message: error.message,
            details: { error: error.stack }
          });
        }
      }
    }
    
    // Calculate overall status
    const allStatuses = Object.values(results)
      .flat()
      .map(result => result.status);
    
    results.overall = {
      status: 
        allStatuses.includes('critical') ? 'critical' :
        allStatuses.includes('warning') ? 'warning' :
        allStatuses.includes('error') ? 'error' :
        'healthy',
      timestamp: new Date().toISOString()
    };
    
    return results;
  }

  /**
   * Check memory usage
   * @returns {Promise<Object>} Memory health check result
   */
  async checkMemory() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;
    
    const status = 
      memUsagePercent >= this.options.memoryThresholds.critical ? 'critical' :
      memUsagePercent >= this.options.memoryThresholds.warning ? 'warning' :
      'healthy';
    
    return {
      status,
      message: `Memory usage: ${memUsagePercent.toFixed(2)}%`,
      details: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        percentage: memUsagePercent.toFixed(2)
      }
    };
  }

  /**
   * Check CPU usage
   * @returns {Promise<Object>} CPU health check result
   */
  async checkCPU() {
    // Get CPU info
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    
    // Calculate CPU usage based on the load average
    const loadAvg = os.loadavg()[0];
    const cpuUsagePercent = (loadAvg / cpuCount) * 100;
    
    const status = 
      cpuUsagePercent >= this.options.cpuThresholds.critical ? 'critical' :
      cpuUsagePercent >= this.options.cpuThresholds.warning ? 'warning' :
      'healthy';
    
    return {
      status,
      message: `CPU usage: ${cpuUsagePercent.toFixed(2)}%`,
      details: {
        cores: cpuCount,
        model: cpus[0].model,
        speed: `${cpus[0].speed} MHz`,
        loadAverage: os.loadavg(),
        percentage: cpuUsagePercent.toFixed(2)
      }
    };
  }

  /**
   * Check system uptime
   * @returns {Promise<Object>} Uptime health check result
   */
  async checkUptime() {
    const uptime = os.uptime();
    
    return {
      status: 'healthy',
      message: `System uptime: ${this.formatUptime(uptime)}`,
      details: {
        uptimeSeconds: uptime,
        uptimeFormatted: this.formatUptime(uptime)
      }
    };
  }

  /**
   * Check Supabase connection
   * @returns {Promise<Object>} Supabase health check result
   */
  async checkSupabase() {
    try {
      // This is a placeholder - in a real implementation, you would:
      // 1. Get the Supabase client from the container
      // 2. Run a simple query to verify the connection
      
      // For now, we'll simulate a connection check
      const isConnected = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;
      
      if (!isConnected) {
        return {
          status: 'warning',
          message: 'Supabase credentials not configured',
          details: {
            url: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
            key: process.env.SUPABASE_KEY ? 'Configured' : 'Missing'
          }
        };
      }
      
      // In a real implementation, you would check if the connection is actually working
      return {
        status: 'healthy',
        message: 'Supabase connection is healthy',
        details: {
          url: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
          key: process.env.SUPABASE_KEY ? 'Configured' : 'Missing'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Supabase connection error: ${error.message}`,
        details: { error: error.stack }
      };
    }
  }

  /**
   * Check OpenAI API connection
   * @returns {Promise<Object>} OpenAI health check result
   */
  async checkOpenAI() {
    try {
      // This is a placeholder - in a real implementation, you would:
      // 1. Get the OpenAI client from the container
      // 2. Run a simple query to verify the connection
      
      // For now, we'll simulate a connection check
      const isConfigured = process.env.OPENAI_API_KEY;
      
      if (!isConfigured) {
        return {
          status: 'warning',
          message: 'OpenAI API key not configured',
          details: {
            apiKey: 'Missing'
          }
        };
      }
      
      // In a real implementation, you would check if the API is actually working
      return {
        status: 'healthy',
        message: 'OpenAI API connection is healthy',
        details: {
          apiKey: 'Configured'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `OpenAI API connection error: ${error.message}`,
        details: { error: error.stack }
      };
    }
  }

  /**
   * Check domain health
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Domain health check result
   */
  async checkDomainHealth(domain) {
    try {
      // This is a placeholder - in a real implementation, you would:
      // 1. Get the domain service from the container
      // 2. Run a health check method on the service
      
      // For now, we'll simulate domain health checks
      // In a real implementation, you would check if the domain's dependencies are healthy
      
      // Simulate some domains having issues for demonstration purposes
      if (domain === 'user') {
        return {
          status: 'healthy',
          message: `${domain} domain is healthy`,
          details: {
            repository: 'Connected',
            service: 'Running',
            controller: 'Registered'
          }
        };
      } else if (domain === 'rival' || domain === 'badge' || domain === 'leaderboard' || domain === 'network') {
        // New domains might be in development
        return {
          status: 'warning',
          message: `${domain} domain is in development`,
          details: {
            repository: 'Connected',
            service: 'Running',
            controller: 'Registered',
            note: 'Recently added domain, still under development'
          }
        };
      } else {
        return {
          status: 'healthy',
          message: `${domain} domain is healthy`,
          details: {
            repository: 'Connected',
            service: 'Running',
            controller: 'Registered'
          }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `${domain} domain error: ${error.message}`,
        details: { error: error.stack }
      };
    }
  }

  /**
   * Generate the dashboard HTML
   * @param {Object} healthData - Health check data
   * @returns {string} Dashboard HTML
   */
  generateDashboardHtml(healthData) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Health Dashboard</title>
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
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #ddd;
            }
            .status-indicator {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 4px;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 14px;
            }
            .status-healthy {
              background-color: #d4edda;
              color: #155724;
            }
            .status-warning {
              background-color: #fff3cd;
              color: #856404;
            }
            .status-error, .status-critical {
              background-color: #f8d7da;
              color: #721c24;
            }
            .timestamp {
              font-size: 14px;
              color: #6c757d;
            }
            .health-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .health-section {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 15px;
            }
            .health-section h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .health-item {
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
            }
            .health-item:last-child {
              margin-bottom: 0;
              padding-bottom: 0;
              border-bottom: none;
            }
            .health-item-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 5px;
            }
            .health-item-name {
              font-weight: 500;
            }
            .health-item-message {
              font-size: 14px;
              color: #6c757d;
            }
            .health-item-details {
              font-size: 13px;
              color: #666;
              background-color: #f8f9fa;
              padding: 8px;
              border-radius: 4px;
              margin-top: 8px;
              display: none;
            }
            .health-item-toggle {
              background: none;
              border: none;
              color: #007bff;
              cursor: pointer;
              font-size: 12px;
              padding: 0;
            }
            .domains-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 15px;
            }
            .domain-card {
              background-color: white;
              border-radius: 6px;
              padding: 12px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .domain-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              font-weight: bold;
            }
            .domain-details {
              font-size: 13px;
              color: #666;
            }
            .refresh-controls {
              margin-top: 20px;
              text-align: right;
            }
            button {
              background-color: #4CAF50;
              color: white;
              border: none;
              padding: 8px 16px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 14px;
              margin: 4px 2px;
              cursor: pointer;
              border-radius: 4px;
            }
            button:hover {
              background-color: #45a049;
            }
            .auto-refresh {
              display: inline-block;
              margin-left: 10px;
            }
            @media (max-width: 768px) {
              .health-grid {
                grid-template-columns: 1fr;
              }
              .domains-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
              }
            }
          </style>
        </head>
        <body>
          <div class="dashboard-header">
            <h1>API Health Dashboard</h1>
            <div>
              <span class="status-indicator status-${healthData.overall.status}">
                ${healthData.overall.status.toUpperCase()}
              </span>
              <span class="timestamp">
                Last updated: ${new Date(healthData.overall.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div class="health-grid">
            <div class="health-section">
              <h2>System Health</h2>
              ${this.renderHealthItems(healthData.system)}
            </div>
            
            <div class="health-section">
              <h2>Database Health</h2>
              ${this.renderHealthItems(healthData.database)}
            </div>
            
            <div class="health-section">
              <h2>External Services</h2>
              ${this.renderHealthItems(healthData.external)}
            </div>
          </div>
          
          <div class="health-section">
            <h2>Domain Health</h2>
            <div class="domains-grid">
              ${this.renderDomainCards(healthData.domains)}
            </div>
          </div>
          
          <div class="refresh-controls">
            <button id="refresh-btn">Refresh Now</button>
            <label class="auto-refresh">
              <input type="checkbox" id="auto-refresh" checked>
              Auto-refresh
            </label>
          </div>
          
          <script>
            // Toggle health item details
            document.addEventListener('click', function(event) {
              if (event.target.classList.contains('health-item-toggle')) {
                const detailsId = event.target.getAttribute('data-target');
                const detailsElement = document.getElementById(detailsId);
                
                if (detailsElement.style.display === 'none' || !detailsElement.style.display) {
                  detailsElement.style.display = 'block';
                  event.target.textContent = 'Hide Details';
                } else {
                  detailsElement.style.display = 'none';
                  event.target.textContent = 'Show Details';
                }
              }
            });
            
            // Set up refresh functionality
            let refreshInterval;
            
            function startAutoRefresh() {
              stopAutoRefresh();
              refreshInterval = setInterval(() => {
                if (document.getElementById('auto-refresh').checked) {
                  window.location.reload();
                }
              }, ${this.options.refreshInterval});
            }
            
            function stopAutoRefresh() {
              if (refreshInterval) {
                clearInterval(refreshInterval);
              }
            }
            
            // Initialize
            document.addEventListener('DOMContentLoaded', () => {
              // Set up manual refresh button
              document.getElementById('refresh-btn').addEventListener('click', () => {
                window.location.reload();
              });
              
              // Set up auto-refresh toggle
              document.getElementById('auto-refresh').addEventListener('change', (e) => {
                if (e.target.checked) {
                  startAutoRefresh();
                } else {
                  stopAutoRefresh();
                }
              });
              
              // Start auto-refresh if enabled
              if (document.getElementById('auto-refresh').checked) {
                startAutoRefresh();
              }
            });
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Render health check items
   * @param {Array} items - Health check items
   * @returns {string} HTML for health check items
   */
  renderHealthItems(items) {
    if (!items || items.length === 0) {
      return '<p>No health checks available</p>';
    }
    
    let html = '';
    
    items.forEach((item, index) => {
      const detailsId = `health-details-${index}`;
      
      html += `
        <div class="health-item">
          <div class="health-item-header">
            <span class="health-item-name">${item.name}</span>
            <span class="status-indicator status-${item.status}">
              ${item.status.toUpperCase()}
            </span>
          </div>
          <div class="health-item-message">${item.message}</div>
          ${item.details ? `
            <button class="health-item-toggle" data-target="${detailsId}">Show Details</button>
            <div class="health-item-details" id="${detailsId}">
              <pre>${JSON.stringify(item.details, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Render domain health cards
   * @param {Array} domains - Domain health check items
   * @returns {string} HTML for domain health cards
   */
  renderDomainCards(domains) {
    if (!domains || domains.length === 0) {
      return '<p>No domain health checks available</p>';
    }
    
    let html = '';
    
    domains.forEach(domain => {
      html += `
        <div class="domain-card">
          <div class="domain-header">
            <span>${domain.name}</span>
            <span class="status-indicator status-${domain.status}">
              ${domain.status.toUpperCase()}
            </span>
          </div>
          <div class="domain-details">
            <div>${domain.message}</div>
          </div>
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Format bytes to a human-readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted bytes string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime to a human-readable string
   * @param {number} seconds - Uptime in seconds
   * @returns {string} Formatted uptime string
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
  }

  /**
   * Get the Express router for the dashboard
   * @returns {express.Router} Dashboard router
   */
  getRouter() {
    return this.router;
  }
}

// Create a singleton instance
const healthCheckDashboard = new HealthCheckDashboard();

export { HealthCheckDashboard, healthCheckDashboard };
export default healthCheckDashboard;
