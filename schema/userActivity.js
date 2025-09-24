const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, enum: ["signup", "login"], required: true },
  timestamp: { type: Date, default: Date.now },
  userAgent: String,
  ipAddress: String,
});

module.exports = mongoose.model("userActivity", activitySchema);
