const express = require('express');
const router = express.Router();
const {
    registerMembership,
    getMemberships,
    getMembershipById,
    updateMembershipStatus,
    updateMembershipDates,
    deleteMembership
} = require('../controllers/membership.controller');
const { check } = require('express-validator');
const { authorize, protect } = require('../middlewares/authMiddleware');

// Validation middleware for membership registration
const validateMembershipRegistration = [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('country').optional(),
    check('state').optional(),
    check('city').optional(),
    check('countryCode').optional()
];

// Register membership route
router.post('/register', protect, validateMembershipRegistration, registerMembership);

// Get all memberships
router.get('/' , protect ,authorize('admin'), getMemberships);

// Get membership by ID
router.get('/:id', protect, authorize('admin'), getMembershipById);

// Update membership status
router.put('/:id/status',protect, authorize('admin'), updateMembershipStatus);

// Update membership dates
router.put('/:id/dates', protect, authorize('admin'), updateMembershipDates);

// Delete membership
router.delete('/:id',  protect, authorize('admin'),deleteMembership);

module.exports = router;
