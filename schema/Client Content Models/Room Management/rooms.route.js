const { upload, handleMulterError } = require('../../../middlewares/uploadMiddleware');
const router = require('express').Router();
const { protect, authorize } = require('../../../middlewares/authMiddleware');
const { addRooms, updateRoomDetails, getRooms, deleteRoom, getRoomById } = require('../../../controllers/Dynamic Content/Room Management/rooms.controller');




// add rooms
router.post('/admin/add-rooms', protect, authorize('admin'), upload.fields([
  { name: 'roomImages', maxCount: 10 },
  { name: 'heroImage', maxCount: 1 }
]), handleMulterError, addRooms);
// Update Room Details
router.put('/admin/update-room-details/:roomId', protect, authorize('admin'), upload.fields([
  { name: 'roomImages', maxCount: 10 },
  { name: 'heroImage', maxCount: 1 }
]), handleMulterError, updateRoomDetails);
// get rooms
router.get('/get-rooms', protect, getRooms);
// delete room
router.delete('/admin/delete-room/:roomId', protect, authorize('admin'), deleteRoom);
// get room by id
router.get('/get-room/:roomId', protect, getRoomById);

module.exports = router;