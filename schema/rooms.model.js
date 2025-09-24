const mongoose = require('mongoose');

const roomsSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
  },
  roomType: {
    type: String,
    required: true,
    enum: ["Deluxe Room", "Executive Deluxe Room", "Suite"],
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
  // roomStatus: {
  //     type: String,
  //     enum: ['available', 'booked'],
  //     default: 'available',
  //     required: false
  // },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


const Room = mongoose.model('Room', roomsSchema);
module.exports = Room;