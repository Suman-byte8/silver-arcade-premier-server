const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  typeOfReservation: {
    type: String,
    enum: ["Marriage","Reception","Birthday","Office Meeting","Other"],
    required: true
  },
  reservationDate: Date,
  reservationEndDate: Date,
  numberOfRooms: Number,
  numberOfGuests: Number,
  guestInfo: {
    name: String,
    phoneNumber: String,
    email: String
  },
  agreeToTnC: Boolean,
  status: { type: String, enum: ["pending","confirmed","cancelled"], default: "pending" }
}, { timestamps: true });

// indexes
schema.index({ status: 1, createdAt: -1 });
schema.index({ reservationDate: -1 });
schema.index({ "guestInfo.email": 1 });

module.exports = mongoose.model("MeetingOrWeddingReservation", schema);