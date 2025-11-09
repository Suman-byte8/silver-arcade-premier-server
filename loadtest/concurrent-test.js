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
  baseURL: process.env.BASE_URL || 'http://localhost:5000',
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
