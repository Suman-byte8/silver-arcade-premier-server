// schema/Table/table.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const tableSchema = new Schema(
  {
    // Basic table information
    tableNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    section: {
      type: String,
      enum: ['restaurant', 'bar', 'outdoor', 'private', 'patio', 'rooftop', 'vip'],
      required: true,
      default: 'restaurant',
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'occupied', 'dirty', 'maintenance', 'out_of_service'],
      default: 'available',
    },

    // Physical characteristics
    features: [
      {
        type: String,
        enum: ['wheelchair', 'highchair', 'window', 'booth', 'private', 'tv', 'fireplace', 'corner', 'near_kitchen', 'romantic', 'family_friendly'],
      },
    ],

    // Location and description
    locationDescription: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    floor: {
      type: Number,
      default: 1,
      min: 1,
    },
    coordinates: {
      x: { type: Number, min: 0 },
      y: { type: Number, min: 0 }
    },

    // Assignment and reservation tracking
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Link to the active reservation assigned to this table
    currentReservation: {
      reservationId: { type: Schema.Types.ObjectId, default: null },
      reservationType: { type: String, enum: ['restaurant', 'meeting', 'accommodation', 'bar', 'outdoor', 'private'], default: 'restaurant' },
      guestName: { type: String, trim: true, default: null },
      assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
    },
    currentGuest: {
      type: String,
      trim: true,
      default: null,
    },
    previousGuests: [
      {
        name: {
          type: String,
          trim: true,
        },
        visitedAt: {
          type: Date,
          default: Date.now,
        }
      }
    ],

    // Timestamps for various states
    lastAssignedAt: {
      type: Date,
      default: null,
    },
    lastOccupiedAt: {
      type: Date,
      default: null,
    },
    lastFreedAt: {
      type: Date,
      default: null,
    },
    lastCleaned: {
      type: Date,
      default: null,
    },

    // Priority and special handling
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    specialNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Assignment history
    assignmentHistory: [
      {
        reservationId: { type: Schema.Types.ObjectId, default: null },
        reservationType: { type: String, enum: ['restaurant', 'meeting', 'accommodation', 'bar', 'outdoor', 'private'], default: 'restaurant' },
        guestName: {
          type: String,
          trim: true,
        },
        assignedAt: {
          type: Date,
          required: true,
        },
        freedAt: {
          type: Date,
          default: null,
        },
        assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        notes: {
          type: String,
          trim: true,
        }
      }
    ]
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for availability status
tableSchema.virtual('isAvailable').get(function () {
  return this.status === 'available' && this.isActive;
});

// Indexes for performance
tableSchema.index({ section: 1, status: 1 });
tableSchema.index({ status: 1, capacity: -1 });
tableSchema.index({ priority: -1, status: 1 });
tableSchema.index({ isActive: 1, status: 1 });

// Pre-save middleware to update timestamps
tableSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case 'reserved':
        this.lastAssignedAt = now;
        break;
      case 'occupied':
        this.lastOccupiedAt = now;
        break;
      case 'available':
        this.lastFreedAt = now;
        break;
    }
  }

  next();
});

// Static method to find tables by availability
tableSchema.statics.findAvailable = function (criteria = {}) {
  return this.find({
    status: 'available',
    isActive: true,
    ...criteria
  });
};

// Static method to get table statistics
tableSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalTables: { $sum: 1 },
        activeTables: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        availableTables: {
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
        },
        reservedTables: {
          $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] }
        },
        occupiedTables: {
          $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] }
        },
        maintenanceTables: {
          $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
        },
        averageCapacity: { $avg: '$capacity' },
        totalCapacity: { $sum: '$capacity' }
      }
    }
  ]);

  return stats[0] || {
    totalTables: 0,
    activeTables: 0,
    availableTables: 0,
    reservedTables: 0,
    occupiedTables: 0,
    maintenanceTables: 0,
    averageCapacity: 0,
    totalCapacity: 0
  };
};

module.exports = mongoose.model('Table', tableSchema);


// // Example of problematic middleware (hypothetical)
// tableSchema.pre('findOneAndUpdate', function(next) {
//   // ... some logic ...
//   if (someCondition) {
//       // ACCIDENTAL: Setting tableNumber to empty string
//       this.set({ tableNumber: '' }); // <--- BAD!
//   }
//   next();
// });