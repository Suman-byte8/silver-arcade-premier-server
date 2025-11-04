const express = require('express');
const router = express.Router();
const { 
  getFacilities, 
  getFacilityById, 
  createFacility, 
  updateFacility, 
  deleteFacility 
} = require('../../controllers/Dynamic Content/Facility Management/facilities.controller');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const { upload, handleMulterError } = require('../../middlewares/uploadMiddleware');
const { check } = require('express-validator');

// Validation middleware
const validateFacility = [
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty()
];

// Get all facilities (public viewing)
router.get('/get-facilities', getFacilities);

// Get facility by ID (public viewing)
router.get('/get-facility/:id', getFacilityById);

// Admin routes - require authentication and admin authorization
router.post('/admin/add-facility', 
  protect, 
  authorize('admin'), 
  upload.single('image'),
  handleMulterError,
  validateFacility,
  createFacility
);

router.put('/admin/update-facility/:id', 
  protect, 
  authorize('admin'), 
  upload.single('image'),
  handleMulterError,
  validateFacility,
  updateFacility
);

router.delete('/admin/delete-facility/:id', 
  protect, 
  authorize('admin'), 
  deleteFacility
);

module.exports = router;
