/**
 * Node.js Concurrent Load Testing Script
 * Tests server performance with concurrent user simulations
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 100,
  testDuration: parseInt(process.env.TEST_DURATION) || 300, // 5 minutes
  rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 30, // 30 seconds
  requestTimeout: 10000, // 10 seconds
  thinkTime: { min: 1000, max: 3000 }, // 1-3 seconds between requests
  scenarios: {
    registration: 0.2,  // 20% of requests
    login: 0.3,         // 30% of requests
    accommodation: 0.25, // 25% of requests
    restaurant: 0.15,    // 15% of requests
    meeting: 0.1         // 10% of requests
  }
};

// Performance tracking
class PerformanceTracker {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    };
  }

  recordRequest(responseTime, success, error = null) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      if (error) this.metrics.errors.push(error);
    }
    this.metrics.responseTimes.push(responseTime);
  }

  getStats() {
    const duration = (this.metrics.endTime || Date.now()) - this.metrics.startTime;
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    return {
      duration: `${duration}ms`,
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      successRate: `${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)}%`,
      averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      minResponseTime: `${Math.min(...this.metrics.responseTimes) || 0}ms`,
      maxResponseTime: `${Math.max(...this.metrics.responseTimes) || 0}ms`,
      requestsPerSecond: (this.metrics.totalRequests / (duration / 1000)).toFixed(2),
      p95ResponseTime: this.calculatePercentile(95),
      p99ResponseTime: this.calculatePercentile(99),
      errorCount: this.metrics.errors.length
    };
  }

  calculatePercentile(percentile) {
    if (this.metrics.responseTimes.length === 0) return 0;
    const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return (sorted[lower] * (1 - weight) + sorted[upper] * weight).toFixed(2);
  }

  end() {
    this.metrics.endTime = Date.now();
  }
}

// Test data generators
class TestDataGenerator {
  static generateUser() {
    const id = Math.floor(Math.random() * 100000);
    return {
      firstName: `TestUser${id}`,
      lastName: `LoadTest${id}`,
      email: `concurrent_test_${Date.now()}_${id}@example.com`,
      password: 'TestPassword123!',
      whatsAppNumber: `+1234567890${Math.floor(Math.random() * 100)}`,
      address: '123 Concurrent Test Street'
    };
  }

  static generateAccommodationBooking() {
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + Math.floor(Math.random() * 30) + 1);

    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + Math.floor(Math.random() * 7) + 1);

    return {
      arrivalDate: checkInDate.toISOString().split('T')[0],
      departureDate: checkOutDate.toISOString().split('T')[0],
      checkInTime: '14:00',
      checkOutTime: '11:00',
      nights: Math.floor(Math.random() * 7) + 1,
      selectedRoomTypes: [
        {
          type: ['Deluxe Room', 'Executive Suite', 'Presidential Suite'][Math.floor(Math.random() * 3)],
          count: Math.floor(Math.random() * 3) + 1
        }
      ],
      totalAdults: Math.floor(Math.random() * 4) + 1,
      totalChildren: Math.floor(Math.random() * 3),
      specialRequests: 'Concurrent load testing booking',
      guestInfo: {
        name: `Concurrent Guest ${Math.floor(Math.random() * 1000)}`,
        phoneNumber: `+1234567890${Math.floor(Math.random() * 100)}`,
        email: `concurrent_guest_${Date.now()}@example.com`
      }
    };
  }

  static generateRestaurantReservation() {
    const reservationDate = new Date();
    reservationDate.setDate(reservationDate.getDate() + Math.floor(Math.random() * 30) + 1);

    const timeSlots = ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'];

    return {
      typeOfReservation: 'restaurant',
      noOfDiners: Math.floor(Math.random() * 7) + 2,
      date: reservationDate.toISOString().split('T')[0],
      timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
      guestInfo: {
        name: `Concurrent Diner ${Math.floor(Math.random() * 1000)}`,
        phoneNumber: `+1234567890${Math.floor(Math.random() * 100)}`,
        email: `concurrent_diner_${Date.now()}@example.com`
      },
      specialRequests: 'Concurrent load testing reservation',
      agreeToTnC: true
    };
  }

  static generateMeetingReservation() {
    const reservationDate = new Date();
    reservationDate.setDate(reservationDate.getDate() + Math.floor(Math.random() * 30) + 1);

    const endDate = new Date(reservationDate);
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1);

    return {
      typeOfReservation: 'meeting',
      reservationDate: reservationDate.toISOString().split('T')[0],
      reservationEndDate: endDate.toISOString().split('T')[0],
      numberOfRooms: Math.floor(Math.random() * 3) + 1,
      numberOfGuests: Math.floor(Math.random() * 16) + 5,
      additionalDetails: 'Concurrent load testing meeting',
      guestInfo: {
        name: `Concurrent Organizer ${Math.floor(Math.random() * 1000)}`,
        phoneNumber: `+1234567890${Math.floor(Math.random() * 100)}`,
        email: `concurrent_organizer_${Date.now()}@example.com`
      },
      agreeToTnC: true
    };
  }
}

// User session management
class UserSession {
  constructor(userId) {
    this.userId = userId;
    this.token = null;
    this.isLoggedIn = false;
  }

  setToken(token) {
    this.token = token;
    this.isLoggedIn = true;
  }

  getAuthHeader() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
}

// Concurrent load test runner
class LoadTestRunner {
  constructor(config) {
    this.config = config;
    this.performanceTracker = new PerformanceTracker();
    this.activeUsers = new Map();
    this.userPool = [];
    this.isRunning = false;
  }

  async initializeUserPool() {
    console.log('🔄 Initializing user pool...');
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const userData = TestDataGenerator.generateUser();
      try {
        const response = await axios.post(`${this.config.baseURL}/api/users/register`, userData, {
          timeout: this.config.requestTimeout
        });

        if (response.status === 200 || response.status === 201) {
          const session = new UserSession(i);
          if (response.data.token) {
            session.setToken(response.data.token);
          }
          this.userPool.push(session);
          console.log(`✅ User ${i + 1}/${this.config.concurrentUsers} registered`);
        }
      } catch (error) {
        console.log(`❌ Failed to register user ${i + 1}: ${error.message}`);
      }
    }
    console.log(`🎯 User pool initialized with ${this.userPool.length} users`);
  }

  async loginUser(session) {
    const loginData = {
      email: `concurrent_test_${Date.now()}_${session.userId}@example.com`,
      password: 'TestPassword123!'
    };

    try {
      const response = await axios.post(`${this.config.baseURL}/api/users/login`, loginData, {
        timeout: this.config.requestTimeout
      });

      if (response.status === 200 && response.data.token) {
        session.setToken(response.data.token);
        return true;
      }
    } catch (error) {
      console.log(`❌ Login failed for user ${session.userId}: ${error.message}`);
    }
    return false;
  }

  async executeScenario(session) {
    const scenarios = Object.keys(this.config.scenarios);
    const weights = Object.values(this.config.scenarios);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < scenarios.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return await this[scenarios[i]](session);
      }
    }
  }

  async registration(session) {
    const userData = TestDataGenerator.generateUser();
    const startTime = performance.now();

    try {
      const response = await axios.post(`${this.config.baseURL}/api/users/register`, userData, {
        timeout: this.config.requestTimeout
      });

      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, response.status === 200 || response.status === 201);

      if (response.data.token) {
        session.setToken(response.data.token);
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, false, error.message);
    }
  }

  async login(session) {
    if (!await this.loginUser(session)) {
      const responseTime = 0;
      this.performanceTracker.recordRequest(responseTime, false, 'Login failed');
      return;
    }

    const startTime = performance.now();
    try {
      const response = await axios.get(`${this.config.baseURL}/api/users/profile`, {
        headers: session.getAuthHeader(),
        timeout: this.config.requestTimeout
      });

      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, response.status === 200);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, false, error.message);
    }
  }

  async accommodation(session) {
    if (!session.isLoggedIn && !await this.loginUser(session)) {
      const responseTime = 0;
      this.performanceTracker.recordRequest(responseTime, false, 'Login failed for accommodation booking');
      return;
    }

    const bookingData = TestDataGenerator.generateAccommodationBooking();
    const startTime = performance.now();

    try {
      const response = await axios.post(`${this.config.baseURL}/api/reservations/accommodation`, bookingData, {
        headers: session.getAuthHeader(),
        timeout: this.config.requestTimeout
      });

      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, response.status === 200 || response.status === 201);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, false, error.message);
    }
  }

  async restaurant(session) {
    if (!session.isLoggedIn && !await this.loginUser(session)) {
      const responseTime = 0;
      this.performanceTracker.recordRequest(responseTime, false, 'Login failed for restaurant reservation');
      return;
    }

    const reservationData = TestDataGenerator.generateRestaurantReservation();
    const startTime = performance.now();

    try {
      const response = await axios.post(`${this.config.baseURL}/api/reservations/restaurant`, reservationData, {
        headers: session.getAuthHeader(),
        timeout: this.config.requestTimeout
      });

      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, response.status === 200 || response.status === 201);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, false, error.message);
    }
  }

  async meeting(session) {
    if (!session.isLoggedIn && !await this.loginUser(session)) {
      const responseTime = 0;
      this.performanceTracker.recordRequest(responseTime, false, 'Login failed for meeting reservation');
      return;
    }

    const reservationData = TestDataGenerator.generateMeetingReservation();
    const startTime = performance.now();

    try {
      const response = await axios.post(`${this.config.baseURL}/api/reservations/meeting`, reservationData, {
        headers: session.getAuthHeader(),
        timeout: this.config.requestTimeout
      });

      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, response.status === 200 || response.status === 201);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.performanceTracker.recordRequest(responseTime, false, error.message);
    }
  }

  async runUserSimulation(userId) {
    if (this.userPool.length === 0) {
      console.log(`❌ No users available for simulation ${userId}`);
      return;
    }

    const session = this.userPool[userId % this.userPool.length];

    while (this.isRunning) {
      await this.executeScenario(session);

      // Think time between requests
      const thinkTime = Math.random() * (this.config.thinkTime.max - this.config.thinkTime.min) + this.config.thinkTime.min;
      await new Promise(resolve => setTimeout(resolve, thinkTime));
    }
  }

  async rampUpUsers() {
    console.log('🚀 Starting user ramp-up...');
    const rampUpInterval = this.config.rampUpTime * 1000 / this.config.concurrentUsers;

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      setTimeout(() => {
        if (this.isRunning) {
          this.runUserSimulation(i);
          console.log(`👤 User ${i + 1} started`);
        }
      }, i * rampUpInterval);
    }
  }

  async run() {
    console.log('🏁 Starting concurrent load test...');
    console.log(`📊 Configuration: ${this.config.concurrentUsers} users, ${this.config.testDuration}s duration`);

    this.isRunning = true;

    // Initialize user pool
    await this.initializeUserPool();

    // Start ramp-up
    await this.rampUpUsers();

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.config.testDuration * 1000));

    // Stop test
    this.isRunning = false;
    this.performanceTracker.end();

    // Print results
    console.log('\n📈 Load Test Results:');
    console.log('====================');
    const stats = this.performanceTracker.getStats();
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    // Save results to file
    const resultsPath = path.join(__dirname, 'loadtest', 'concurrent-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      config: this.config,
      results: stats,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`💾 Results saved to ${resultsPath}`);
  }
}

// Main execution
async function main() {
  console.log('🔥 Concurrent Load Testing Script');
  console.log('==================================');

  const runner = new LoadTestRunner(CONFIG);
  await runner.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LoadTestRunner, PerformanceTracker, TestDataGenerator };
