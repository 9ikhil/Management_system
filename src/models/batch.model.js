const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    required: [true, 'Day is required'],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'],
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'],
  },
});

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
      unique: true,
      minlength: [2, 'Batch name must be at least 2 characters'],
      maxlength: [100, 'Batch name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    schedule: {
      type: [scheduleSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one schedule entry is required',
      },
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual for student count
batchSchema.virtual('studentCount').get(function () {
  return this.students.length;
});

batchSchema.set('toJSON', { virtuals: true });
batchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Batch', batchSchema);
