'use strict';

import express from 'express';
import os from 'os';
import { EventEmitter } from 'events';
import { infraLogger } from './domainLogger.js';

/**
 * Creates a real-time metrics dashboard using Server-Sent Events (SSE)
 */
class MetricsDashboard {
  /**
   * Create a new MetricsDashboard instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.router = express.Router();
    this.options = {
      updateInterval: 5000, // Metrics update interval in milliseconds
      retentionPeriod: 60, // Number of data points to retain (60 = 5 minutes at 5s interval)
      ...options
    };
    
    this.metrics = {
      system: {
        memory: [],
        cpu: [],
        requests: []
      },
      domains: {}
    };
    
    this.events = new EventEmitter();
    this.clients = [];
    this.requestCounter = 0;
    this.lastRequestCount = 0;
    
    // Initialize domain metrics
    this.initializeDomainMetrics();
    
    this.setupRoutes();
    this.startMetricsCollection();
    
    this.logger = infraLogger.child('metrics-dashboard');
  }

  /**
   * Initialize domain-specific metrics
   */
  initializeDomainMetrics() {
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
      this.metrics.domains[domain] = {
        requests: [],
        errors: [],
        responseTime: []
      };
    });
  }

  /**
   * Set up dashboard routes
   */
  setupRoutes() {
    // Main dashboard route
    this.router.get('/', this.renderDashboard.bind(this));
    
    // SSE endpoint for real-time metrics
    this.router.get('/api/metrics-stream', this.handleMetricsStream.bind(this));
    
    // API endpoint to get current metrics as JSON
    this.router.get('/api/metrics', (req, res) => {
      res.json(this.metrics);
    });
    
    // Middleware to count requests
    this.router.use((req, res, next) => {
      this.requestCounter++;
      
      // Track domain-specific metrics if path contains domain name
      const path = req.path.toLowerCase();
      const startTime = Date.now();
      
      // Store original end method
      const originalEnd = res.end;
      
      // Override end method to capture response metrics
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;
        const isError = statusCode >= 400;
        
        // Check if path contains a domain name and update domain metrics
        Object.keys(this.metrics.domains).forEach(domain => {
          if (path.includes(`/${domain}/`) || path.includes(`/${domain}?`)) {
            // Add response time data point
            this.addMetricDataPoint(
              this.metrics.domains[domain].responseTime, 
              { value: responseTime, timestamp: Date.now() }
            );
            
            // Increment request count
            const lastRequestData = this.metrics.domains[domain].requests[this.metrics.domains[domain].requests.length - 1];
            const newCount = lastRequestData ? lastRequestData.value + 1 : 1;
            
            this.addMetricDataPoint(
              this.metrics.domains[domain].requests, 
              { value: newCount, timestamp: Date.now() }
            );
            
            // Track errors if status code >= 400
            if (isError) {
              const lastErrorData = this.metrics.domains[domain].errors[this.metrics.domains[domain].errors.length - 1];
              const newErrorCount = lastErrorData ? lastErrorData.value + 1 : 1;
              
              this.addMetricDataPoint(
                this.metrics.domains[domain].errors, 
                { value: newErrorCount, timestamp: Date.now() }
              );
            }
          }
        });
        
        // Call original end method
        return originalEnd.apply(res, args);
      };
      
      next();
    });
  }

  /**
   * Handle SSE connection for metrics stream
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  handleMetricsStream(req, res) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Send initial metrics
    const data = JSON.stringify(this.metrics);
    res.write(`data: ${data}\n\n`);
    
    // Add client to list
    const clientId = Date.now();
    const newClient = {
      id: clientId,
      res
    };
    this.clients.push(newClient);
    
    // Remove client on connection close
    req.on('close', () => {
      this.clients = this.clients.filter(client => client.id !== clientId);
      this.logger.debug(`SSE client disconnected: ${clientId}, remaining clients: ${this.clients.length}`);
    });
    
    this.logger.debug(`New SSE client connected: ${clientId}, total clients: ${this.clients.length}`);
  }

  /**
   * Start collecting metrics at regular intervals
   */
  startMetricsCollection() {
    // Collect initial metrics
    this.collectMetrics();
    
    // Set up interval for regular collection
    setInterval(() => {
      this.collectMetrics();
    }, this.options.updateInterval);
    
    this.logger.info(`Started metrics collection with ${this.options.updateInterval}ms interval`);
  }

  /**
   * Collect current system metrics
   */
  collectMetrics() {
    try {
      // Collect memory metrics
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsagePercent = (usedMem / totalMem) * 100;
      
      this.addMetricDataPoint(
        this.metrics.system.memory, 
        { value: memUsagePercent, timestamp: Date.now() }
      );
      
      // Collect CPU metrics
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      const loadAvg = os.loadavg()[0];
      const cpuUsagePercent = (loadAvg / cpuCount) * 100;
      
      this.addMetricDataPoint(
        this.metrics.system.cpu, 
        { value: cpuUsagePercent, timestamp: Date.now() }
      );
      
      // Collect request rate metrics (requests per interval)
      const requestsThisInterval = this.requestCounter - this.lastRequestCount;
      this.lastRequestCount = this.requestCounter;
      
      this.addMetricDataPoint(
        this.metrics.system.requests, 
        { value: requestsThisInterval, timestamp: Date.now() }
      );
      
      // Send updated metrics to all connected clients
      this.broadcastMetrics();
    } catch (error) {
      this.logger.error('Error collecting metrics', { error: error.message });
    }
  }

  /**
   * Add a data point to a metric array, respecting retention period
   * @param {Array} metricArray - Array to add data point to
   * @param {Object} dataPoint - Data point to add
   */
  addMetricDataPoint(metricArray, dataPoint) {
    metricArray.push(dataPoint);
    
    // Trim array to retention period
    if (metricArray.length > this.options.retentionPeriod) {
      metricArray.shift();
    }
  }

  /**
   * Broadcast current metrics to all connected clients
   */
  broadcastMetrics() {
    const data = JSON.stringify(this.metrics);
    
    this.clients.forEach(client => {
      client.res.write(`data: ${data}\n\n`);
    });
  }

  /**
   * Render the dashboard HTML
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  renderDashboard(req, res) {
    const html = this.generateDashboardHtml();
    res.send(html);
  }

  /**
   * Generate the dashboard HTML
   * @returns {string} Dashboard HTML
   */
  generateDashboardHtml() {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Real-Time Metrics Dashboard</title>
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
            .timestamp {
              font-size: 14px;
              color: #6c757d;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .metric-card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 15px;
            }
            .metric-card h2 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .chart-container {
              height: 200px;
              position: relative;
            }
            .current-value {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .domains-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 15px;
              margin-top: 20px;
            }
            .domain-card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 15px;
            }
            .domain-card h3 {
              margin-top: 0;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .domain-metrics {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .domain-metric {
              text-align: center;
            }
            .domain-metric-value {
              font-size: 18px;
              font-weight: bold;
              color: #2c3e50;
            }
            .domain-metric-label {
              font-size: 12px;
              color: #6c757d;
            }
            .mini-chart {
              height: 50px;
              margin-top: 10px;
            }
            .connection-status {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              margin-left: 10px;
            }
            .status-connected {
              background-color: #d4edda;
              color: #155724;
            }
            .status-disconnected {
              background-color: #f8d7da;
              color: #721c24;
            }
            @media (max-width: 768px) {
              .metrics-grid {
                grid-template-columns: 1fr;
              }
              .domains-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <div class="dashboard-header">
            <h1>Real-Time Metrics Dashboard</h1>
            <div>
              <span id="connection-status" class="connection-status status-disconnected">
                Disconnected
              </span>
              <span id="timestamp" class="timestamp">
                Last updated: Never
              </span>
            </div>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <h2>Memory Usage</h2>
              <div id="memory-value" class="current-value">-</div>
              <div class="chart-container">
                <canvas id="memoryChart"></canvas>
              </div>
            </div>
            
            <div class="metric-card">
              <h2>CPU Usage</h2>
              <div id="cpu-value" class="current-value">-</div>
              <div class="chart-container">
                <canvas id="cpuChart"></canvas>
              </div>
            </div>
            
            <div class="metric-card">
              <h2>Request Rate</h2>
              <div id="requests-value" class="current-value">-</div>
              <div class="chart-container">
                <canvas id="requestsChart"></canvas>
              </div>
            </div>
          </div>
          
          <h2>Domain Metrics</h2>
          <div class="domains-grid" id="domains-container">
            <!-- Domain cards will be populated by JavaScript -->
          </div>
          
          <script>
            // Initialize charts and SSE connection
            let memoryChart, cpuChart, requestsChart;
            let domainCharts = {};
            let eventSource;
            
            // Chart colors
            const chartColors = {
              memory: {
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)'
              },
              cpu: {
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)'
              },
              requests: {
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
              },
              responseTime: {
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)'
              },
              errors: {
                borderColor: 'rgba(255, 159, 64, 1)',
                backgroundColor: 'rgba(255, 159, 64, 0.2)'
              }
            };
            
            // Initialize charts
            function initializeCharts() {
              // Memory usage chart
              const memoryCtx = document.getElementById('memoryChart').getContext('2d');
              memoryChart = new Chart(memoryCtx, {
                type: 'line',
                data: {
                  labels: [],
                  datasets: [{
                    label: 'Memory Usage (%)',
                    data: [],
                    borderColor: chartColors.memory.borderColor,
                    backgroundColor: chartColors.memory.backgroundColor,
                    borderWidth: 2,
                    tension: 0.2,
                    fill: true
                  }]
                },
                options: getChartOptions('Memory Usage (%)', 0, 100)
              });
              
              // CPU usage chart
              const cpuCtx = document.getElementById('cpuChart').getContext('2d');
              cpuChart = new Chart(cpuCtx, {
                type: 'line',
                data: {
                  labels: [],
                  datasets: [{
                    label: 'CPU Usage (%)',
                    data: [],
                    borderColor: chartColors.cpu.borderColor,
                    backgroundColor: chartColors.cpu.backgroundColor,
                    borderWidth: 2,
                    tension: 0.2,
                    fill: true
                  }]
                },
                options: getChartOptions('CPU Usage (%)', 0, 100)
              });
              
              // Request rate chart
              const requestsCtx = document.getElementById('requestsChart').getContext('2d');
              requestsChart = new Chart(requestsCtx, {
                type: 'bar',
                data: {
                  labels: [],
                  datasets: [{
                    label: 'Requests per interval',
                    data: [],
                    borderColor: chartColors.requests.borderColor,
                    backgroundColor: chartColors.requests.backgroundColor,
                    borderWidth: 1
                  }]
                },
                options: getChartOptions('Requests', 0)
              });
            }
            
            // Get common chart options
            function getChartOptions(label, suggestedMin, suggestedMax) {
              return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false
                  }
                },
                scales: {
                  x: {
                    display: true,
                    title: {
                      display: false
                    },
                    ticks: {
                      maxTicksLimit: 6
                    }
                  },
                  y: {
                    display: true,
                    title: {
                      display: true,
                      text: label
                    },
                    suggestedMin: suggestedMin,
                    suggestedMax: suggestedMax
                  }
                }
              };
            }
            
            // Initialize domain cards and charts
            function initializeDomainCards(domains) {
              const container = document.getElementById('domains-container');
              container.innerHTML = '';
              
              Object.keys(domains).forEach(domain => {
                const card = document.createElement('div');
                card.className = 'domain-card';
                
                card.innerHTML = \`
                  <h3>\${domain}</h3>
                  <div class="domain-metrics">
                    <div class="domain-metric">
                      <div id="\${domain}-requests-value" class="domain-metric-value">-</div>
                      <div class="domain-metric-label">Requests</div>
                    </div>
                    <div class="domain-metric">
                      <div id="\${domain}-errors-value" class="domain-metric-value">-</div>
                      <div class="domain-metric-label">Errors</div>
                    </div>
                    <div class="domain-metric">
                      <div id="\${domain}-response-value" class="domain-metric-value">-</div>
                      <div class="domain-metric-label">Avg Response (ms)</div>
                    </div>
                  </div>
                  <div class="mini-chart">
                    <canvas id="\${domain}-chart"></canvas>
                  </div>
                \`;
                
                container.appendChild(card);
                
                // Initialize domain chart
                const ctx = document.getElementById(\`\${domain}-chart\`).getContext('2d');
                domainCharts[domain] = new Chart(ctx, {
                  type: 'line',
                  data: {
                    labels: [],
                    datasets: [{
                      label: 'Response Time (ms)',
                      data: [],
                      borderColor: chartColors.responseTime.borderColor,
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      tension: 0.2,
                      pointRadius: 0
                    }]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        enabled: false
                      }
                    },
                    scales: {
                      x: {
                        display: false
                      },
                      y: {
                        display: false
                      }
                    }
                  }
                });
              });
            }
            
            // Connect to SSE endpoint
            function connectToMetricsStream() {
              if (eventSource) {
                eventSource.close();
              }
              
              eventSource = new EventSource('/metrics-dashboard/api/metrics-stream');
              
              eventSource.onopen = () => {
                document.getElementById('connection-status').className = 'connection-status status-connected';
                document.getElementById('connection-status').textContent = 'Connected';
              };
              
              eventSource.onmessage = (event) => {
                const metrics = JSON.parse(event.data);
                updateDashboard(metrics);
              };
              
              eventSource.onerror = () => {
                document.getElementById('connection-status').className = 'connection-status status-disconnected';
                document.getElementById('connection-status').textContent = 'Disconnected';
                
                // Try to reconnect after a delay
                setTimeout(connectToMetricsStream, 5000);
              };
            }
            
            // Update dashboard with new metrics
            function updateDashboard(metrics) {
              // Update timestamp
              document.getElementById('timestamp').textContent = 
                \`Last updated: \${new Date().toLocaleString()}\`;
              
              // Update system metrics
              updateSystemMetrics(metrics.system);
              
              // Update domain metrics
              updateDomainMetrics(metrics.domains);
            }
            
            // Update system metrics charts and values
            function updateSystemMetrics(systemMetrics) {
              // Update memory metrics
              if (systemMetrics.memory.length > 0) {
                const memoryData = systemMetrics.memory;
                const latestMemory = memoryData[memoryData.length - 1].value.toFixed(2);
                
                document.getElementById('memory-value').textContent = \`\${latestMemory}%\`;
                
                updateChart(
                  memoryChart, 
                  memoryData.map(d => d.value), 
                  memoryData.map(d => formatTime(d.timestamp))
                );
              }
              
              // Update CPU metrics
              if (systemMetrics.cpu.length > 0) {
                const cpuData = systemMetrics.cpu;
                const latestCpu = cpuData[cpuData.length - 1].value.toFixed(2);
                
                document.getElementById('cpu-value').textContent = \`\${latestCpu}%\`;
                
                updateChart(
                  cpuChart, 
                  cpuData.map(d => d.value), 
                  cpuData.map(d => formatTime(d.timestamp))
                );
              }
              
              // Update request rate metrics
              if (systemMetrics.requests.length > 0) {
                const requestsData = systemMetrics.requests;
                const latestRequests = requestsData[requestsData.length - 1].value;
                
                document.getElementById('requests-value').textContent = latestRequests;
                
                updateChart(
                  requestsChart, 
                  requestsData.map(d => d.value), 
                  requestsData.map(d => formatTime(d.timestamp))
                );
              }
            }
            
            // Update domain metrics
            function updateDomainMetrics(domains) {
              Object.entries(domains).forEach(([domain, metrics]) => {
                // Update requests count
                if (metrics.requests.length > 0) {
                  const requestsValue = metrics.requests[metrics.requests.length - 1].value;
                  document.getElementById(\`\${domain}-requests-value\`).textContent = requestsValue;
                }
                
                // Update errors count
                if (metrics.errors.length > 0) {
                  const errorsValue = metrics.errors[metrics.errors.length - 1].value;
                  document.getElementById(\`\${domain}-errors-value\`).textContent = errorsValue;
                } else {
                  document.getElementById(\`\${domain}-errors-value\`).textContent = '0';
                }
                
                // Update response time
                if (metrics.responseTime.length > 0) {
                  const responseTimeValues = metrics.responseTime.map(d => d.value);
                  const avgResponseTime = responseTimeValues.reduce((a, b) => a + b, 0) / responseTimeValues.length;
                  
                  document.getElementById(\`\${domain}-response-value\`).textContent = 
                    avgResponseTime.toFixed(0);
                  
                  // Update domain chart
                  if (domainCharts[domain]) {
                    updateChart(
                      domainCharts[domain],
                      responseTimeValues,
                      metrics.responseTime.map(d => formatTime(d.timestamp))
                    );
                  }
                }
              });
            }
            
            // Update chart with new data
            function updateChart(chart, data, labels) {
              chart.data.labels = labels;
              chart.data.datasets[0].data = data;
              chart.update();
            }
            
            // Format timestamp to time string
            function formatTime(timestamp) {
              const date = new Date(timestamp);
              return \`\${date.getHours().toString().padStart(2, '0')}:\${date.getMinutes().toString().padStart(2, '0')}:\${date.getSeconds().toString().padStart(2, '0')}\`;
            }
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', () => {
              // Initialize charts
              initializeCharts();
              
              // Fetch initial metrics to set up domain cards
              fetch('/metrics-dashboard/api/metrics')
                .then(response => response.json())
                .then(metrics => {
                  initializeDomainCards(metrics.domains);
                  connectToMetricsStream();
                })
                .catch(error => {
                  console.error('Error fetching initial metrics:', error);
                  // Initialize with empty domains as fallback
                  initializeDomainCards({});
                  connectToMetricsStream();
                });
            });
          </script>
        </body>
      </html>
    `;
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
const metricsDashboard = new MetricsDashboard();

export { MetricsDashboard, metricsDashboard };
export default metricsDashboard;
