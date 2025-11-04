const cloudinary = require('../../../config/cloudinary')
const streamifier = require('streamifier');
const Room = require('../../../schema/rooms.model');
const { emitRoomEvent } = require('../../../utils/socketManager');

// add rooms
async function addRooms(req, res) {
    try {
        const { roomName, roomType, roomCapacity, roomPrice, roomDescription, roomStatus } = req.body;
        
        const roomImages = [];
        let heroImageUrl = null;
        
        // Handle hero image upload
        if (req.files && req.files['heroImage'] && req.files['heroImage'][0]) {
            try {
                const heroFile = req.files['heroImage'][0];
                const heroResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'silver-arcade/rooms/hero',
                        },
                        (error, result) => {
                            if (result) {
                                resolve(result);
                            } else {
                                reject(error);
                            }
                        }
                    );
                    streamifier.createReadStream(heroFile.buffer).pipe(stream);
                });
                heroImageUrl = heroResult.secure_url;
            } catch (error) {
                console.error('Error uploading hero image:', error);
                return res.status(500).json({ message: 'Error uploading hero image' });
            }
        }
        
        // Handle room images upload
        if (req.files && req.files['roomImages'] && req.files['roomImages'].length > 0) {
            try {
                const uploadPromises = req.files['roomImages'].map((file) => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'silver-arcade/rooms',
                            },
                            (error, result) => {
                                if (result) {
                                    resolve({
                                        url: result.secure_url,
                                        isHero: false
                                    });
                                } else {
                                    reject(error);
                                }
                            }
                        );
                        streamifier.createReadStream(file.buffer).pipe(stream);
                    });
                });
                
                const uploadedImages = await Promise.all(uploadPromises);
                roomImages.push(...uploadedImages);
            } catch (error) {
                console.error('Error uploading room images:', error);
                return res.status(500).json({ message: 'Error uploading room images' });
            }
        }
        
        const newRoom = new Room({
            roomName,
            roomType,
            roomCapacity,
            roomPrice,
            roomDescription,
            roomImages,
            roomStatus,
            heroImage: heroImageUrl
        });
        await newRoom.save();
        
        // Emit socket event for new room
        emitRoomEvent('roomCreated', newRoom._id, newRoom);

        res.status(201).json({
            success: true,
            message: 'Room added successfully',
            room: newRoom
        });
    } catch (error) {
        console.error('Error adding room:', error);
        res.status(500).json({ message: 'Server error while adding room' });
    }
}

// update room details
async function updateRoomDetails(req, res) {
    try {
        const { roomId } = req.params;
        const { roomName, roomType, roomCapacity, roomPrice, roomDescription, removedImages: removedImagesJSON } = req.body;
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        room.roomName = roomName || room.roomName;
        room.roomType = roomType || room.roomType;
        room.roomCapacity = roomCapacity || room.roomCapacity;
        room.roomPrice = roomPrice || room.roomPrice;
        room.roomDescription = roomDescription || room.roomDescription;

        if (removedImagesJSON) {
            const removedImages = JSON.parse(removedImagesJSON);
            if (Array.isArray(removedImages) && removedImages.length > 0) {
                // Optional: Delete from Cloudinary
                const publicIds = room.roomImages
                    .filter(img => removedImages.includes(img._id.toString()))
                    .map(img => {
                        const parts = img.url.split('/');
                        const publicIdWithExtension = parts.slice(parts.indexOf('silver-arcade')).join('/');
                        return publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
                    });

                if (publicIds.length > 0) {
                    await cloudinary.api.delete_resources(publicIds);
                }

                room.roomImages = room.roomImages.filter(img => !removedImages.includes(img._id.toString()));
            }
        }

        // room.roomStatus = roomStatus || room.roomStatus;
        
        // Handle hero image upload
        if (req.files && req.files['heroImage'] && req.files['heroImage'][0]) {
            try {
                const heroFile = req.files['heroImage'][0];
                const heroResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'silver-arcade/rooms/hero',
                        },
                        (error, result) => {
                            if (result) {
                                resolve(result);
                            } else {
                                reject(error);
                            }
                        }
                    );
                    streamifier.createReadStream(heroFile.buffer).pipe(stream);
                });
                room.heroImage = heroResult.secure_url;
            } catch (error) {
                console.error('Error uploading hero image:', error);
                return res.status(500).json({ message: 'Error uploading hero image' });
            }
        }
        
        // Handle room images upload
        if (req.files && req.files['roomImages'] && req.files['roomImages'].length > 0) {
            try {
                const uploadPromises = req.files['roomImages'].map((file) => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'silver-arcade/rooms',
                            },
                            (error, result) => {
                                if (result) {
                                    resolve({
                                        url: result.secure_url,
                                        isHero: false
                                    });
                                } else {
                                    reject(error);
                                }
                            }
                        );
                        streamifier.createReadStream(file.buffer).pipe(stream);
                    });
                });
                
                const uploadedImages = await Promise.all(uploadPromises);
                room.roomImages.push(...uploadedImages);
            } catch (error) {
                console.error('Error uploading room images:', error);
                return res.status(500).json({ message: 'Error uploading room images' });
            }
        }
        
        await room.save();

        // Emit socket event for room update
        emitRoomEvent('roomUpdated', roomId, room);
        if (room.roomStatus) {
            emitRoomEvent('roomBookingStatusChanged', roomId, {
                roomId: room._id,
                status: room.roomStatus,
                bookingId: room.currentBooking
            });
        }

        res.status(200).json({
            success: true,
            message: 'Room updated successfully',
            room
        });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ message: 'Server error while updating room' });
    }
}

// get all rooms
async function getRooms(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default limit to 20 for rooms
        const skip = (page - 1) * limit;

        const rooms = await Room.find({})
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }); // Sort by newest first

        const total = await Room.countDocuments();

        res.status(200).json({
            success: true,
            message: 'Rooms retrieved successfully',
            rooms,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error retrieving rooms:', error);
        res.status(500).json({ message: 'Server error while retrieving rooms' });
    }
}

// delete room by id
async function deleteRoom(req, res) {
    try {
        const { roomId } = req.params;
        const room = await Room.findByIdAndDelete(roomId);
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Emit socket event for room deletion
        emitRoomEvent('roomDeleted', roomId, { roomId });
        
        res.status(200).json({
            success: true,
            message: 'Room deleted successfully',
            room
        });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ message: 'Server error while deleting room' });
    }
}

// get room by id
async function getRoomById(req, res) {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Room retrieved successfully',
            room
        });
    } catch (error) {
        console.error('Error retrieving room:', error);
        res.status(500).json({ message: 'Server error while retrieving room' });
    }
}

module.exports = {
    addRooms,
    updateRoomDetails,
    getRooms,
    deleteRoom,
    getRoomById
};
