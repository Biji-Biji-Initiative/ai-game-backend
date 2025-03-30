# Monitoring and Logging Guide

This guide outlines our approach to monitoring and logging in the AI Gaming Backend. It explains how to set up, configure, and use our monitoring and logging infrastructure to ensure application reliability and observability.

## Table of Contents

1. [Monitoring Philosophy](#monitoring-philosophy)
2. [Monitoring Infrastructure](#monitoring-infrastructure)
3. [Key Metrics](#key-metrics)
4. [Alerting](#alerting)
5. [Logging Strategy](#logging-strategy)
6. [Log Management](#log-management)
7. [Troubleshooting with Logs](#troubleshooting-with-logs)
8. [Monitoring in Development](#monitoring-in-development)
9. [Monitoring Best Practices](#monitoring-best-practices)

## Monitoring Philosophy

Our monitoring approach follows these principles:

1. **Proactive over reactive**: Detect issues before users do
2. **Data-driven decisions**: Base operational decisions on metrics
3. **Actionable alerts**: Alerts should indicate clear, specific actions
4. **Comprehensive visibility**: Monitor all system layers
5. **Minimal overhead**: Monitoring should not significantly impact performance

## Monitoring Infrastructure

Our monitoring stack consists of:

### Infrastructure Components

1. **Metrics Collection**:
   - **Prometheus**: Primary metrics collection and storage
   - **Node Exporter**: Host-level metrics (CPU, memory, disk, network)
   - **MongoDB Exporter**: Database-specific metrics

2. **Metrics Visualization**:
   - **Grafana**: Dashboards and visualization 
   - **Custom dashboards**: Game-specific metrics

3. **Log Management**:
   - **ELK Stack** (Elasticsearch, Logstash, Kibana)
   - **Filebeat**: Log shipping agent

4. **Distributed Tracing**:
   - **Jaeger**: Tracing and request path visualization

5. **Synthetic Monitoring**:
   - **Checkly**: Endpoint monitoring and synthetic API tests

### Setup Instructions

#### Prometheus and Grafana Setup

1. **Docker-based Installation**:
   ```bash
   # Run from the project root
   cd monitoring/prometheus
   docker-compose up -d
   ```

2. **Manual Installation**:
   ```bash
   # Install Prometheus
   wget https://github.com/prometheus/prometheus/releases/download/v2.37.0/prometheus-2.37.0.linux-amd64.tar.gz
   tar xvfz prometheus-2.37.0.linux-amd64.tar.gz
   cd prometheus-2.37.0.linux-amd64
   ./prometheus --config.file=prometheus.yml
   
   # Install Grafana
   sudo apt-get install -y apt-transport-https software-properties-common
   sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
   sudo apt-get update
   sudo apt-get install grafana
   sudo systemctl enable grafana-server
   sudo systemctl start grafana-server
   ```

3. **Instrumenting the Application**:
   ```javascript
   // server.js or app.js
   const promClient = require('prom-client');
   const register = new promClient.Registry();
   
   // Define metrics
   const httpRequestDurationMicroseconds = new promClient.Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'status_code'],
     buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
   });
   
   // Register metrics
   register.registerMetric(httpRequestDurationMicroseconds);
   
   // Expose metrics endpoint
   app.get('/metrics', async (req, res) => {
     res.set('Content-Type', register.contentType);
     res.end(await register.metrics());
   });
   
   // Use middleware to measure request duration
   app.use((req, res, next) => {
     const end = httpRequestDurationMicroseconds.startTimer();
     res.on('finish', () => {
       end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
     });
     next();
   });
   ```

#### ELK Stack Setup

1. **Docker-based Installation**:
   ```bash
   # Run from the project root
   cd monitoring/elk
   docker-compose up -d
   ```

2. **Configure Filebeat**:
   ```bash
   # filebeat.yml
   filebeat.inputs:
   - type: log
     enabled: true
     paths:
       - /var/log/ai-gaming-backend/*.log
       
   output.elasticsearch:
     hosts: ["elasticsearch:9200"]
   ```

## Key Metrics

These are the critical metrics we monitor:

### System-Level Metrics

1. **Host Metrics**:
   - CPU utilization (average and peak)
   - Memory usage (total, used, free)
   - Disk I/O (reads, writes, latency)
   - Network I/O (bytes in/out, packets in/out)
   - System load

2. **Container Metrics** (if using Docker/Kubernetes):
   - Container CPU usage
   - Container memory usage
   - Container restarts
   - Pod status

### Application Metrics

1. **HTTP/API Metrics**:
   - Request rate (requests per second)
   - Request duration (response time)
   - Error rate (percentage of 4xx/5xx responses)
   - Request size and response size

2. **Game-Specific Metrics**:
   - Active game sessions
   - Player count (total, per game)
   - Game state transitions
   - AI decision time
   - Matchmaking time

3. **Database Metrics**:
   - Query execution time
   - Query counts
   - Connection pool utilization
   - Cache hit ratio
   - Collection growth rate

4. **WebSocket Metrics**:
   - Connection count
   - Message throughput
   - Connection duration
   - Connection errors

### Business Metrics

1. **User Engagement**:
   - Daily/Monthly active users
   - Session duration
   - Game completion rate
   - Player retention

2. **Revenue Metrics** (if applicable):
   - Conversion rate
   - Average revenue per user
   - Purchase frequency

## Alerting

We use alerts to notify the team about potential issues before they impact users.

### Alert Configuration

1. **Prometheus Alerting Rules**:
   ```yaml
   # prometheus/alerts.yml
   groups:
   - name: node
     rules:
     - alert: HighCPULoad
       expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
       for: 5m
       labels:
         severity: warning
       annotations:
         summary: "High CPU load (instance {{ $labels.instance }})"
         description: "CPU load is > 85%\n  VALUE = {{ $value }}\n  LABELS: {{ $labels }}"
   
   - name: api
     rules:
     - alert: HighErrorRate
       expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100 > 5
       for: 1m
       labels:
         severity: critical
       annotations:
         summary: "High API error rate"
         description: "Error rate is > 5% ({{ $value }}%)"
   ```

2. **Alert Notification Channels**:
   - **Slack**: Primary channel for alerts
   - **Email**: For critical issues
   - **PagerDuty**: For on-call rotation

### Alert Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| Critical | Service is down or severely degraded | Immediate (24/7) | Database unavailable, API returning 500s |
| Warning | Potential issue that could become critical | 1 hour (business hours) | High CPU usage, increasing error rates |
| Info | Noteworthy event, no immediate action | Next business day | Daily statistics, deployment notices |

### Alert Management Process

1. **When an alert fires**:
   - The on-call engineer acknowledges the alert
   - Initial assessment is performed
   - If needed, incident response is initiated
   - Notes are recorded in the incident log

2. **Post-Incident**:
   - Conduct a post-mortem analysis
   - Update monitoring as needed
   - Document findings in the knowledge base

## Logging Strategy

Proper logging is essential for troubleshooting and understanding system behavior.

### Log Levels

We use the following log levels consistently:

| Level | Purpose | Example |
|-------|---------|---------|
| ERROR | Significant failures requiring immediate attention | Database connection failure, API unavailable |
| WARN | Potential issues that don't stop functionality | Slow queries, retried operations |
| INFO | Normal operational events, milestones | Server started, game session created |
| DEBUG | Detailed information for troubleshooting | Request details, DB query parameters |
| TRACE | Very detailed diagnostics (development only) | Function entry/exit, variable values |

### Logging Implementation

We use Winston for structured logging:

```javascript
// logger.js
const winston = require('winston');
const { format } = winston;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'ai-gaming-backend' },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

module.exports = logger;
```

### Request Context in Logs

To track requests across logs, we use correlation IDs:

```javascript
// middleware/request-logger.js
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  // Generate or extract correlation ID
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Create a request-scoped logger
  req.logger = logger.child({ 
    correlationId,
    requestId: uuidv4(),
    userId: req.user?.id,
    path: req.path,
    method: req.method
  });
  
  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);
  
  // Log request
  req.logger.info('Request received');
  
  // Log response
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.info('Response sent', {
      statusCode: res.statusCode,
      duration,
      contentLength: res.getHeader('content-length')
    });
  });
  
  next();
}

module.exports = requestLogger;
```

### What to Log

1. **Always Log**:
   - Service startup/shutdown
   - Authentication events (success/failure)
   - Authorization failures
   - External service interactions
   - Database errors
   - Game session events (creation, completion)
   - Exceptions and errors
   - User account changes

2. **Log Context**:
   - Request correlation ID
   - User ID (when available)
   - Session ID (when applicable)
   - Resource identifiers
   - Timestamps (in ISO 8601 format)

3. **Never Log**:
   - Passwords or authentication tokens
   - Personal identifiable information (PII)
   - Credit card or financial information
   - API keys or secrets

## Log Management

We centralize logs for easier analysis and troubleshooting.

### Log Aggregation

Logs are collected using Filebeat and sent to Elasticsearch:

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/ai-gaming-backend/*.log
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "ai-gaming-backend-%{+yyyy.MM.dd}"
```

### Log Retention

- **Production logs**: 90 days
- **Development logs**: 14 days
- **Critical error logs**: 1 year
- **Audit logs**: 2 years

### Log Rotation

We use `logrotate` to manage log files:

```
# /etc/logrotate.d/ai-gaming-backend
/var/log/ai-gaming-backend/*.log {
  daily
  missingok
  rotate 90
  compress
  delaycompress
  notifempty
  create 0640 node node
  sharedscripts
  postrotate
    systemctl reload ai-gaming-backend >/dev/null 2>&1 || true
  endscript
}
```

## Troubleshooting with Logs

Effective log use is key to resolving issues quickly.

### Common Log Queries

**Kibana Query Examples**:

1. **Find errors for a specific user**:
   ```
   level:ERROR AND userId:"user123"
   ```

2. **Track a request across services**:
   ```
   correlationId:"abc-123-def-456"
   ```

3. **Investigate performance issues**:
   ```
   path:"/api/v1/games" AND duration:>500
   ```

4. **Find failed authentication attempts**:
   ```
   "authentication failed" AND ip.address:192.168.*
   ```

### Log Analysis Workflow

1. **Identify the time period** of the issue
2. **Start with ERROR and WARN level** logs
3. **Find correlation IDs** for affected requests
4. **Trace request flow** across services
5. **Expand search to INFO level** for context
6. **Correlate with metrics** from Grafana

## Monitoring in Development

Developers should understand and use monitoring tools during development.

### Local Monitoring Setup

1. **Local Prometheus and Grafana**:
   ```bash
   # Run from the project root
   cd monitoring/local
   docker-compose up -d
   ```

2. **Local Log Viewing**:
   ```bash
   # Terminal 1: Run the application
   npm run dev
   
   # Terminal 2: Watch logs
   tail -f logs/combined.log | jq
   ```

### Testing Monitoring and Logging

Add tests to verify your instrumentation:

```javascript
// __tests__/monitoring/metrics.test.js
describe('Metrics Middleware', () => {
  it('should expose metrics endpoint', async () => {
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('http_request_duration_seconds');
  });
  
  it('should record metrics when API is called', async () => {
    // First, call an API endpoint
    await request(app).get('/api/v1/games');
    
    // Then check metrics
    const metricsResponse = await request(app).get('/metrics');
    expect(metricsResponse.text).toContain('http_request_duration_seconds_count');
  });
});
```

## Monitoring Best Practices

Follow these guidelines to maximize monitoring effectiveness:

### Dashboard Design

1. **Overview Dashboard**: High-level system health
2. **Service-Specific Dashboards**: Per-service deep dives
3. **Business Metrics Dashboard**: User activity and engagement

### Effective Alerting

1. **Reduce alert noise** by setting appropriate thresholds
2. **Use alert grouping** to avoid alert storms
3. **Include actionable information** in alert messages
4. **Test alerting regularly** to ensure notification delivery

### Health Checks

1. **Implement comprehensive health checks**:
   ```javascript
   // routes/health.js
   router.get('/health', async (req, res) => {
     try {
       // Check database
       await db.admin().ping();
       
       // Check cache
       await cacheClient.ping();
       
       // Check external services
       const externalServiceStatus = await checkExternalServices();
       
       return res.status(200).json({
         status: 'healthy',
         time: new Date().toISOString(),
         services: {
           database: 'healthy',
           cache: 'healthy',
           externalServices: externalServiceStatus
         }
       });
     } catch (error) {
       req.logger.error('Health check failed', { error: error.message });
       
       return res.status(500).json({
         status: 'unhealthy',
         time: new Date().toISOString(),
         error: error.message
       });
     }
   });
   ```

2. **Deep health checks** for comprehensive system verification
3. **Business logic health checks** to verify end-to-end functionality

### Resource Utilization

1. **Monitor resource usage trends** to plan capacity
2. **Set thresholds based on business impact**, not just technical limits
3. **Correlate resource usage with user activity** to understand patterns

## Security Monitoring

Security monitoring is a critical aspect of our observability strategy.

### Security Logs

1. **Authentication Events**:
   ```javascript
   router.post('/login', (req, res) => {
     // ... authentication logic
     
     if (authenticated) {
       req.logger.info('User login successful', { 
         userId: user.id,
         ip: req.ip,
         userAgent: req.headers['user-agent']
       });
     } else {
       req.logger.warn('User login failed', {
         username: req.body.username, // Don't log passwords!
         ip: req.ip,
         userAgent: req.headers['user-agent'],
         reason: 'Invalid credentials'
       });
     }
   });
   ```

2. **Authorization Failures**:
   ```javascript
   function checkPermission(permission) {
     return (req, res, next) => {
       if (req.user.permissions.includes(permission)) {
         return next();
       }
       
       req.logger.warn('Authorization failure', {
         userId: req.user.id,
         ip: req.ip,
         requestedPermission: permission,
         userPermissions: req.user.permissions,
         path: req.path
       });
       
       return res.status(403).json({ error: 'Insufficient permissions' });
     };
   }
   ```

3. **Rate Limiting Triggers**:
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     handler: (req, res) => {
       req.logger.warn('Rate limit exceeded', {
         ip: req.ip,
         path: req.path,
         userAgent: req.headers['user-agent']
       });
       
       res.status(429).json({
         error: 'Too many requests, please try again later'
       });
     }
   });
   ```

### Security Monitoring Dashboards

Create dedicated security dashboards to monitor:

1. **Failed login attempts** by IP address and user
2. **Authentication anomalies** (unusual login times or locations)
3. **API abuse patterns** (high rate of errors or unusual request patterns)
4. **Admin activity** (privileged operations audit)

## Conclusion

Effective monitoring and logging are essential for maintaining a reliable gaming backend. By following the practices in this guide, you'll be able to quickly identify and resolve issues, optimize performance, and understand user behavior.

For specific performance optimization techniques, refer to the [Performance Optimization Guide](./performance-optimization.md).

For troubleshooting help, see the [Troubleshooting Guide](./troubleshooting.md). 