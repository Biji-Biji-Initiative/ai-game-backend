'use strict';

import express from 'express';
import { startupLogger } from './StartupLogger.js';

/**
 * Creates a dashboard for visualizing the application startup process
 */
class StartupDashboard {
  /**
   * Create a new StartupDashboard instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.router = express.Router();
    this.setupRoutes();
    this.options = {
      refreshInterval: 3000, // Auto-refresh interval in milliseconds
      ...options
    };
  }

  /**
   * Set up dashboard routes
   */
  setupRoutes() {
    // Main dashboard route
    this.router.get('/', this.renderDashboard.bind(this));
    
    // API endpoint to get the current startup tree as JSON
    this.router.get('/api/startup-tree', (req, res) => {
      res.json(startupLogger.getStartupTree());
    });
  }

  /**
   * Render the dashboard HTML
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  renderDashboard(req, res) {
    const startupTree = startupLogger.getStartupTree();
    const startTime = startupLogger.startTime;
    const elapsedTime = Date.now() - startTime;
    
    // Determine overall status
    const allStatuses = Object.values(startupTree).map(node => node.status);
    const overallStatus = 
      allStatuses.some(status => status === 'error') ? 'error' :
      allStatuses.some(status => status === 'pending') ? 'pending' :
      'success';
    
    const html = this.generateDashboardHtml(startupTree, overallStatus, elapsedTime);
    res.send(html);
  }

  /**
   * Generate the dashboard HTML
   * @param {Object} startupTree - The current startup tree
   * @param {string} overallStatus - Overall startup status
   * @param {number} elapsedTime - Elapsed time in milliseconds
   * @returns {string} Dashboard HTML
   */
  generateDashboardHtml(startupTree, overallStatus, elapsedTime) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Startup Dashboard</title>
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
            .status-success {
              background-color: #d4edda;
              color: #155724;
            }
            .status-pending {
              background-color: #fff3cd;
              color: #856404;
            }
            .status-error {
              background-color: #f8d7da;
              color: #721c24;
            }
            .timer {
              font-size: 16px;
              color: #6c757d;
            }
            .tree-container {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              margin-bottom: 20px;
            }
            .tree-section {
              flex: 1;
              min-width: 300px;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 15px;
            }
            .tree-section h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .tree-node {
              margin-bottom: 5px;
            }
            .tree-node-children {
              margin-left: 20px;
            }
            .node-success::before {
              content: "✅ ";
            }
            .node-pending::before {
              content: "⏳ ";
            }
            .node-error::before {
              content: "❌ ";
            }
            .node-label {
              font-weight: 500;
            }
            .node-status {
              font-size: 14px;
              margin-left: 5px;
              color: #6c757d;
            }
            .node-time {
              font-size: 12px;
              color: #6c757d;
              margin-left: 5px;
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
            .domains-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 15px;
              margin-top: 15px;
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
            @media (max-width: 768px) {
              .tree-container {
                flex-direction: column;
              }
              .domains-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
              }
            }
          </style>
        </head>
        <body>
          <div class="dashboard-header">
            <h1>API Startup Dashboard</h1>
            <div>
              <span class="status-indicator status-${overallStatus}">
                ${overallStatus.toUpperCase()}
              </span>
              <span class="timer" id="elapsed-time">
                Elapsed: ${this.formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          
          <div class="tree-container">
            <div class="tree-section">
              <h2>Core Components</h2>
              ${this.renderTreeNode(startupTree.server, 'Server')}
              ${this.renderTreeNode(startupTree.middleware, 'Middleware')}
              ${this.renderTreeNode(startupTree.routes, 'Routes')}
              ${this.renderTreeNode(startupTree.controllers, 'Controllers')}
              ${this.renderTreeNode(startupTree.services, 'Services')}
              ${this.renderTreeNode(startupTree.repositories, 'Repositories')}
            </div>
            
            <div class="tree-section">
              <h2>Domain Status</h2>
              <div class="domains-grid">
                ${this.renderDomainCards(startupTree.domains)}
              </div>
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
            // Update elapsed time
            const startTime = ${startTime};
            function updateElapsedTime() {
              const elapsed = Date.now() - startTime;
              document.getElementById('elapsed-time').textContent = 'Elapsed: ' + formatTime(elapsed);
            }
            
            // Format time helper
            function formatTime(ms) {
              const seconds = Math.floor(ms / 1000);
              const minutes = Math.floor(seconds / 60);
              const hours = Math.floor(minutes / 60);
              
              return [
                hours.toString().padStart(2, '0'),
                (minutes % 60).toString().padStart(2, '0'),
                (seconds % 60).toString().padStart(2, '0')
              ].join(':') + '.' + (ms % 1000).toString().padStart(3, '0');
            }
            
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
              
              // Update elapsed time every second
              setInterval(updateElapsedTime, 1000);
            });
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Render a tree node and its children
   * @param {Object} node - Tree node to render
   * @param {string} label - Node label
   * @param {number} level - Nesting level
   * @returns {string} HTML for the tree node
   */
  renderTreeNode(node, label, level = 0) {
    if (!node) return '';
    
    const indent = level * 20;
    const duration = node.duration ? `(${node.duration}ms)` : '';
    
    let html = `
      <div class="tree-node" style="margin-left: ${indent}px">
        <span class="node-${node.status}">
          <span class="node-label">${label}</span>
          <span class="node-status">${node.status}</span>
          <span class="node-time">${duration}</span>
        </span>
      </div>
    `;
    
    if (node.children && Object.keys(node.children).length > 0) {
      html += '<div class="tree-node-children">';
      Object.entries(node.children).forEach(([childLabel, childNode]) => {
        html += this.renderTreeNode(childNode, childLabel, level + 1);
      });
      html += '</div>';
    }
    
    return html;
  }

  /**
   * Render domain status cards
   * @param {Object} domainsNode - Domains node from startup tree
   * @returns {string} HTML for domain cards
   */
  renderDomainCards(domainsNode) {
    if (!domainsNode || !domainsNode.children) return '';
    
    let html = '';
    
    Object.entries(domainsNode.children).forEach(([domain, node]) => {
      const statusClass = `node-${node.status}`;
      const duration = node.duration ? `${node.duration}ms` : 'In progress...';
      
      html += `
        <div class="domain-card">
          <div class="domain-header">
            <span class="${statusClass}">${domain}</span>
          </div>
          <div class="domain-details">
            <div>Status: ${node.status}</div>
            <div>Duration: ${duration}</div>
          </div>
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Format time in milliseconds to a readable string
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0')
    ].join(':') + '.' + (ms % 1000).toString().padStart(3, '0');
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
const startupDashboard = new StartupDashboard();

export { StartupDashboard, startupDashboard };
export default startupDashboard;
