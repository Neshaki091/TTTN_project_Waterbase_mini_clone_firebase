const mongoose = require('mongoose');

const DynamicDocumentSchema = new mongoose.Schema(
  {
    appId: {
      type: String,
      required: true,
      index: true,
    },
    collection: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

DynamicDocumentSchema.index({ appId: 1, collection: 1, documentId: 1 }, { unique: true });

module.exports = mongoose.model('DynamicDocument', DynamicDocumentSchema);

