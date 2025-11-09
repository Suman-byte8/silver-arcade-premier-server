const mongoose = require('mongoose');

const roomsSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
  },
  roomType: {
    type: String,
    required: true,
    enum: ["Deluxe Room", "Executive Deluxe Room", "Suite", "Family Suite"],
  },
  roomCapacity: {
    type: Number,
    required: false,
    default : 2
  },
  roomPrice: {
    type: Number,
    required: true,
  },
  roomDescription: {
    type: String,
    required: true,
  },
  roomImages: [
    {
      url: {
        type: String,
        required: true,
      },
      isHero: {
        type: Boolean,
        default: false,
      },
    },
  ],
  heroImage: {
    type: String,
    default: null,
  },
  roomStatus: {
    type: String,
    enum: ['available', 'booked', 'maintenance'],
    default: 'available',
    required: true
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for performance
roomsSchema.index({ roomStatus: 1 }); // For filtering by status
roomsSchema.index({ roomType: 1 }); // For filtering by type
roomsSchema.index({ createdAt: -1 }); // For sorting by newest first
roomsSchema.index({ roomStatus: 1, roomType: 1 }); // Compound index for status and type queries


const Room = mongoose.model('Room', roomsSchema);
module.exports = Room;