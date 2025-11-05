const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./db/connectDB');
require('dotenv').config();
const http = require('http');
const { init } = require('./utils/socketManager');
const { cache } = require('./config/redis');
const {
  securityMiddleware,
  additionalSecurityHeaders,
  requestSizeLimiter,
  corsOptions
} = require('./middlewares/security');
const {
  apiRateLimiter,
  authRateLimiter,
  uploadRateLimiter
} = require('./middlewares/rateLimiter');

const app = express();
const server = http.createServer(app);

// Initialize socket.io
init(server);

// Security middleware (must be first)
app.use(securityMiddleware);
app.use(additionalSecurityHeaders);

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting
app.use('/api/auth', authRateLimiter);
app.use('/api/admin', apiRateLimiter);
app.use('/api/users', apiRateLimiter);
app.use('/api/rooms/admin', uploadRateLimiter);

// Request size limiting
app.use(requestSizeLimiter);

// Compression
app.use(compression({
  level: 6, // Best compression
  threshold: 1024, // Compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Database connection middleware for serverless
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ message: 'Database connection failed' });
    }
});

// Import routes
const adminRoutes = require('./routes/admin.route.js');
const userRoutes = require('./routes/user.route.js');
const membershipRoutes = require('./routes/membership.route.js');
const homeRoutes = require('./routes/Content Change Routes/home.route.js');
const roomsRoutes = require('./routes/rooms.route.js');
const facilitiesRoutes = require('./routes/Content Change Routes/facilities.route.js');
const aboutRoutes = require('./routes/Content Change Routes/about.route.js');
const contactRoutes = require('./routes/contact.route.js');
const galleryRoutes = require('./routes/Content Change Routes/gallery.route.js');
const reservationRoutes = require('./routes/reservation.route.js');
const tableRoutes = require('./routes/Table/table.route.js');

// Routes
// admin routes
app.use('/api/admin', adminRoutes);
// user routes
app.use('/api/users', userRoutes);
// membership routes
app.use('/api/membership', membershipRoutes);
// content routes
app.use('/api/content/home', homeRoutes);
// room routes
app.use('/api/rooms', roomsRoutes);
// facilities routes
app.use('/api/facilities', facilitiesRoutes);
// about routes
app.use('/api/content/about', aboutRoutes);
// gallery routes
app.use('/api/content/gallery', galleryRoutes);
// reservation routes
app.use('/api/reservations', reservationRoutes);
// contact routes
app.use('/api/contact', contactRoutes);
// table reservation routes
console.log('🔍 [DEBUG] Loading table routes...');
app.use('/api/tables', tableRoutes);
console.log('🔍 [DEBUG] Table routes loaded successfully');

// Add logging middleware for debugging
app.use('/api/tables/available', (req, res, next) => {
  console.log('🔍 [DEBUG] Available tables route hit:', req.method, req.path, req.query);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.send('OK');
});

// For local development
if (require.main === module) {
  const port = process.env.PORT;
  connectDB()
    .then(() => {
      server.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    })
    .catch((err) => {
      console.error('Database connection error:', err);
      process.exit(1);
    });
}

module.exports = app;
