const mongoose = require('mongoose');
const commonFields = require('../Shared/commonFields');

const facilitySchema = new mongoose.Schema({
  ...commonFields,
  subtitle: { type: String },
  description: { type: String, required: true },
  image: { type: String, default: '/assets/default-facility.jpg' }, // Set default image path
});

module.exports = mongoose.model('Facility', facilitySchema);
