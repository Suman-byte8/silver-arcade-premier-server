const mongoose = require('mongoose');

const socialLinkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  icon: { type: String, required: true },
  url: { type: String, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SocialLink', socialLinkSchema);