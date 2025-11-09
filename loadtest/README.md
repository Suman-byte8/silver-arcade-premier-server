# Load Testing Suite

A comprehensive load testing suite for the Node.js backend server with multiple testing tools and real-time monitoring.

## Features

- **Multiple Testing Tools**: Artillery, K6, and custom concurrent Node.js testing
- **Real-time Monitoring**: Server resource monitoring during tests
- **Web Dashboard**: React-based UI for test configuration and results visualization
- **Comprehensive Reporting**: Detailed performance metrics and analysis
- **Scenario-based Testing**: Realistic user behavior simulation

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [k6](https://k6.io/docs/getting-started/installation/) installed and available in your PATH.
- Backend server running (see main `readme.md`)

Before running the tests, install the required dependencies:

```bash
# Navigate to the server directory
cd Server

# Install local dependencies (including Artillery)
npm install
```

### Running Tests

#### 1. Artillery Load Test
```bash
npm run loadtest:artillery
```

#### 2. K6 Load Test
```bash
npm run loadtest:k6
```

#### 3. Concurrent Node.js Test
```bash
npm run loadtest:concurrent -- --users=100 --duration=120
```

#### 4. Web Dashboard
```bash
npm run loadtest:ui
```
Then open http://localhost:3001

#### 5. Server Monitoring
```bash
npm run loadtest:monitor
```

## Test Scenarios

### User Registration Flow (20%)
- User registration with validation
- Email verification simulation
- Membership application

### User Login Flow (30%)
- User authentication
- JWT token generation
- Profile access

### Accommodation Booking (25%)
- Room availability check
- Booking creation
- Payment processing simulation

### Restaurant Reservation (15%)
- Table availability
- Reservation creation
- Confirmation email

### Meeting/Event Booking (10%)
- Meeting room booking
- Guest management
- Special requirements

## Configuration

### Artillery Configuration (`artillery-config.yml`)

```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      rampTo: 100
      name: "Ramp up to 100 users"
    - duration: 300
      arrivalRate: 100
      name: "Sustained 100 users"
```

### K6 Configuration (`k6-script.js`)

```javascript
export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};
```

### Concurrent Test Configuration

```bash
node loadtest/concurrent-test.js --users=100 --duration=300 --url=http://localhost:5000
```

## Monitoring

### Server Resource Monitoring

The monitoring system tracks:
- CPU usage
- Memory usage
- Disk usage
- System alerts

### Starting Monitoring

```bash
# CLI
node loadtest/monitoring/server-monitor.js start

# NPM script
npm run loadtest:monitor
```

### Monitoring API Endpoints

```
GET /api/monitoring/stats     - Current statistics
GET /api/monitoring/metrics   - Historical metrics
GET /api/monitoring/alerts    - System alerts
POST /api/monitoring/start    - Start monitoring
POST /api/monitoring/stop     - Stop monitoring
```

## Results Analysis

### Performance Metrics

- **Response Time**: Average, min, max, percentiles (P95, P99)
- **Throughput**: Requests per second
- **Success Rate**: Percentage of successful requests
- **Error Rate**: Types and frequency of errors

### Key Thresholds

- **Success Rate**: > 99% (excellent), > 95% (good), < 95% (poor)
- **Response Time**: < 200ms (excellent), < 500ms (good), > 1000ms (poor)
- **Throughput**: > 100 req/sec (excellent), > 50 req/sec (good)

## Web Dashboard

### Features

- **Real-time Metrics**: Live charts and statistics
- **Test Configuration**: GUI for setting up tests
- **Results Visualization**: Interactive charts and tables
- **Historical Data**: Past test results and comparisons

### Running the Dashboard

```bash
cd loadtest/ui
npm install
npm run dev
```

## File Structure

```
loadtest/
├── artillery-config.yml          # Artillery configuration
├── artillery-processor.js        # Artillery custom processor
├── k6-script.js                  # K6 test script
├── concurrent-test.js            # Node.js concurrent testing
├── monitoring/
│   └── server-monitor.js         # Server monitoring system
├── ui/                           # React dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoadTestDashboard.jsx
│   │   │   ├── TestConfiguration.jsx
│   │   │   └── ResultsDisplay.jsx
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Best Practices

### Test Environment

1. **Dedicated Environment**: Run tests on dedicated staging environment
2. **Resource Monitoring**: Always monitor server resources during tests
3. **Gradual Load Increase**: Use ramp-up phases to avoid sudden spikes
4. **Realistic Scenarios**: Base test scenarios on actual user behavior

### Performance Benchmarks

- **Light Load**: 10-50 concurrent users
- **Medium Load**: 50-100 concurrent users
- **Heavy Load**: 100-200 concurrent users
- **Stress Test**: 200+ concurrent users

### Monitoring Alerts

- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 90%
- Response time > 1000ms
- Error rate > 5%

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check server logs
   - Verify database connections
   - Monitor resource usage

2. **Slow Response Times**
   - Check database query performance
   - Monitor network latency
   - Review server configuration

3. **Memory Leaks**
   - Monitor heap usage
   - Check for connection leaks
   - Review garbage collection

### Debug Mode

Enable debug logging:

```bash
DEBUG=loadtest:* npm run loadtest:artillery
```

## Contributing

1. Follow the existing code structure
2. Add comprehensive error handling
3. Include performance metrics
4. Update documentation
5. Test on multiple environments

## License

This load testing suite is part of the backend project and follows the same license terms.
