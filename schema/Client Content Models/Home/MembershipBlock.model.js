const mongoose = require('mongoose');

const membershipBlockSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  url: { type: String, required: true },
  page: { type: String, default: 'membership' },
  section: { type: String, default: 'main' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('MembershipBlock', membershipBlockSchema);

