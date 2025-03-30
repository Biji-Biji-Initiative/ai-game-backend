# Performance Optimization Guide

This guide provides strategies and best practices for optimizing the performance of the AI Gaming Backend. It covers database optimization, memory management, network efficiency, and other techniques to ensure your application runs efficiently at scale.

## Table of Contents

1. [Introduction](#introduction)
2. [Performance Metrics and Monitoring](#performance-metrics-and-monitoring)
3. [Database Optimization](#database-optimization)
4. [API and Network Optimization](#api-and-network-optimization)
5. [Memory Management](#memory-management)
6. [Node.js Performance Tuning](#nodejs-performance-tuning)
7. [Caching Strategies](#caching-strategies)
8. [Game-Specific Optimizations](#game-specific-optimizations)
9. [Front-End Considerations](#front-end-considerations)
10. [Scaling Strategies](#scaling-strategies)

## Introduction

Performance optimization is crucial for providing a smooth and responsive gaming experience. This guide helps you identify, diagnose, and resolve performance bottlenecks in the AI Gaming Backend.

### When to Optimize

Follow these principles when approaching performance optimization:

1. **Measure first**: Always collect metrics before making optimizations
2. **Establish baselines**: Know what "normal" performance looks like
3. **Prioritize impact**: Focus on optimizations with the highest user impact
4. **Optimize iteratively**: Make one change at a time and measure results
5. **Premature optimization is the root of all evil**: Don't optimize without evidence of a problem

## Performance Metrics and Monitoring

Before optimizing, you need to understand your application's current performance.

### Key Metrics to Monitor

1. **Response Time**:
   - Average, median, and 95th percentile response times
   - Endpoint-specific response times
   - Time to first byte (TTFB)

2. **Throughput**:
   - Requests per second
   - Transactions per second
   - Concurrent users

3. **Resource Utilization**:
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

4. **Error Rates**:
   - HTTP error codes (4xx, 5xx)
   - Application exceptions
   - Timeouts

### Tools for Performance Monitoring

1. **Application Performance Monitoring (APM)**:
   - We use New Relic for production monitoring
   - Local development can use `clinic.js` for Node.js profiling

2. **Load Testing**:
   - JMeter or k6 for simulating user load
   - Artillery for API load testing

3. **Profiling**:
   - Node.js built-in profiler: `node --prof`
   - Chrome DevTools for CPU and memory profiling
   - Flame graphs for visualizing performance bottlenecks

### Setting Up Basic Profiling

```javascript
// Basic profiling for a specific route or function
const { performance } = require('perf_hooks');

// Middleware for route profiling
function profileRoute(req, res, next) {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    console.log(`${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
  });
  
  next();
}

app.use(profileRoute);
```

## Database Optimization

MongoDB performance is critical for our application's overall speed.

### Indexing Strategy

1. **Identify Queries to Index**:
   - Look for slow queries in MongoDB logs
   - Monitor queries using the MongoDB profiler:
   ```javascript
   db.setProfilingLevel(1, { slowms: 100 });
   ```

2. **Create Effective Indexes**:
   - Index fields used in query filters, sorts, and joins
   - Create compound indexes for multi-field queries
   - Consider index order (filtering fields first, then sorting fields)

   ```javascript
   // Example: Creating a compound index
   db.games.createIndex({ status: 1, createdAt: -1 });
   
   // Example: Creating a text index
   db.games.createIndex({ title: "text", description: "text" });
   ```

3. **Avoid Over-Indexing**:
   - Indexes consume memory and slow down writes
   - Remove unused indexes
   - Monitor index usage:
   ```javascript
   db.games.aggregate([{ $indexStats: {} }]);
   ```

### Query Optimization

1. **Use Projection**:
   - Only request the fields you need
   ```javascript
   db.players.find({ level: { $gt: 10 }}, { name: 1, score: 1 });
   ```

2. **Limit Results**:
   - Use `limit()` and `skip()` for pagination
   - Consider using cursor-based pagination for better performance
   ```javascript
   // Cursor-based pagination example
   const lastId = req.query.lastId;
   const query = lastId ? { _id: { $gt: ObjectId(lastId) } } : {};
   const players = await db.players.find(query).limit(10);
   ```

3. **Avoid N+1 Query Patterns**:
   - Use aggregation to join data in a single query
   - Batch related queries where possible
   ```javascript
   // Instead of querying each player individually
   const playerIds = game.players.map(p => p.playerId);
   const players = await db.players.find({ _id: { $in: playerIds } });
   ```

4. **Use Aggregation Pipeline Effectively**:
   - Push filters to the beginning of the pipeline
   - Use `$match` early to reduce documents flowing through the pipeline
   - Use `$project` or `$group` to reduce data size

   ```javascript
   db.gameSessions.aggregate([
     { $match: { status: "completed" } },  // Filter first
     { $lookup: {
         from: "players",
         localField: "playerId",
         foreignField: "_id",
         as: "player"
     }},
     { $unwind: "$player" },
     { $project: {  // Reduce data size
       _id: 1,
       "player.name": 1,
       score: 1
     }},
     { $sort: { score: -1 } },
     { $limit: 10 }
   ]);
   ```

### Schema Design Optimization

1. **Data Access Patterns**:
   - Design schema based on how data is accessed, not just stored
   - Consider embedding vs. referencing based on read/write patterns
   - Embed data that is always queried together and doesn't change often

2. **Denormalization**:
   - Store frequently accessed related data together
   - Be cautious of update complexity with denormalized data
   ```javascript
   // Example: Embedding player basic info in game sessions
   {
     _id: ObjectId("..."),
     game: "chess",
     player: {
       _id: ObjectId("..."),
       name: "Player1", 
       avatar: "url_to_avatar"  // Denormalized for quick display
     },
     score: 120
   }
   ```

3. **MongoDB Document Size**:
   - Keep documents under 16MB limit
   - Use references for large or frequently changing data
   - Consider using GridFS for files larger than 16MB

## API and Network Optimization

Optimize how data flows between server and clients.

### Request/Response Optimization

1. **Payload Size Reduction**:
   - Only return data that's needed
   - Use pagination for large data sets
   - Consider GraphQL for complex applications with varying data needs

2. **Compression**:
   - Enable gzip/brotli compression for HTTP responses
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

3. **Protocol Optimization**:
   - Use HTTP/2 for multiplexing requests
   - Consider Server-Sent Events for one-way real-time updates
   - Use WebSockets efficiently for bi-directional communication

### API Design for Performance

1. **Batch Operations**:
   - Implement batch endpoints for multiple operations
   ```javascript
   // Instead of multiple single-item DELETE requests
   app.delete('/api/v1/items/batch', (req, res) => {
     const { ids } = req.body;
     // Delete all items with the provided ids
   });
   ```

2. **Minimize Round Trips**:
   - Include related data in responses where appropriate
   - Implement compound endpoints for common operations

3. **Rate Limiting and Throttling**:
   - Protect resources from abuse
   - Implement progressive rate limits based on user behavior
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   app.use('/api/', rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   }));
   ```

### API and Network Optimization

- Use HTTP/2 for multiplexed connections
- Implement proper response caching headers
- Compress responses (gzip/brotli)
- Use connection pooling for database connections
- Optimize API payloads to include only necessary data
- Implement pagination for large result sets
- For WebSockets:
  - Implement heartbeat mechanisms
  - Use binary protocols when appropriate
  - Limit broadcast messages
  - Consider [WebSocket performance best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#performance_considerations)
  - Follow [WS npm package best practices](https://github.com/websockets/ws#how-to-get-the-best-performance)

## Memory Management

Node.js applications need careful memory management to avoid leaks and excessive garbage collection.

### Memory Leak Detection

1. **Monitoring Memory Usage**:
   ```javascript
   const memoryUsage = process.memoryUsage();
   console.log(`RSS: ${memoryUsage.rss / 1024 / 1024} MB`);
   console.log(`Heap Total: ${memoryUsage.heapTotal / 1024 / 1024} MB`);
   console.log(`Heap Used: ${memoryUsage.heapUsed / 1024 / 1024} MB`);
   ```

2. **Heap Snapshots**:
   - Use Chrome DevTools to take and compare heap snapshots
   - Look for growing object counts across snapshots

3. **Memory Profiling**:
   ```bash
   # Generate heap dump
   node --inspect server.js
   # Then connect with Chrome DevTools
   ```

### Preventing Memory Leaks

1. **Common Leak Sources**:
   - Event listeners not being removed
   - Closures capturing large objects
   - Circular references
   - Caches without size limits

2. **Event Listener Cleanup**:
   ```javascript
   const listener = () => console.log('Event triggered');
   emitter.on('event', listener);
   
   // Later, when no longer needed
   emitter.removeListener('event', listener);
   ```

3. **WeakMap and WeakSet**:
   - Use these for associating data with objects without preventing garbage collection
   ```javascript
   const cache = new WeakMap();
   
   function processObject(obj) {
     if (cache.has(obj)) {
       return cache.get(obj);
     }
     
     const result = expensiveOperation(obj);
     cache.set(obj, result);
     return result;
   }
   ```

4. **Stream Processing for Large Data**:
   - Use streams to process large files or datasets
   ```javascript
   const fs = require('fs');
   const csv = require('csv-parser');
   
   fs.createReadStream('large-file.csv')
     .pipe(csv())
     .on('data', (row) => {
       // Process each row without loading entire file into memory
     });
   ```

## Node.js Performance Tuning

Optimize the Node.js runtime for gaming backend needs.

### Event Loop Optimization

1. **Avoid Blocking the Event Loop**:
   - Move CPU-intensive tasks to worker threads
   - Break up large synchronous operations
   ```javascript
   const { Worker } = require('worker_threads');
   
   function runComplexCalculation(data) {
     return new Promise((resolve, reject) => {
       const worker = new Worker('./calculation-worker.js');
       worker.postMessage(data);
       worker.on('message', resolve);
       worker.on('error', reject);
     });
   }
   ```

2. **Monitor Event Loop Lag**:
   ```javascript
   let lastCheck = Date.now();
   
   setInterval(() => {
     const now = Date.now();
     const lag = now - lastCheck - 100; // Should be close to 100ms
     console.log(`Event loop lag: ${lag}ms`);
     lastCheck = now;
   }, 100);
   ```

### Process Management

1. **Cluster Mode**:
   - Use multiple processes to utilize all CPU cores
   ```javascript
   const cluster = require('cluster');
   const os = require('os');
   
   if (cluster.isMaster) {
     const cpuCount = os.cpus().length;
     
     for (let i = 0; i < cpuCount; i++) {
       cluster.fork();
     }
     
     cluster.on('exit', (worker) => {
       console.log(`Worker ${worker.id} died. Restarting...`);
       cluster.fork();
     });
   } else {
     // Worker process - run the actual server
     require('./server.js');
   }
   ```

2. **PM2 Configuration Optimization**:
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: "game-backend",
       script: "server.js",
       instances: "max", // Use all available CPUs
       exec_mode: "cluster",
       watch: false,
       max_memory_restart: "1G",
       node_args: "--max-old-space-size=4096" // Increase heap size
     }]
   }
   ```

## Caching Strategies

Implement effective caching to reduce database load and improve response times.

### In-Memory Caching

1. **Node-Cache**:
   ```javascript
   const NodeCache = require('node-cache');
   const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
   
   async function getGameData(gameId) {
     const cacheKey = `game:${gameId}`;
     
     // Try to get from cache first
     let data = cache.get(cacheKey);
     if (data) return data;
     
     // If not in cache, get from database
     data = await db.games.findOne({ _id: gameId });
     
     // Store in cache for future requests
     cache.set(cacheKey, data);
     return data;
   }
   ```

2. **Redis Caching** (for multi-server setups):
   ```javascript
   const redis = require('redis');
   const { promisify } = require('util');
   const client = redis.createClient(process.env.REDIS_URL);
   
   const getAsync = promisify(client.get).bind(client);
   const setAsync = promisify(client.set).bind(client);
   
   async function getPlayerStats(playerId) {
     const cacheKey = `player:stats:${playerId}`;
     
     // Try to get from Redis first
     let stats = await getAsync(cacheKey);
     if (stats) return JSON.parse(stats);
     
     // If not in Redis, get from database
     stats = await db.playerStats.findOne({ playerId });
     
     // Store in Redis with expiration (1 hour)
     await setAsync(cacheKey, JSON.stringify(stats), 'EX', 3600);
     return stats;
   }
   ```

### Caching Considerations

1. **Cache Invalidation Strategies**:
   - Time-based expiration for relatively static data
   - Event-based invalidation for frequently updated data
   - Write-through caching for data consistency

2. **What to Cache**:
   - Frequently accessed, rarely changed data
   - Expensive computations or database queries
   - Game state that's accessed by multiple users

3. **Cache Levels**:
   - First-level cache: Local memory (fastest, but not shared between servers)
   - Second-level cache: Redis (shared, but higher latency)
   - CDN caching for static assets
   - Browser caching for client-side assets

## Game-Specific Optimizations

Specialized optimizations for gaming applications.

### Game State Management

1. **Efficient State Updates**:
   - Send only state changes, not full state
   - Use binary formats for network transmission
   - Consider differential synchronization for real-time games

2. **State Serialization**:
   - Use efficient formats like Protocol Buffers or MessagePack
   - Compress game state for large games
   ```javascript
   // Using MessagePack for efficient serialization
   const msgpack = require('msgpack-lite');
   
   function serializeGameState(state) {
     return msgpack.encode(state);
   }
   
   function deserializeGameState(buffer) {
     return msgpack.decode(buffer);
   }
   ```

### Real-time Communication Optimization

1. **WebSocket Optimization**:
   - Minimize message size
   - Batch small updates
   - Use binary WebSocket messages for efficiency

2. **Message Rate Control**:
   - Implement client-side prediction to reduce update frequency
   - Set appropriate server tick rates based on game type
   - Use interpolation for smooth movement with fewer updates

## Front-End Considerations

While this is a backend guide, frontend performance affects the overall user experience.

1. **Asset Loading**:
   - Serve static assets from CDN
   - Use HTTP/2 server push for critical assets
   - Implement asset bundling and minification

2. **API Response Formatting**:
   - Structure API responses to match frontend needs
   - Include only necessary data
   - Use pagination and lazy loading for large datasets

## Scaling Strategies

Preparing your application to handle increased load.

### Horizontal Scaling

1. **Stateless Services**:
   - Design services to be stateless when possible
   - Store session data in Redis rather than in-memory
   - Use sticky sessions only when necessary

2. **Microservices Architecture**:
   - Split functionality into separate services
   - Scale services independently based on load
   - Use message queues for communication between services

### Vertical Scaling

1. **Resource Allocation**:
   - Increase RAM for memory-intensive applications
   - Add CPU cores for compute-heavy workloads
   - Use SSD storage for I/O-bound applications

2. **Database Scaling**:
   - Implement sharding for large datasets
   - Set up read replicas for read-heavy workloads
   - Consider MongoDB Atlas for managed scaling

## Performance Testing

Regularly test performance to catch regressions and verify optimizations.

1. **Benchmark Suite**:
   - Create automated benchmark tests
   - Include them in CI/CD pipeline
   - Track results over time to identify trends

2. **Load Testing**:
   - Simulate expected peak loads
   - Test beyond expected load to identify breaking points
   - Focus on key user journeys

```javascript
// Example k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
};

export default function() {
  const res = http.get('https://api.example.com/games');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

## Conclusion

Performance optimization is an ongoing process. Always measure before and after making changes, focus on improvements with the highest impact, and continue monitoring as your application evolves and grows.

Refer to the [Monitoring and Logging Guide](./monitoring-logging.md) for details on setting up comprehensive performance monitoring for your application.

## Further Reading

- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/core/query-optimization/)
- [Node.js Performance Documentation](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

```javascript
// Example k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
};

export default function() {
  const res = http.get('https://api.example.com/games');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```
