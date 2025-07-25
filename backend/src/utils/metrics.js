const promClient = require('prom-client');
const express = require('express');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add a default label to all metrics
register.setDefaultLabels({
  app: 'service-desk-api'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Create custom metrics

// HTTP request duration metric
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// HTTP request counter
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Active tickets gauge
const activeTicketsGauge = new promClient.Gauge({
  name: 'active_tickets',
  help: 'Number of active tickets in the system',
  labelNames: ['status', 'priority']
});

// SLA breach counter
const slaBreachCounter = new promClient.Counter({
  name: 'sla_breaches_total',
  help: 'Total number of SLA breaches',
  labelNames: ['priority']
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(activeTicketsGauge);
register.registerMetric(slaBreachCounter);

// Middleware to track HTTP request duration and count
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Record end time and calculate duration on response finish
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    // Get route path (without query parameters and specific IDs)
    let route = req.route ? req.route.path : req.path;
    
    // Replace route params with placeholders (e.g., /api/tickets/123 -> /api/tickets/:id)
    route = route.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id');
    route = route.replace(/\/\d+/g, '/:id');
    
    // Record metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestCounter
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Function to update active tickets gauge
const updateActiveTicketsGauge = async (Ticket) => {
  try {
    // Get counts of tickets by status and priority
    const statuses = ['new', 'assigned', 'in_progress', 'on_hold'];
    const priorities = ['P1', 'P2', 'P3', 'P4'];
    
    for (const status of statuses) {
      for (const priority of priorities) {
        const count = await Ticket.count({
          where: { status, priority }
        });
        
        activeTicketsGauge.labels(status, priority).set(count);
      }
    }
  } catch (error) {
    console.error('Error updating active tickets gauge:', error);
  }
};

// Function to increment SLA breach counter
const incrementSlaBreachCounter = (priority) => {
  slaBreachCounter.labels(priority).inc();
};

// Create metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};

// Setup metrics route
const setupMetricsRoute = (app) => {
  const metricsRouter = express.Router();
  
  // Metrics endpoint
  metricsRouter.get('/', metricsEndpoint);
  
  // Apply to app
  app.use('/metrics', metricsRouter);
  
  console.log('Metrics endpoint available at /metrics');
};

module.exports = {
  metricsMiddleware,
  updateActiveTicketsGauge,
  incrementSlaBreachCounter,
  setupMetricsRoute
};