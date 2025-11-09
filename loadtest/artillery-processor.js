/**
 * Artillery custom processor for load testing
 * Handles dynamic data generation and response validation
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Performance tracking
let requestCount = 0;
let errorCount = 0;
let responseTimes = [];
let startTime = Date.now();

// Track unique users created during test
const createdUsers = new Set();
const createdReservations = new Set();

module.exports = {
  // Before the test starts
  beforeRequest: function(requestParams, context, ee, next) {
    requestCount++;

    // Add timestamp to track request timing
    requestParams.timestamp = Date.now();

    // Add custom headers for tracking
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['X-LoadTest-RequestId'] = `req_${requestCount}_${Date.now()}`;

    return next();
  },

  // After each request
  afterResponse: function(requestParams, response, context, ee, next) {
    const responseTime = Date.now() - requestParams.timestamp;
    responseTimes.push(responseTime);

    // Track errors
    if (response.statusCode >= 400) {
      errorCount++;
    }

    // Track successful user registrations
    if (requestParams.url.includes('/register') && response.statusCode === 201) {
      try {
        const responseBody = JSON.parse(response.body);
        if (responseBody.user && responseBody.user.email) {
          createdUsers.add(responseBody.user.email);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Track successful reservations
    if (requestParams.url.includes('/reservations/') &&
        (response.statusCode === 201 || response.statusCode === 200)) {
      try {
        const responseBody = JSON.parse(response.body);
        if (responseBody.data && responseBody.data._id) {
          createdReservations.add(responseBody.data._id);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Log slow requests (>500ms)
    if (responseTime > 500) {
      console.warn(`🚨 SLOW REQUEST: ${requestParams.method} ${requestParams.url} - ${responseTime}ms`);
    }

    // Log errors
    if (response.statusCode >= 400) {
      console.error(`❌ ERROR ${response.statusCode}: ${requestParams.method} ${requestParams.url}`);
    }

    return next();
  },

  // Custom functions for dynamic data
  generateUniqueEmail: function(context, events, done) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const email = `loadtest_${timestamp}_${random}@example.com`;
    return email;
  },

  generateUniquePhone: function(context, events, done) {
    const random = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `+1${random}`;
  },

  // Generate random date within range
  randomDate: function(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
  },

  // Generate random integer
  randomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Pick random item from array
  randomPick: function(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  // After the test completes
  afterScenario: function(context, ee, next) {
    // This runs after each scenario iteration
    return next();
  },

  // Cleanup function
  cleanup: function(context, ee, next) {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate statistics
    const avgResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    const errorRate = requestCount > 0 ? (errorCount / requestCount * 100).toFixed(2) : 0;
    const requestsPerSecond = requestCount / (totalDuration / 1000);

    // Generate test report
    const report = {
      testSummary: {
        totalRequests: requestCount,
        totalErrors: errorCount,
        errorRate: `${errorRate}%`,
        testDuration: `${totalDuration}ms`,
        requestsPerSecond: requestsPerSecond.toFixed(2),
        uniqueUsersCreated: createdUsers.size,
        uniqueReservationsCreated: createdReservations.size
      },
      performanceMetrics: {
        averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        minResponseTime: `${minResponseTime}ms`,
        maxResponseTime: `${maxResponseTime}ms`,
        p95ResponseTime: calculatePercentile(responseTimes, 95),
        p99ResponseTime: calculatePercentile(responseTimes, 99)
      },
      timestamp: new Date().toISOString()
    };

    // Write report to file
    const reportPath = path.join(logsDir, `artillery-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Artillery Load Test Report:');
    console.log('================================');
    console.log(`Total Requests: ${requestCount}`);
    console.log(`Errors: ${errorCount} (${errorRate}%)`);
    console.log(`Requests/sec: ${requestsPerSecond.toFixed(2)}`);
    console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Users Created: ${createdUsers.size}`);
    console.log(`Reservations Created: ${createdReservations.size}`);
    console.log(`Report saved to: ${reportPath}`);

    return next();
  }
};

// Helper function to calculate percentiles
function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  const sorted = arr.sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (upper >= sorted.length) return sorted[sorted.length - 1];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
