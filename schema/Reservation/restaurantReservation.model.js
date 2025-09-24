const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  typeOfReservation: { type: String, enum: ["restaurant","bar","outdoor","private"], default: "restaurant" },
  noOfDiners: { type: Number, required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, enum: ["Breakfast","Lunch","Dinner"], required: true },
  specialRequests: { type: String, default: "" },
  additionalDetails: { type: String, default: "" },
  guestInfo: {
    name: String,
    phoneNumber: String,
    email: { type: String, required: true }
  },
  agreeToTnC: { type: Boolean, required: true },
  status: {
    type: String,
    enum: ["pending","confirmed","seated","no-show","cancelled"],
    default: "pending"
  }
}, { timestamps: true });

// indexes
schema.index({ status: 1, createdAt: -1 });
schema.index({ date: -1 });
schema.index({ "guestInfo.email": 1 });

module.exports = mongoose.model("RestaurantReservation", schema);
