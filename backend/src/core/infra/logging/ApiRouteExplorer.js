'use strict';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { infraLogger } from './domainLogger.js';

/**
 * Creates an interactive explorer for API routes
 */
class ApiRouteExplorer {
  /**
   * Create a new ApiRouteExplorer instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.router = express.Router();
    this.options = {
      openApiSpecPath: path.resolve('./openapi/generated/openapi-spec.json'),
      ...options
    };
    
    this.setupRoutes();
    this.logger = infraLogger.child('api-explorer');
  }

  /**
   * Set up explorer routes
   */
  setupRoutes() {
    // Main explorer route
    this.router.get('/', this.renderExplorer.bind(this));
    
    // API endpoint to get OpenAPI spec as JSON
    this.router.get('/api/openapi-spec', (req, res) => {
      try {
        if (fs.existsSync(this.options.openApiSpecPath)) {
          const spec = JSON.parse(fs.readFileSync(this.options.openApiSpecPath, 'utf8'));
          res.json(spec);
        } else {
          res.status(404).json({ error: 'OpenAPI specification not found' });
        }
      } catch (error) {
        this.logger.error('Error serving OpenAPI spec', { error: error.message });
        res.status(500).json({ error: 'Failed to read OpenAPI specification' });
      }
    });
    
    // API endpoint to get route statistics
    this.router.get('/api/route-stats', (req, res) => {
      try {
        const stats = this.getRouteStatistics();
        res.json(stats);
      } catch (error) {
        this.logger.error('Error getting route statistics', { error: error.message });
        res.status(500).json({ error: 'Failed to get route statistics' });
      }
    });
  }

  /**
   * Render the explorer HTML
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async renderExplorer(req, res) {
    try {
      let spec = null;
      
      // Try to read the OpenAPI spec
      if (fs.existsSync(this.options.openApiSpecPath)) {
        spec = JSON.parse(fs.readFileSync(this.options.openApiSpecPath, 'utf8'));
      }
      
      const html = this.generateExplorerHtml(spec);
      res.send(html);
    } catch (error) {
      this.logger.error('Error rendering API explorer', { error: error.message });
      res.status(500).send(`
        <html>
          <head><title>API Explorer Error</title></head>
          <body>
            <h1>Error Loading API Explorer</h1>
            <p>${error.message}</p>
            <p><a href="/">Retry</a></p>
          </body>
        </html>
      `);
    }
  }

  /**
   * Get statistics about API routes
   * @returns {Object} Route statistics
   */
  getRouteStatistics() {
    try {
      if (!fs.existsSync(this.options.openApiSpecPath)) {
        return {
          error: 'OpenAPI specification not found'
        };
      }
      
      const spec = JSON.parse(fs.readFileSync(this.options.openApiSpecPath, 'utf8'));
      
      // Count routes by path, method, and tag
      const stats = {
        totalPaths: 0,
        totalOperations: 0,
        methodCounts: {},
        tagCounts: {},
        securityCounts: {
          secured: 0,
          unsecured: 0
        }
      };
      
      if (spec.paths) {
        stats.totalPaths = Object.keys(spec.paths).length;
        
        // Count operations by method and tag
        Object.entries(spec.paths).forEach(([path, pathItem]) => {
          Object.entries(pathItem).forEach(([method, operation]) => {
            if (method !== 'parameters' && method !== 'servers') {
              stats.totalOperations++;
              
              // Count by method
              stats.methodCounts[method] = (stats.methodCounts[method] || 0) + 1;
              
              // Count by tag
              if (operation.tags && operation.tags.length > 0) {
                operation.tags.forEach(tag => {
                  stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
                });
              } else {
                stats.tagCounts.untagged = (stats.tagCounts.untagged || 0) + 1;
              }
              
              // Count secured vs unsecured
              if (operation.security && operation.security.length > 0) {
                stats.securityCounts.secured++;
              } else {
                stats.securityCounts.unsecured++;
              }
            }
          });
        });
      }
      
      return stats;
    } catch (error) {
      this.logger.error('Error calculating route statistics', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Generate the explorer HTML
   * @param {Object} spec - OpenAPI specification
   * @returns {string} Explorer HTML
   */
  generateExplorerHtml(spec) {
    // Get route statistics if spec is available
    const stats = spec ? this.getRouteStatistics() : null;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Route Explorer</title>
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
            .explorer-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #ddd;
            }
            .stats-container {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              margin-bottom: 20px;
            }
            .stats-card {
              flex: 1;
              min-width: 200px;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 15px;
            }
            .stats-card h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .stats-value {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
            }
            .stats-label {
              font-size: 14px;
              color: #6c757d;
            }
            .chart-container {
              height: 200px;
              margin-top: 15px;
            }
            .routes-container {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 15px;
              margin-bottom: 20px;
            }
            .routes-container h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .routes-filter {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-bottom: 15px;
            }
            .filter-input {
              flex: 1;
              min-width: 200px;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .filter-select {
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .routes-table {
              width: 100%;
              border-collapse: collapse;
            }
            .routes-table th, .routes-table td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #eee;
            }
            .routes-table th {
              background-color: #f8f9fa;
              font-weight: 500;
            }
            .method-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 12px;
              text-transform: uppercase;
            }
            .method-get {
              background-color: #d1ecf1;
              color: #0c5460;
            }
            .method-post {
              background-color: #d4edda;
              color: #155724;
            }
            .method-put {
              background-color: #fff3cd;
              color: #856404;
            }
            .method-delete {
              background-color: #f8d7da;
              color: #721c24;
            }
            .method-patch {
              background-color: #e2e3e5;
              color: #383d41;
            }
            .tag-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 12px;
              background-color: #e9ecef;
              color: #495057;
              margin-right: 5px;
              margin-bottom: 5px;
            }
            .security-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 12px;
              margin-left: 5px;
            }
            .security-secured {
              background-color: #d4edda;
              color: #155724;
            }
            .security-unsecured {
              background-color: #f8d7da;
              color: #721c24;
            }
            .route-details {
              background-color: #f8f9fa;
              padding: 10px;
              border-radius: 4px;
              margin-top: 5px;
              display: none;
            }
            .route-toggle {
              background: none;
              border: none;
              color: #007bff;
              cursor: pointer;
              font-size: 12px;
              padding: 0;
              margin-left: 10px;
            }
            .no-spec {
              text-align: center;
              padding: 40px;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .no-spec h2 {
              color: #6c757d;
            }
            .no-spec p {
              margin-bottom: 20px;
            }
            @media (max-width: 768px) {
              .stats-container {
                flex-direction: column;
              }
              .routes-filter {
                flex-direction: column;
              }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <div class="explorer-header">
            <h1>API Route Explorer</h1>
          </div>
          
          ${spec ? `
            <div class="stats-container">
              <div class="stats-card">
                <h2>Overview</h2>
                <div>
                  <div class="stats-value">${stats.totalPaths}</div>
                  <div class="stats-label">Total Paths</div>
                </div>
                <div style="margin-top: 15px;">
                  <div class="stats-value">${stats.totalOperations}</div>
                  <div class="stats-label">Total Operations</div>
                </div>
              </div>
              
              <div class="stats-card">
                <h2>Methods</h2>
                <div class="chart-container">
                  <canvas id="methodsChart"></canvas>
                </div>
              </div>
              
              <div class="stats-card">
                <h2>Tags</h2>
                <div class="chart-container">
                  <canvas id="tagsChart"></canvas>
                </div>
              </div>
              
              <div class="stats-card">
                <h2>Security</h2>
                <div class="chart-container">
                  <canvas id="securityChart"></canvas>
                </div>
              </div>
            </div>
            
            <div class="routes-container">
              <h2>API Routes</h2>
              
              <div class="routes-filter">
                <input type="text" id="path-filter" class="filter-input" placeholder="Filter by path...">
                <select id="method-filter" class="filter-select">
                  <option value="">All Methods</option>
                  ${Object.keys(stats.methodCounts || {}).map(method => 
                    `<option value="${method}">${method.toUpperCase()}</option>`
                  ).join('')}
                </select>
                <select id="tag-filter" class="filter-select">
                  <option value="">All Tags</option>
                  ${Object.keys(stats.tagCounts || {}).map(tag => 
                    `<option value="${tag}">${tag}</option>`
                  ).join('')}
                </select>
                <select id="security-filter" class="filter-select">
                  <option value="">All Security</option>
                  <option value="secured">Secured</option>
                  <option value="unsecured">Unsecured</option>
                </select>
              </div>
              
              <table class="routes-table" id="routes-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Summary</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody id="routes-body">
                  <!-- Routes will be populated by JavaScript -->
                </tbody>
              </table>
            </div>
            
            <script>
              // Initialize charts
              document.addEventListener('DOMContentLoaded', () => {
                // Methods chart
                const methodsCtx = document.getElementById('methodsChart').getContext('2d');
                const methodsData = ${JSON.stringify(stats.methodCounts || {})};
                new Chart(methodsCtx, {
                  type: 'bar',
                  data: {
                    labels: Object.keys(methodsData).map(m => m.toUpperCase()),
                    datasets: [{
                      label: 'Operations by Method',
                      data: Object.values(methodsData),
                      backgroundColor: [
                        '#d1ecf1', // GET
                        '#d4edda', // POST
                        '#fff3cd', // PUT
                        '#f8d7da', // DELETE
                        '#e2e3e5', // PATCH
                        '#f5f5f5'  // Others
                      ]
                    }]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }
                });
                
                // Tags chart
                const tagsCtx = document.getElementById('tagsChart').getContext('2d');
                const tagsData = ${JSON.stringify(stats.tagCounts || {})};
                new Chart(tagsCtx, {
                  type: 'pie',
                  data: {
                    labels: Object.keys(tagsData),
                    datasets: [{
                      data: Object.values(tagsData),
                      backgroundColor: [
                        '#4dc9f6',
                        '#f67019',
                        '#f53794',
                        '#537bc4',
                        '#acc236',
                        '#166a8f',
                        '#00a950',
                        '#58595b',
                        '#8549ba'
                      ]
                    }]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 10,
                          font: {
                            size: 10
                          }
                        }
                      }
                    }
                  }
                });
                
                // Security chart
                const securityCtx = document.getElementById('securityChart').getContext('2d');
                const securityData = ${JSON.stringify(stats.securityCounts || { secured: 0, unsecured: 0 })};
                new Chart(securityCtx, {
                  type: 'pie',
                  data: {
                    labels: ['Secured', 'Unsecured'],
                    datasets: [{
                      data: [securityData.secured, securityData.unsecured],
                      backgroundColor: [
                        '#d4edda', // Secured
                        '#f8d7da'  // Unsecured
                      ]
                    }]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false
                  }
                });
                
                // Populate routes table
                populateRoutesTable();
                
                // Set up filters
                document.getElementById('path-filter').addEventListener('input', filterRoutes);
                document.getElementById('method-filter').addEventListener('change', filterRoutes);
                document.getElementById('tag-filter').addEventListener('change', filterRoutes);
                document.getElementById('security-filter').addEventListener('change', filterRoutes);
              });
              
              // Fetch OpenAPI spec and populate routes table
              async function populateRoutesTable() {
                try {
                  const response = await fetch('/api-explorer/api/openapi-spec');
                  const spec = await response.json();
                  
                  const routesBody = document.getElementById('routes-body');
                  routesBody.innerHTML = '';
                  
                  if (!spec.paths) {
                    routesBody.innerHTML = '<tr><td colspan="4">No routes found</td></tr>';
                    return;
                  }
                  
                  // Build routes array
                  const routes = [];
                  Object.entries(spec.paths).forEach(([path, pathItem]) => {
                    Object.entries(pathItem).forEach(([method, operation]) => {
                      if (method !== 'parameters' && method !== 'servers') {
                        routes.push({
                          path,
                          method,
                          summary: operation.summary || '',
                          description: operation.description || '',
                          tags: operation.tags || [],
                          security: operation.security && operation.security.length > 0,
                          operation
                        });
                      }
                    });
                  });
                  
                  // Sort routes by path
                  routes.sort((a, b) => a.path.localeCompare(b.path));
                  
                  // Add routes to table
                  routes.forEach((route, index) => {
                    const row = document.createElement('tr');
                    row.dataset.path = route.path;
                    row.dataset.method = route.method;
                    row.dataset.tags = route.tags.join(',');
                    row.dataset.security = route.security ? 'secured' : 'unsecured';
                    
                    row.innerHTML = \`
                      <td>
                        <span class="method-badge method-\${route.method}">\${route.method.toUpperCase()}</span>
                      </td>
                      <td>\${route.path}</td>
                      <td>
                        \${route.summary}
                        <button class="route-toggle" data-index="\${index}">Details</button>
                        <div class="route-details" id="route-details-\${index}">
                          <p>\${route.description || 'No description'}</p>
                          <pre>\${JSON.stringify(route.operation, null, 2)}</pre>
                        </div>
                      </td>
                      <td>
                        \${route.tags.map(tag => \`<span class="tag-badge">\${tag}</span>\`).join('')}
                        \${route.security ? 
                          '<span class="security-badge security-secured">Secured</span>' : 
                          '<span class="security-badge security-unsecured">Unsecured</span>'
                        }
                      </td>
                    \`;
                    
                    routesBody.appendChild(row);
                  });
                  
                  // Set up route detail toggles
                  document.querySelectorAll('.route-toggle').forEach(button => {
                    button.addEventListener('click', (e) => {
                      const index = e.target.dataset.index;
                      const details = document.getElementById(\`route-details-\${index}\`);
                      
                      if (details.style.display === 'none' || !details.style.display) {
                        details.style.display = 'block';
                        e.target.textContent = 'Hide';
                      } else {
                        details.style.display = 'none';
                        e.target.textContent = 'Details';
                      }
                    });
                  });
                } catch (error) {
                  console.error('Error loading OpenAPI spec:', error);
                  document.getElementById('routes-body').innerHTML = 
                    \`<tr><td colspan="4">Error loading routes: \${error.message}</td></tr>\`;
                }
              }
              
              // Filter routes based on user input
              function filterRoutes() {
                const pathFilter = document.getElementById('path-filter').value.toLowerCase();
                const methodFilter = document.getElementById('method-filter').value;
                const tagFilter = document.getElementById('tag-filter').value;
                const securityFilter = document.getElementById('security-filter').value;
                
                const rows = document.querySelectorAll('#routes-table tbody tr');
                
                rows.forEach(row => {
                  const path = row.dataset.path.toLowerCase();
                  const method = row.dataset.method;
                  const tags = row.dataset.tags;
                  const security = row.dataset.security;
                  
                  const pathMatch = path.includes(pathFilter);
                  const methodMatch = !methodFilter || method === methodFilter;
                  const tagMatch = !tagFilter || tags.includes(tagFilter);
                  const securityMatch = !securityFilter || security === securityFilter;
                  
                  if (pathMatch && methodMatch && tagMatch && securityMatch) {
                    row.style.display = '';
                  } else {
                    row.style.display = 'none';
                  }
                });
              }
            </script>
          ` : `
            <div class="no-spec">
              <h2>OpenAPI Specification Not Found</h2>
              <p>The API explorer requires an OpenAPI specification to display routes.</p>
              <p>Expected location: ${this.options.openApiSpecPath}</p>
            </div>
          `}
        </body>
      </html>
    `;
  }

  /**
   * Get the Express router for the explorer
   * @returns {express.Router} Explorer router
   */
  getRouter() {
    return this.router;
  }
}

// Create a singleton instance
const apiRouteExplorer = new ApiRouteExplorer();

export { ApiRouteExplorer, apiRouteExplorer };
export default apiRouteExplorer;
