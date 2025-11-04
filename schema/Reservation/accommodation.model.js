const mongoose = require("mongoose");

const roomTypeSchema = new mongoose.Schema({
  type: { type: String, required: true },
  count: { type: Number, required: true, min: 1 }
});

const schema = new mongoose.Schema({
  typeOfReservation: { type: String, default: "accommodation" },
  arrivalDate: { type: Date, required: true },
  departureDate: { type: Date, required: true },
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String, required: true },
  nights: { type: Number, required: true },
  selectedRoomTypes: [roomTypeSchema],
  totalAdults: { type: Number, required: true, min: 1 },
  totalChildren: { type: Number, required: true, min: 0 },
  guestInfo: {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true }
  },
  specialRequests: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  }
}, { timestamps: true });

// Indexes for common queries
schema.index({ status: 1, createdAt: -1 });
schema.index({ typeOfReservation: 1 });
schema.index({ arrivalDate: -1 });
schema.index({ "guestInfo.email": 1 });

module.exports = mongoose.model("Accommodation", schema);