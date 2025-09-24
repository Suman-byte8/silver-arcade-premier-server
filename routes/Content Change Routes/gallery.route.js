const express = require('express');
const galleryController = require('../../controllers/gallery.controller.js');
const { upload, handleMulterError } = require('../../middlewares/uploadMiddleware.js');
const { protect, authorize } = require('../../middlewares/authMiddleware.js');

const router = express.Router();

// Get gallery images, optionally filtered by tab
router.get('/', galleryController.getGalleryImages);

// Admin routes for managing gallery images
router.post('/admin', protect, authorize("admin"), upload.array('images', 20), handleMulterError, galleryController.addGalleryImage);
router.put('/admin/:id', protect, authorize("admin"), upload.single('image'), handleMulterError, galleryController.updateGalleryImage);
router.delete('/admin/:id', protect, authorize("admin"), galleryController.deleteGalleryImage);

module.exports = router;
