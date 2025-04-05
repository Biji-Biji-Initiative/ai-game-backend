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
    
    // Initialize logger first to avoid undefined errors
    this.logger = infraLogger.child({ component: 'metrics-dashboard' });
    
    // Initialize domain metrics
    this.initializeDomainMetrics();
    
    this.setupRoutes();
    this.startMetricsCollection();
  }

  /**
   * Initialize domain-specific metrics
   */
  initializeDomainMetrics() {
    // Add domain-specific metrics here
    const domains = ['user', 'auth', 'challenge', 'personality', 'progress', 'evaluation'];
    
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
    // Main dashboard page
    this.router.get('/', (req, res) => {
      res.send(this.generateDashboardHtml());
    });
    
    // SSE endpoint for real-time updates
    this.router.get('/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Send initial data
      const data = JSON.stringify(this.metrics);
      res.write(`data: ${data}\n\n`);
      
      // Add client to list
      const clientId = Date.now();
      const newClient = {
        id: clientId,
        res
      };
      this.clients.push(newClient);
      
      this.logger.debug(`Client connected to metrics stream: ${clientId}`);
      
      // Remove client on connection close
      req.on('close', () => {
        this.logger.debug(`Client disconnected from metrics stream: ${clientId}`);
        this.clients = this.clients.filter(client => client.id !== clientId);
      });
    });
    
    // API endpoint to get current metrics as JSON
    this.router.get('/api/metrics', (req, res) => {
      res.json(this.metrics);
    });
    
    // System info endpoint
    this.router.get('/api/system', (req, res) => {
      res.json(this.getSystemInfo());
    });
  }

  /**
   * Start collecting metrics at regular intervals
   */
  startMetricsCollection() {
    this.logger.info(`Started metrics collection with ${this.options.updateInterval}ms interval`);
    
    setInterval(() => {
      this.collectMetrics();
      this.broadcastMetrics();
    }, this.options.updateInterval);
  }

  /**
   * Collect current system metrics
   */
  collectMetrics() {
    try {
      // System memory
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = Math.round((usedMem / totalMem) * 100);
      
      // Process memory
      const processMemory = process.memoryUsage();
      
      // CPU load
      const cpuLoad = os.loadavg()[0];
      
      // Request rate (requests per interval)
      const currentRequests = this.requestCounter;
      const requestRate = currentRequests - this.lastRequestCount;
      this.lastRequestCount = currentRequests;
      
      // Add to metrics history
      this.addMetric('system', 'memory', {
        timestamp: Date.now(),
        systemUsage: memoryUsage,
        total: totalMem,
        free: freeMem,
        used: usedMem,
        heapUsed: processMemory.heapUsed,
        heapTotal: processMemory.heapTotal,
        rss: processMemory.rss
      });
      
      this.addMetric('system', 'cpu', {
        timestamp: Date.now(),
        load: cpuLoad
      });
      
      this.addMetric('system', 'requests', {
        timestamp: Date.now(),
        rate: requestRate,
        total: currentRequests
      });
    } catch (error) {
      this.logger.error('Error collecting metrics', { error: error.message });
    }
  }

  /**
   * Add a metric data point to the specified category
   * @param {string} domain - Metric domain (system or domain name)
   * @param {string} category - Metric category
   * @param {Object} data - Metric data
   */
  addMetric(domain, category, data) {
    try {
      let target;
      
      if (domain === 'system') {
        target = this.metrics.system[category];
      } else if (this.metrics.domains[domain]) {
        target = this.metrics.domains[domain][category];
      } else {
        // Create domain if it doesn't exist
        this.metrics.domains[domain] = this.metrics.domains[domain] || {};
        this.metrics.domains[domain][category] = this.metrics.domains[domain][category] || [];
        target = this.metrics.domains[domain][category];
      }
      
      if (Array.isArray(target)) {
        // Add new data point
        target.push(data);
        
        // Trim to retention period
        if (target.length > this.options.retentionPeriod) {
          target.shift();
        }
      }
    } catch (error) {
      this.logger.error('Error adding metric', { 
        error: error.message,
        domain,
        category
      });
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
   * Track a new request
   * @param {Object} req - Express request object
   */
  trackRequest(req) {
    this.requestCounter++;
    
    // Extract domain from path
    const path = req.path;
    let domain = 'unknown';
    
    // Simple domain extraction from path
    if (path.startsWith('/api/')) {
      const parts = path.split('/');
      if (parts.length > 2) {
        domain = parts[2];
      }
    }
    
    // Increment domain-specific request counter
    if (this.metrics.domains[domain]) {
      const timestamp = Date.now();
      this.addMetric(domain, 'requests', {
        timestamp,
        path,
        method: req.method
      });
    }
  }

  /**
   * Track response time for a request
   * @param {Object} req - Express request object
   * @param {number} responseTime - Response time in milliseconds
   */
  trackResponseTime(req, responseTime) {
    // Extract domain from path
    const path = req.path;
    let domain = 'unknown';
    
    // Simple domain extraction from path
    if (path.startsWith('/api/')) {
      const parts = path.split('/');
      if (parts.length > 2) {
        domain = parts[2];
      }
    }
    
    // Add response time to domain metrics
    if (this.metrics.domains[domain]) {
      const timestamp = Date.now();
      this.addMetric(domain, 'responseTime', {
        timestamp,
        path,
        method: req.method,
        time: responseTime
      });
    }
  }

  /**
   * Track an error
   * @param {Object} req - Express request object
   * @param {Object} error - Error object
   */
  trackError(req, error) {
    // Extract domain from path
    const path = req.path;
    let domain = 'unknown';
    
    // Simple domain extraction from path
    if (path.startsWith('/api/')) {
      const parts = path.split('/');
      if (parts.length > 2) {
        domain = parts[2];
      }
    }
    
    // Add error to domain metrics
    if (this.metrics.domains[domain]) {
      const timestamp = Date.now();
      this.addMetric(domain, 'errors', {
        timestamp,
        path,
        method: req.method,
        message: error.message,
        code: error.code || error.status || 500
      });
    }
  }

  /**
   * Get detailed system information
   * @returns {Object} System information
   */
  getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus(),
      networkInterfaces: os.networkInterfaces(),
      nodeVersion: process.version,
      pid: process.pid,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Generate HTML for the dashboard
   * @returns {string} Dashboard HTML
   */
  generateDashboardHtml() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Monitoring Dashboard</title>
  <link rel="stylesheet" href="/monitoring/static/styles.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <header>
    <h1>API Monitoring Dashboard</h1>
    <div class="system-info">
      <span id="hostname"></span>
      <span id="uptime"></span>
      <span id="memory"></span>
    </div>
  </header>
  
  <nav>
    <ul>
      <li><a href="#system">System</a></li>
      <li><a href="#requests">Requests</a></li>
      <li><a href="#domains">Domains</a></li>
      <li><a href="#errors">Errors</a></li>
      <li><a href="/monitoring/di-visualization">DI Visualization</a></li>
    </ul>
  </nav>
  
  <main>
    <section id="system">
      <h2>System Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Memory Usage</h3>
          <div class="chart-container">
            <canvas id="memoryChart"></canvas>
          </div>
        </div>
        <div class="metric-card">
          <h3>CPU Load</h3>
          <div class="chart-container">
            <canvas id="cpuChart"></canvas>
          </div>
        </div>
      </div>
    </section>
    
    <section id="requests">
      <h2>Request Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Request Rate</h3>
          <div class="chart-container">
            <canvas id="requestRateChart"></canvas>
          </div>
        </div>
        <div class="metric-card">
          <h3>Response Times</h3>
          <div class="chart-container">
            <canvas id="responseTimeChart"></canvas>
          </div>
        </div>
      </div>
    </section>
    
    <section id="domains">
      <h2>Domain Metrics</h2>
      <div class="domain-tabs">
        <div class="tab-buttons" id="domainTabs"></div>
        <div class="tab-content" id="domainContent"></div>
      </div>
    </section>
    
    <section id="errors">
      <h2>Error Log</h2>
      <div class="error-log">
        <table id="errorTable">
          <thead>
            <tr>
              <th>Time</th>
              <th>Domain</th>
              <th>Path</th>
              <th>Method</th>
              <th>Code</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody id="errorTableBody"></tbody>
        </table>
      </div>
    </section>
    
    <section id="issues">
      <h2>Summary of Issues</h2>
      <table id="issuesTable">
        <thead>
          <tr>
            <th>Issue</th>
            <th>Severity</th>
            <th>Fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Duplicate <code>/health</code> route</td>
            <td><span class="severity-minor">Minor</span></td>
            <td>Remove second mount or refactor</td>
          </tr>
          <tr>
            <td>Repeated <code>ChallengeService</code> logs</td>
            <td><span class="severity-moderate">Moderate</span></td>
            <td>Use singleton or scoped DI</td>
          </tr>
          <tr>
            <td>MemoryMonitor already active</td>
            <td><span class="severity-moderate">Moderate</span></td>
            <td>Guard against duplicate init in dev</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
  
  <script>
    // Connect to SSE endpoint
    const eventSource = new EventSource('/monitoring/events');
    
    // Charts
    let memoryChart, cpuChart, requestRateChart, responseTimeChart;
    let domainCharts = {};
    
    // Initialize charts when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      initSystemInfo();
      initCharts();
      
      // Listen for metrics updates
      eventSource.onmessage = (event) => {
        const metrics = JSON.parse(event.data);
        updateCharts(metrics);
        updateErrorLog(metrics);
      };
    });
    
    function initSystemInfo() {
      // Fetch system info
      fetch('/monitoring/api/system')
        .then(response => response.json())
        .then(info => {
          document.getElementById('hostname').textContent = \`Host: \${info.hostname}\`;
          
          // Update uptime periodically
          setInterval(() => {
            const uptime = formatUptime(info.uptime + (Date.now() / 1000 - initialTimestamp / 1000));
            document.getElementById('uptime').textContent = \`Uptime: \${uptime}\`;
          }, 1000);
          
          const memUsage = Math.round((1 - (info.freemem / info.totalmem)) * 100);
          document.getElementById('memory').textContent = \`Memory: \${memUsage}%\`;
        });
      
      const initialTimestamp = Date.now();
    }
    
    function initCharts() {
      // Memory chart
      const memoryCtx = document.getElementById('memoryChart').getContext('2d');
      memoryChart = new Chart(memoryCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'System Memory (%)',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4
          }, {
            label: 'Heap Usage (MB)',
            data: [],
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      // CPU chart
      const cpuCtx = document.getElementById('cpuChart').getContext('2d');
      cpuChart = new Chart(cpuCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'CPU Load',
            data: [],
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      // Request rate chart
      const requestRateCtx = document.getElementById('requestRateChart').getContext('2d');
      requestRateChart = new Chart(requestRateCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Requests per interval',
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      // Response time chart (empty initially, will be populated with domain data)
      const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
      responseTimeChart = new Chart(responseTimeCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    
    function updateCharts(metrics) {
      // Update system memory chart
      if (metrics.system.memory.length > 0) {
        const memoryData = metrics.system.memory;
        const labels = memoryData.map(d => formatTime(d.timestamp));
        const systemMemoryData = memoryData.map(d => d.systemUsage);
        const heapUsageData = memoryData.map(d => Math.round(d.heapUsed / 1024 / 1024));
        
        memoryChart.data.labels = labels;
        memoryChart.data.datasets[0].data = systemMemoryData;
        memoryChart.data.datasets[1].data = heapUsageData;
        memoryChart.update();
        
        // Update memory info in header
        if (memoryData.length > 0) {
          const latest = memoryData[memoryData.length - 1];
          document.getElementById('memory').textContent = \`Memory: \${latest.systemUsage}%\`;
        }
      }
      
      // Update CPU chart
      if (metrics.system.cpu.length > 0) {
        const cpuData = metrics.system.cpu;
        const labels = cpuData.map(d => formatTime(d.timestamp));
        const loadData = cpuData.map(d => d.load);
        
        cpuChart.data.labels = labels;
        cpuChart.data.datasets[0].data = loadData;
        cpuChart.update();
      }
      
      // Update request rate chart
      if (metrics.system.requests.length > 0) {
        const requestData = metrics.system.requests;
        const labels = requestData.map(d => formatTime(d.timestamp));
        const rateData = requestData.map(d => d.rate);
        
        requestRateChart.data.labels = labels;
        requestRateChart.data.datasets[0].data = rateData;
        requestRateChart.update();
      }
      
      // Update domain tabs
      updateDomainTabs(metrics.domains);
    }
    
    function updateDomainTabs(domains) {
      const tabsContainer = document.getElementById('domainTabs');
      const contentContainer = document.getElementById('domainContent');
      
      // Create tabs if they don't exist
      if (tabsContainer.children.length === 0) {
        let isFirst = true;
        
        for (const domain in domains) {
          // Create tab button
          const tabButton = document.createElement('button');
          tabButton.textContent = domain;
          tabButton.classList.add('tab-button');
          if (isFirst) tabButton.classList.add('active');
          tabButton.onclick = () => switchDomainTab(domain);
          tabsContainer.appendChild(tabButton);
          
          // Create tab content
          const tabContent = document.createElement('div');
          tabContent.id = \`domain-\${domain}\`;
          tabContent.classList.add('tab-pane');
          if (isFirst) tabContent.classList.add('active');
          
          // Create charts for this domain
          tabContent.innerHTML = \`
            <div class="metrics-grid">
              <div class="metric-card">
                <h3>\${domain} Requests</h3>
                <div class="chart-container">
                  <canvas id="\${domain}-requestChart"></canvas>
                </div>
              </div>
              <div class="metric-card">
                <h3>\${domain} Response Times</h3>
                <div class="chart-container">
                  <canvas id="\${domain}-responseTimeChart"></canvas>
                </div>
              </div>
            </div>
          \`;
          
          contentContainer.appendChild(tabContent);
          
          // Initialize charts for this domain
          initDomainCharts(domain);
          
          isFirst = false;
        }
      }
      
      // Update domain charts
      for (const domain in domains) {
        updateDomainCharts(domain, domains[domain]);
      }
      
      // Update response time overview chart
      updateResponseTimeOverview(domains);
    }
    
    function initDomainCharts(domain) {
      // Request chart
      const requestCtx = document.getElementById(\`\${domain}-requestChart\`).getContext('2d');
      domainCharts[\`\${domain}-request\`] = new Chart(requestCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Requests',
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      // Response time chart
      const responseTimeCtx = document.getElementById(\`\${domain}-responseTimeChart\`).getContext('2d');
      domainCharts[\`\${domain}-responseTime\`] = new Chart(responseTimeCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Response Time (ms)',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    
    function updateDomainCharts(domain, data) {
      // Update request chart
      if (data.requests && data.requests.length > 0) {
        const requestChart = domainCharts[\`\${domain}-request\`];
        if (requestChart) {
          const requestData = data.requests;
          const labels = requestData.map(d => formatTime(d.timestamp));
          
          // Count requests per timestamp
          const countMap = {};
          requestData.forEach(d => {
            const time = formatTime(d.timestamp);
            countMap[time] = (countMap[time] || 0) + 1;
          });
          
          const uniqueLabels = [...new Set(labels)];
          const counts = uniqueLabels.map(label => countMap[label] || 0);
          
          requestChart.data.labels = uniqueLabels;
          requestChart.data.datasets[0].data = counts;
          requestChart.update();
        }
      }
      
      // Update response time chart
      if (data.responseTime && data.responseTime.length > 0) {
        const responseTimeChart = domainCharts[\`\${domain}-responseTime\`];
        if (responseTimeChart) {
          const responseTimeData = data.responseTime;
          const labels = responseTimeData.map(d => formatTime(d.timestamp));
          const times = responseTimeData.map(d => d.time);
          
          responseTimeChart.data.labels = labels;
          responseTimeChart.data.datasets[0].data = times;
          responseTimeChart.update();
        }
      }
    }
    
    function updateResponseTimeOverview(domains) {
      // Clear existing datasets
      responseTimeChart.data.datasets = [];
      
      // Add a dataset for each domain
      const colors = [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
      ];
      
      let colorIndex = 0;
      let maxLabels = [];
      
      for (const domain in domains) {
        if (domains[domain].responseTime && domains[domain].responseTime.length > 0) {
          const responseTimeData = domains[domain].responseTime;
          const labels = responseTimeData.map(d => formatTime(d.timestamp));
          const times = responseTimeData.map(d => d.time);
          
          if (labels.length > maxLabels.length) {
            maxLabels = labels;
          }
          
          responseTimeChart.data.datasets.push({
            label: \`\${domain}\`,
            data: times,
            borderColor: colors[colorIndex % colors.length],
            backgroundColor: colors[colorIndex % colors.length].replace('1)', '0.2)'),
            tension: 0.4
          });
          
          colorIndex++;
        }
      }
      
      responseTimeChart.data.labels = maxLabels;
      responseTimeChart.update();
    }
    
    function updateErrorLog(metrics) {
      const errorTableBody = document.getElementById('errorTableBody');
      
      // Clear existing rows
      errorTableBody.innerHTML = '';
      
      // Add errors from all domains
      for (const domain in metrics.domains) {
        if (metrics.domains[domain].errors && metrics.domains[domain].errors.length > 0) {
          metrics.domains[domain].errors.forEach(error => {
            const row = document.createElement('tr');
            
            row.innerHTML = \`
              <td>\${formatTime(error.timestamp)}</td>
              <td>\${domain}</td>
              <td>\${error.path}</td>
              <td>\${error.method}</td>
              <td>\${error.code}</td>
              <td>\${error.message}</td>
            \`;
            
            errorTableBody.appendChild(row);
          });
        }
      }
    }
    
    function switchDomainTab(domain) {
      // Update active tab button
      const tabButtons = document.querySelectorAll('.tab-button');
      tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.textContent === domain) {
          button.classList.add('active');
        }
      });
      
      // Update active tab content
      const tabPanes = document.querySelectorAll('.tab-pane');
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === \`domain-\${domain}\`) {
          pane.classList.add('active');
        }
      });
    }
    
    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return \`\${date.getHours().toString().padStart(2, '0')}:\${date.getMinutes().toString().padStart(2, '0')}:\${date.getSeconds().toString().padStart(2, '0')}\`;
    }
    
    function formatUptime(seconds) {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (days > 0) {
        return \`\${days}d \${hours}h \${minutes}m\`;
      } else if (hours > 0) {
        return \`\${hours}h \${minutes}m \${secs}s\`;
      } else {
        return \`\${minutes}m \${secs}s\`;
      }
    }
  </script>
</body>
</html>
    `;
  }

  /**
   * Get Express middleware for tracking requests
   * @returns {Function} Express middleware
   */
  getRequestTrackingMiddleware() {
    return (req, res, next) => {
      // Track request
      this.trackRequest(req);
      
      // Track response time
      const start = Date.now();
      
      // Track when response is finished
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.trackResponseTime(req, duration);
        
        // Track errors
        if (res.statusCode >= 400) {
          this.trackError(req, { 
            message: res.statusMessage || 'Error',
            code: res.statusCode
          });
        }
      });
      
      next();
    };
  }

  /**
   * Get the Express router for the dashboard
   * @returns {express.Router} Express router
   */
  getRouter() {
    return this.router;
  }
}

// Create singleton instance
const metricsDashboard = new MetricsDashboard();

export { MetricsDashboard, metricsDashboard };
