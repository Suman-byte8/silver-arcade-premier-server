import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const registrationTrend = new Trend('registration_duration');
const loginTrend = new Trend('login_duration');
const bookingTrend = new Trend('booking_duration');

// Test configuration
export const options = {
  scenarios: {
    // Ramp up test
    ramp_up: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users over 1 minute
        { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
        { duration: '3m', target: 100 },  // Ramp up to 100 users over 3 minutes
        { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
        { duration: '2m', target: 200 },  // Peak load: 200 users for 2 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'ramp_up' },
    },

    // Stress test with constant high load
    stress_test: {
      executor: 'constant-vus',
      vus: 150,
      duration: '10m',
      tags: { test_type: 'stress' },
    },

    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 10 },   // Normal load
        { duration: '10s', target: 500 },  // Spike to 500 users
        { duration: '30s', target: 500 },  // Stay at spike
        { duration: '10s', target: 10 },   // Back to normal
        { duration: '10s', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'spike' },
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
    errors: ['rate<0.1'],              // Custom error rate
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Test data pools
const testUsers = [];
const authTokens = [];

// Setup function - runs before the test
export function setup() {
  console.log('🚀 Starting K6 load test setup...');

  // Pre-create some test users for login scenarios
  for (let i = 0; i < 50; i++) {
    const user = {
      firstName: `TestUser${i}`,
      lastName: `LoadTest${i}`,
      email: `k6test${i}@example.com`,
      password: 'TestPassword123!',
      whatsAppNumber: `+1234567890${i.toString().padStart(2, '0')}`,
      address: '123 Load Test Street'
    };
    testUsers.push(user);
  }

  console.log(`✅ Created ${testUsers.length} test users for login scenarios`);
  return { testUsers };
}

// Main test function
export default function (data) {
  const userIndex = Math.floor(Math.random() * data.testUsers.length);
  const testUser = data.testUsers[userIndex];

  // Scenario selection based on VU ID
  const scenario = Math.floor(Math.random() * 100);

  if (scenario < 30) {
    // 30% - User registration
    userRegistration(testUser);
  } else if (scenario < 60) {
    // 30% - User login
    userLogin(testUser);
  } else if (scenario < 80) {
    // 20% - Accommodation booking
    accommodationBooking(testUser);
  } else {
    // 20% - Restaurant reservation
    restaurantReservation(testUser);
  }

  // Random think time between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// User registration scenario
function userRegistration(user) {
  const startTime = new Date().getTime();

  const registrationData = {
    firstName: user.firstName + Math.floor(Math.random() * 1000),
    lastName: user.lastName,
    email: `reg_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`,
    password: user.password,
    whatsAppNumber: user.whatsAppNumber,
    address: user.address
  };

  const response = http.post(
    `${BASE_URL}/api/users/register`,
    JSON.stringify(registrationData),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const duration = new Date().getTime() - startTime;
  registrationTrend.add(duration);

  const checkResult = check(response, {
    'registration status is 201': (r) => r.status === 201,
    'registration response time < 2000ms': (r) => r.timings.duration < 2000,
    'registration has token': (r) => r.json().token !== undefined,
  });

  if (!checkResult) {
    errorRate.add(1);
    console.error(`Registration failed: ${response.status} - ${response.body}`);
  } else {
    // Store token for potential reuse
    if (response.json().token) {
      authTokens.push(response.json().token);
    }
  }
}

// User login scenario
function userLogin(user) {
  const startTime = new Date().getTime();

  const loginData = {
    email: user.email,
    password: user.password
  };

  const response = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify(loginData),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const duration = new Date().getTime() - startTime;
  loginTrend.add(duration);

  const checkResult = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
    'login has token': (r) => r.json().token !== undefined,
  });

  if (!checkResult) {
    errorRate.add(1);
    console.error(`Login failed: ${response.status} - ${response.body}`);
  }
}

// Accommodation booking scenario
function accommodationBooking(user) {
  const startTime = new Date().getTime();

  // First login to get token
  const loginResponse = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify({
      email: user.email,
      password: user.password
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginResponse.status !== 200) {
    errorRate.add(1);
    return;
  }

  const token = loginResponse.json().token;

  // Generate booking data
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + Math.floor(Math.random() * 30) + 1);

  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + Math.floor(Math.random() * 7) + 1);

  const bookingData = {
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
    specialRequests: 'Load testing booking',
    guestInfo: {
      name: `Test Guest ${Math.floor(Math.random() * 1000)}`,
      phoneNumber: `+1234567890${Math.floor(Math.random() * 100)}`,
      email: `guest${Date.now()}@example.com`
    }
  };

  const response = http.post(
    `${BASE_URL}/api/reservations/accommodation`,
    JSON.stringify(bookingData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const duration = new Date().getTime() - startTime;
  bookingTrend.add(duration);

  const checkResult = check(response, {
    'booking status is 201': (r) => r.status === 201,
    'booking response time < 3000ms': (r) => r.timings.duration < 3000,
    'booking has data': (r) => r.json().data !== undefined,
  });

  if (!checkResult) {
    errorRate.add(1);
    console.error(`Booking failed: ${response.status} - ${response.body}`);
  }
}

// Restaurant reservation scenario
function restaurantReservation(user) {
  const startTime = new Date().getTime();

  // First login to get token
  const loginResponse = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify({
      email: user.email,
      password: user.password
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginResponse.status !== 200) {
    errorRate.add(1);
    return;
  }

  const token = loginResponse.json().token;

  // Generate reservation data
  const reservationDate = new Date();
  reservationDate.setDate(reservationDate.getDate() + Math.floor(Math.random() * 30) + 1);

  const timeSlots = ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'];
  const reservationData = {
    typeOfReservation: 'restaurant',
    noOfDiners: Math.floor(Math.random() * 7) + 2,
    date: reservationDate.toISOString().split('T')[0],
    timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
    guestInfo: {
      name: `Test Diner ${Math.floor(Math.random() * 1000)}`,
      phoneNumber: `+1234567890${Math.floor(Math.random() * 100)}`,
      email: `diner${Date.now()}@example.com`
    },
    specialRequests: 'Load testing reservation',
    agreeToTnC: true
  };

  const response = http.post(
    `${BASE_URL}/api/reservations/restaurant`,
    JSON.stringify(reservationData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const duration = new Date().getTime() - startTime;
  bookingTrend.add(duration);

  const checkResult = check(response, {
    'reservation status is 201': (r) => r.status === 201,
    'reservation response time < 3000ms': (r) => r.timings.duration < 3000,
    'reservation has data': (r) => r.json().data !== undefined,
  });

  if (!checkResult) {
    errorRate.add(1);
    console.error(`Reservation failed: ${response.status} - ${response.body}`);
  }
}

// Cleanup function - runs after the test
export function teardown(data) {
  console.log('🧹 K6 load test cleanup completed');
  console.log(`📊 Test completed with ${authTokens.length} cached tokens`);
}
