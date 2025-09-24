const mongoose = require('mongoose');
const commonFields = require('../Shared/commonFields');

const footerLinkSchema = new mongoose.Schema({
...commonFields,
description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('FooterLink', footerLinkSchema);