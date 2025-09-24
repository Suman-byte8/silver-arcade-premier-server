const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUserReservations
} = require('../controllers/user.controller');
const { protect } = require('../middlewares/authMiddleware');

// ---------------- USER AUTH ----------------
const validateRegistration = [
  check('firstName', 'First name is required').not().isEmpty(),
  check('lastName', 'Last name is required').not().isEmpty(),
  check('whatsAppNumber', 'WhatsApp number is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('address', 'Address is required').not().isEmpty(),
  check('password', 'Password is required').not().isEmpty(),
  check('memberShipType').optional(),
  check('memberShipStartDate').optional(),
  check('memberShipEndDate').optional(),
  check('phoneNumber').optional(),
  check('alternateNumber').optional(),
];

const validateLogin = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').not().isEmpty()
];

// Auth routes
router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// User's own reservations
router.get('/my-reservations', protect, getUserReservations);

module.exports = router;