const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', ''],
        default: ''
    },
    memberShipType: {
        type: String,
        enum: ['Silver Guest', 'Gold Traveler', 'Platinum Premier', 'Corporate/Business Elite', ''],
        default: ''
    },
    state: {
        type: String,
        default: ''
    },
    country: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: ''
    },
    memberShipStartDate: {
        type: Date,
        default:''

    },
    memberShipEndDate: {
        type: Date,
        default:''
        
    },
    phoneNumber: {
        type: String,
        required: true

    },
    whatsAppNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        default: ''
    },
    alternateNumber: {
        type: String,
        // required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for performance
userSchema.index({ status: 1 });
userSchema.index({ memberShipType: 1 });
userSchema.index({ email: 1 }); // Already unique, but index for faster lookups

const User = mongoose.model('User', userSchema);

module.exports = User;