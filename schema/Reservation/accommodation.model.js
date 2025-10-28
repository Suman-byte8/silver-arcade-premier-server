const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  adults: { type: Number, required: true, min: 1, max: 4 },
  children: { type: Number, required: true, min: 0, max: 4 }
});

const schema = new mongoose.Schema({
  typeOfReservation: { type: String, default: "accommodation" },
  arrivalDate: { type: Date, required: true },
  departureDate: { type: Date, required: true },
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String, required: true },
  nights: { type: Number, required: true },
  rooms: [roomSchema],
  totalAdults: { type: Number, required: true, min: 1 },
  totalChildren: { type: Number, required: true, min: 0 },
  guestInfo: {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  }
}, { timestamps: true });

// Indexes
schema.index({ status: 1, createdAt: -1 });
schema.index({ typeOfReservation: 1 });
schema.index({ arrivalDate: -1 });
schema.index({ "guestInfo.email": 1 });

module.exports = mongoose.model("Accommodation", schema);