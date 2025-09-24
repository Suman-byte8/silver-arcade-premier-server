const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    country: {
        type: String,
        default: 'India'
    },
    state: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: ''
    },
    countryCode: {
        type: String,
        default: '+91'
    },
    phoneNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// FIX: Prevent "OverwriteModelError" by checking if the model already exists.
const Membership = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);

module.exports = Membership;