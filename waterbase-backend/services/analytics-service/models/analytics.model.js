const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    ownerId: {
        type: String,
        required: true,
        index: true
    },
    appId: {
        type: String,
        index: true
    },
    period: {
        type: String,
        enum: ['hourly', 'daily', 'monthly'],
        required: true
    },
    periodStart: {
        type: Date,
        required: true,
        index: true
    },
    periodEnd: {
        type: Date,
        required: true
    },
    metrics: {
        // API Metrics
        totalApiCalls: { type: Number, default: 0 },
        apiCallsByEndpoint: { type: Map, of: Number },

        // Database Metrics
        documentsCreated: { type: Number, default: 0 },
        documentsUpdated: { type: Number, default: 0 },
        documentsDeleted: { type: Number, default: 0 },
        documentsRead: { type: Number, default: 0 },
        collectionsCreated: { type: Number, default: 0 },

        // Storage Metrics
        filesUploaded: { type: Number, default: 0 },
        filesDownloaded: { type: Number, default: 0 },
        filesDeleted: { type: Number, default: 0 },
        storageUsed: { type: Number, default: 0 }, // bytes

        // Auth Metrics
        userLogins: { type: Number, default: 0 },
        userSignups: { type: Number, default: 0 },
        userLogouts: { type: Number, default: 0 },
        activeUsers: { type: Number, default: 0 },

        // Error Metrics
        totalErrors: { type: Number, default: 0 },
        errorsByType: { type: Map, of: Number },

        // Performance Metrics
        avgResponseTime: { type: Number, default: 0 },
        maxResponseTime: { type: Number, default: 0 },
        minResponseTime: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
analyticsSchema.index({ ownerId: 1, period: 1, periodStart: -1 });
analyticsSchema.index({ appId: 1, period: 1, periodStart: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
