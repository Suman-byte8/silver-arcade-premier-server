const router = require('express').Router();
const { protect, authorize } = require('../../middlewares/authMiddleware');
const { upload, handleMulterError } = require('../../middlewares/uploadMiddleware');


// routes for hero banner
const { getHeroBanner, addHeroBanner, updateHeroBanner, deleteHeroBanner } = require('../../controllers/Dynamic Content/Home Page Controller/heroBanner.controller');
// get hero banner (public viewing)
router.get('/hero-banner', getHeroBanner);
// add hero banner (admin only)
router.post('/add-hero-banner', protect, authorize('admin'), upload.single('image'), handleMulterError, addHeroBanner);
// update hero banner (admin only)
router.put('/update-hero-banner/:id', protect, authorize('admin'), upload.single('image'), handleMulterError, updateHeroBanner);
// delete hero banner (admin only)
router.delete('/delete-hero-banner/:id', protect, authorize('admin'), deleteHeroBanner);


// routes for distinctive features
const { addDistinctive, getDistinctives, updateDistinctive, deleteDistinctive } = require('../../controllers/Dynamic Content/Home Page Controller/distinctive.controller');

// Create
router.post("/add-distinctive", protect, authorize("admin"), upload.array("images"), handleMulterError, addDistinctive);
// Get all (public viewing)
router.get("/distinctives", getDistinctives);
// Update
router.put("/distinctive/:id", protect, authorize("admin"), updateDistinctive);
// Delete
router.delete("/distinctive/:id", protect, authorize("admin"), deleteDistinctive);


// routes for curated offers
const { addOffers, updateOffers, deleteOffers, getOffers } = require('../../controllers/Dynamic Content/Home Page Controller/curatedOffer.controller');
// Add Curated Offers
router.post('/add-curated-offer', protect, authorize('admin'), upload.single('image'), handleMulterError, addOffers);
// Update Curated Offers
router.put('/update-curated-offer/:id', protect, authorize('admin'), upload.single('image'), handleMulterError, updateOffers);
// Delete Curated Offers
router.delete('/delete-curated-offer/:id', protect, authorize('admin'), deleteOffers);
// Get Curated Offers (public viewing)
router.get('/get-curated-offers', getOffers);

// routes for footer links
const { addFooterLinks, getFooterLinks, updateFooterLink, deleteFooterLink } = require('../../controllers/Dynamic Content/Home Page Controller/footer.controller');
// Add Footer Links
router.post('/add-footer-link', protect, authorize('admin'), addFooterLinks);
// Get Footer Links (public viewing)
router.get('/get-footer-links', getFooterLinks);
// Update Footer Link
router.put('/update-footer-link/:id', protect, authorize('admin'), updateFooterLink);
// Delete Footer Link
router.delete('/delete-footer-link/:id', protect, authorize('admin'), deleteFooterLink);

// routes for membership block
const { addMembershipBlock, updateMembershipBlock, deleteMembershipBlock, getMembershipBlocks } = require('../../controllers/Dynamic Content/Home Page Controller/membershipBlock.controller');
// Add Membership Block
router.post('/add-membership-block', protect, authorize('admin'), upload.single('image'), handleMulterError, addMembershipBlock);
// Update Membership Block
router.put('/update-membership-block/:id', protect, authorize('admin'), upload.single('image'), handleMulterError, updateMembershipBlock);
// Delete Membership Block
router.delete('/delete-membership-block/:id', protect, authorize('admin'), deleteMembershipBlock);
// Get Membership Blocks (public viewing)
router.get('/get-membership-blocks', getMembershipBlocks);


// routes for nav links
const { addNavLink, updateNavLink, deleteNavLink, getNavLinks } = require('../../controllers/Dynamic Content/Home Page Controller/navLinks.controller');
// Add Nav Link
router.post('/add-nav-link', protect, authorize('admin'), addNavLink);
// Update Nav Link
router.put('/update-nav-link/:id', protect, authorize('admin'), updateNavLink);
// Delete Nav Link
router.delete('/delete-nav-link/:id', protect, authorize('admin'), deleteNavLink);
// Get Nav Links (public viewing)
router.get('/get-nav-links', getNavLinks);



module.exports = router;