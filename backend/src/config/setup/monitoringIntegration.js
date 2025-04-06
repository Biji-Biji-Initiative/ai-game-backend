'use strict';

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { startupLogger } from "#app/core/infra/logging/StartupLogger.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { HealthCheckDashboard } from "#app/core/infra/logging/HealthCheckDashboard.js";
import { ApiRouteExplorer } from "#app/core/infra/logging/ApiRouteExplorer.js";
import { MetricsDashboard } from "#app/core/infra/logging/MetricsDashboard.js";
import { PrometheusMetrics } from "#app/core/infra/logging/PrometheusMetrics.js";
import { diVisualizer } from "#app/core/infra/logging/DIVisualizer.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure monitoring routes and middleware
 * @param {express.Application} app - Express application
 * @param {Object} config - Application configuration
 * @param {Object} container - DI container
 */
function configureMonitoring(app, config, container) {
    const logger = infraLogger.child({ component: 'monitoring' });
    logger.info('Configuring monitoring integration');
    
    // Create monitoring router
    const monitoringRouter = express.Router();
    
    // Serve static assets for monitoring dashboard
    const staticPath = path.join(__dirname, '..', '..', 'core', 'infra', 'logging', 'static');
    monitoringRouter.use('/static', express.static(staticPath));
    
    // Create dashboard components
    const healthDashboard = new HealthCheckDashboard({ container });
    const apiExplorer = new ApiRouteExplorer({ app, config });
    const metricsDashboard = new MetricsDashboard({ container });
    const prometheusMetrics = new PrometheusMetrics();
    
    // Health check dashboard
    monitoringRouter.get('/health', (req, res) => {
        const healthData = healthDashboard.getHealthStatus();
        res.send(healthDashboard.renderDashboard(healthData));
    });
    
    // API routes explorer
    monitoringRouter.get('/api-explorer', (req, res) => {
        const routesData = apiExplorer.getRoutes();
        res.send(apiExplorer.renderDashboard(routesData));
    });
    
    // Metrics dashboard
    monitoringRouter.get('/metrics-dashboard', (req, res) => {
        const metricsData = metricsDashboard.getMetrics();
        res.send(metricsDashboard.renderDashboard(metricsData));
    });
    
    // Prometheus metrics endpoint
    monitoringRouter.get('/metrics', (req, res) => {
        res.set('Content-Type', prometheusMetrics.contentType);
        res.send(prometheusMetrics.getMetrics());
    });
    
    // DI container visualization
    monitoringRouter.get('/di', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>DI Container Visualization</title>
                <link rel="stylesheet" href="/monitoring/static/styles.css">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
                <header>
                    <h1>Dependency Injection Container</h1>
                    <nav>
                        <a href="/monitoring/health">Health</a>
                        <a href="/monitoring/api-explorer">API Explorer</a>
                        <a href="/monitoring/metrics-dashboard">Metrics</a>
                        <a href="/monitoring/di" class="active">DI Container</a>
                    </nav>
                </header>
                <main>
                    ${diVisualizer.generateVisualization()}
                </main>
            </body>
            </html>
        `);
    });
    
    // Main monitoring dashboard
    monitoringRouter.get('/', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>System Monitoring Dashboard</title>
                <link rel="stylesheet" href="/monitoring/static/styles.css">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
                <header>
                    <h1>System Monitoring Dashboard</h1>
                    <nav>
                        <a href="/monitoring/health">Health</a>
                        <a href="/monitoring/api-explorer">API Explorer</a>
                        <a href="/monitoring/metrics-dashboard">Metrics</a>
                        <a href="/monitoring/di">DI Container</a>
                    </nav>
                </header>
                <main>
                    <div class="dashboard-grid">
                        <div class="dashboard-card">
                            <h2>System Health</h2>
                            <p>View detailed health status of all system components</p>
                            <a href="/monitoring/health" class="dashboard-link">Open Health Dashboard</a>
                        </div>
                        <div class="dashboard-card">
                            <h2>API Explorer</h2>
                            <p>Explore all available API routes and endpoints</p>
                            <a href="/monitoring/api-explorer" class="dashboard-link">Open API Explorer</a>
                        </div>
                        <div class="dashboard-card">
                            <h2>Performance Metrics</h2>
                            <p>View system performance metrics and statistics</p>
                            <a href="/monitoring/metrics-dashboard" class="dashboard-link">Open Metrics Dashboard</a>
                        </div>
                        <div class="dashboard-card">
                            <h2>DI Container</h2>
                            <p>Visualize dependency injection container components</p>
                            <a href="/monitoring/di" class="dashboard-link">Open DI Visualization</a>
                        </div>
                    </div>
                    
                    <div class="system-summary">
                        <h2>System Summary</h2>
                        <div class="summary-stats">
                            <div class="stat-item">
                                <div class="stat-label">Environment</div>
                                <div class="stat-value">${config.env}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Node Version</div>
                                <div class="stat-value">${process.version}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Uptime</div>
                                <div class="stat-value">${Math.floor(process.uptime())} seconds</div>
                            </div>
                        </div>
                    </div>
                </main>
                <footer>
                    <p>AI Fight Club API Server - Monitoring Dashboard</p>
                </footer>
            </body>
            </html>
        `);
    });
    
    // Mount the monitoring router
    app.use('/monitoring', monitoringRouter);
    
    logger.info('Monitoring integration configured successfully');
    startupLogger.logComponentInitialization('monitoring', 'success', {
        endpoints: [
            '/monitoring',
            '/monitoring/health',
            '/monitoring/api-explorer',
            '/monitoring/metrics-dashboard',
            '/monitoring/metrics',
            '/monitoring/di'
        ]
    });
}

export { configureMonitoring };
