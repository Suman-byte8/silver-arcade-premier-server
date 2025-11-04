const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const controller = require("../controllers/Reservation/reservation.controller");

// ===================
// PUBLIC (USER) ROUTES - Must come FIRST
// ===================
// No admin middleware – allow clients to create their reservations
router.post("/accommodation", protect, controller.createAccommodationBooking);
router.post("/restaurant", protect, controller.createRestaurantReservation);
router.post("/meeting", protect,  controller.createMeetingReservation);
router.post("/room", protect, controller.createRoomBooking);

// Allow users to fetch their individual booking by type+id (public viewing)
router.get("/:type/:id", controller.getById);
router.get("/room/:roomId/bookings", controller.getRoomBookings);

// ===================
// ADMIN ROUTES - Must come AFTER public routes
// ===================
router.get("/", protect, authorize("admin"), controller.getReservations);         // list with filters
router.put("/:type/:id/status", protect, authorize("admin"), controller.updateStatus); // confirm/cancel
router.put("/:type/:id", protect, authorize("admin"), controller.updateReservation);
router.delete("/:type/:id", protect, authorize("admin"), controller.deleteReservation);

module.exports = router;