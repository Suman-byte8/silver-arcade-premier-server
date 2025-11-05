const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { addRooms, updateRoomDetails, getRooms, deleteRoom, getRoomById, updateRoomStatus } = require('../controllers/Dynamic Content/Room Management/rooms.controller');
const { upload } = require('../middlewares/uploadMiddleware');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');

// Room routes
router.get('/get-rooms', cacheMiddleware(300), getRooms); // Cache for 5 minutes
router.get('/get-room/:roomId', getRoomById);

// Protected admin routes
router.post('/admin/add-rooms',
    protect,
    authorize('admin'),
    upload.fields([
        { name: 'heroImage', maxCount: 1 },
        { name: 'roomImages', maxCount: 10 }
    ]),
    addRooms
);

router.put('/admin/update-room-details/:roomId',
    protect,
    authorize('admin'),
    upload.fields([
        { name: 'heroImage', maxCount: 1 },
        { name: 'roomImages', maxCount: 10 }
    ]),
    updateRoomDetails
);

router.patch('/admin/update-room-status/:roomId',
    protect,
    authorize('admin'),
    updateRoomStatus
);

router.delete('/admin/delete-room/:roomId',
    protect,
    authorize('admin'),
    deleteRoom
);

module.exports = router;