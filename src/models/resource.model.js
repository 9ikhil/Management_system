const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: ['pdf', 'link', 'video', 'document'],
    },
    url: {
      type: String,
      trim: true,
    },
    filePath: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch is required for a resource'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Validate that either url or filePath is present
resourceSchema.pre('validate', function (next) {
  if (this.type === 'link' && !this.url) {
    this.invalidate('url', 'URL is required for link type resources');
  }
  if (this.type === 'pdf' && !this.filePath) {
    this.invalidate('filePath', 'File is required for PDF type resources');
  }
  next();
});

module.exports = mongoose.model('Resource', resourceSchema);
