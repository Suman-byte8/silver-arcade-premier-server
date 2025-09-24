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
      index: true,
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
      ref: 'Staff',
      default: null,
    },
    currentReservation: {
      type: Schema.Types.ObjectId,
      ref: 'RestaurantReservation',
      default: null,
    },

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

    // Maintenance and service tracking
    maintenanceSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'as_needed'],
      default: 'as_needed',
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    },
    nextMaintenanceDate: {
      type: Date,
      default: null,
    },

    // Performance and metrics
    totalReservations: {
      type: Number,
      default: 0,
    },
    totalOccupancyTime: {
      type: Number, // in minutes
      default: 0,
    },
    averageTurnoverTime: {
      type: Number, // in minutes
      default: 0,
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
        reservation: {
          type: Schema.Types.ObjectId,
          ref: 'RestaurantReservation',
          required: true,
        },
        assignedAt: {
          type: Date,
          required: true,
        },
        freedAt: {
          type: Date,
          default: null,
        },
        assignedBy: {
          type: Schema.Types.ObjectId,
          ref: 'Staff',
        },
        transferReason: {
          type: String,
          trim: true,
        },
        maintenanceNote: {
          type: String,
          trim: true,
        },
        duration: {
          type: Number, // in minutes
          default: 0,
        }
      }
    ],

    // Cleaning and service history
    cleaningHistory: [
      {
        cleanedAt: {
          type: Date,
          required: true,
        },
        cleanedBy: {
          type: Schema.Types.ObjectId,
          ref: 'Staff',
        },
        type: {
          type: String,
          enum: ['regular', 'deep', 'emergency'],
          default: 'regular',
        },
        notes: {
          type: String,
          trim: true,
        }
      }
    ],

    // Revenue tracking
    revenueGenerated: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageSpendPerGuest: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Quality and feedback
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    customerFeedback: [
      {
        reservation: {
          type: Schema.Types.ObjectId,
          ref: 'RestaurantReservation',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        comment: {
          type: String,
          trim: true,
        },
        submittedAt: {
          type: Date,
          default: Date.now,
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

// Virtual for current utilization rate
tableSchema.virtual('utilizationRate').get(function() {
  if (this.totalReservations === 0) return 0;
  return (this.totalOccupancyTime / (this.totalReservations * 120)) * 100; // Assuming 2-hour average
});

// Virtual for availability status
tableSchema.virtual('isAvailable').get(function() {
  return this.status === 'available' && this.isActive;
});

// Virtual for days since last maintenance
tableSchema.virtual('daysSinceMaintenance').get(function() {
  if (!this.lastMaintenanceDate) return null;
  const diffTime = Math.abs(new Date() - this.lastMaintenanceDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for average daily revenue
tableSchema.virtual('averageDailyRevenue').get(function() {
  if (!this.createdAt) return 0;
  const daysActive = Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
  return daysActive > 0 ? this.revenueGenerated / daysActive : 0;
});

// Indexes for performance
tableSchema.index({ section: 1, status: 1 });
tableSchema.index({ tableNumber: 1 });
tableSchema.index({ currentReservation: 1 });
tableSchema.index({ status: 1, capacity: -1 });
tableSchema.index({ priority: -1, status: 1 });
tableSchema.index({ isActive: 1, status: 1 });
tableSchema.index({ nextMaintenanceDate: 1 });

// Pre-save middleware to update timestamps
tableSchema.pre('save', function(next) {
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
      case 'maintenance':
        this.lastMaintenanceDate = now;
        break;
    }
  }

  // Update next maintenance date based on schedule
  if (this.isModified('maintenanceSchedule') && this.lastMaintenanceDate) {
    const nextDate = new Date(this.lastMaintenanceDate);
    switch (this.maintenanceSchedule) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
    this.nextMaintenanceDate = nextDate;
  }

  next();
});

// Static method to find tables by availability
tableSchema.statics.findAvailable = function(criteria = {}) {
  return this.find({
    status: 'available',
    isActive: true,
    ...criteria
  });
};

// Static method to get table statistics
tableSchema.statics.getStatistics = async function() {
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

// Instance method to calculate table performance
tableSchema.methods.calculatePerformance = function() {
  const now = new Date();
  const daysActive = Math.ceil((now - this.createdAt) / (1000 * 60 * 60 * 24));

  return {
    utilizationRate: this.utilizationRate,
    averageDailyReservations: daysActive > 0 ? this.totalReservations / daysActive : 0,
    averageRevenuePerDay: this.averageDailyRevenue,
    daysSinceMaintenance: this.daysSinceMaintenance,
    performanceScore: this.calculatePerformanceScore()
  };
};

// Instance method to calculate performance score
tableSchema.methods.calculatePerformanceScore = function() {
  let score = 100;

  // Deduct points for maintenance issues
  if (this.daysSinceMaintenance > 30) score -= 20;
  else if (this.daysSinceMaintenance > 7) score -= 10;

  // Deduct points for low utilization
  if (this.utilizationRate < 30) score -= 15;
  else if (this.utilizationRate < 50) score -= 5;

  // Deduct points for being out of service
  if (!this.isActive) score -= 50;

  return Math.max(0, score);
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