const mongoose = require('mongoose');
const commonFields = require('../Shared/commonFields');

const navLinkSchema = new mongoose.Schema({
  ...commonFields,
  icon: { type: String },
  page: { type: String, default: 'home' },
  section: { type: String, default: 'nav' },
}, { timestamps: true });

module.exports = mongoose.model('NavLink', navLinkSchema);
