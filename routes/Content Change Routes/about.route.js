const express = require('express');
const aboutController = require('../../controllers/Dynamic Content/About Page Controller/about.controller.js');
const { upload, handleMulterError } = require('../../middlewares/uploadMiddleware.js');
const { protect, authorize } = require('../../middlewares/authMiddleware.js');

// Assuming you have protect middleware for protecting routes
// const { protect, authorize("admin") } = require('../../middlewares/protectMiddleware.js');

const router = express.Router();



// --- About Page Route (public viewing) ---
router.get('/', aboutController.getAboutPage);

// --- About Us Section ---
router.put('/admin/update-about-us', protect, authorize("admin"), upload.single('headerImage'), handleMulterError, aboutController.updateAboutUsSection);

// --- Content Blocks ---
router.post('/admin/content-blocks', protect, authorize("admin"), upload.single('image'), handleMulterError, aboutController.addContentBlock);
router.put('/admin/content-blocks/:id', protect, authorize("admin"), upload.single('image'), handleMulterError, aboutController.updateContentBlock);
router.delete('/admin/content-blocks/:id', protect, authorize("admin"), aboutController.deleteContentBlock);

// --- Amenities ---
router.post('/admin/amenities', protect, authorize("admin"), upload.single('image'), aboutController.addAmenity);
router.put('/admin/amenities/:id', protect, authorize("admin"), upload.single('image'), aboutController.updateAmenity);
router.delete('/admin/amenities/:id', protect, authorize("admin"), aboutController.deleteAmenity);

// --- Services ---
router.post('/admin/services', protect, authorize("admin"), upload.single('image'), aboutController.addService);
router.put('/admin/services/:id', protect, authorize("admin"), upload.single('image'), aboutController.updateService);
router.delete('/admin/services/:id', protect, authorize("admin"), aboutController.deleteService);

module.exports = router;
