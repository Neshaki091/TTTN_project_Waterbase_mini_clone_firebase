const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        index: true
    },
    appId: {
        type: String,
        index: true
    },
    ownerId: {
        type: String,
        index: true
    },
    userId: String,
    data: mongoose.Schema.Types.Mixed,
    metadata: {
        ip: String,
        userAgent: String,
        endpoint: String,
        method: String,
        statusCode: Number,
        responseTime: Number
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    processed: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

// TTL Index - Auto delete events older than 30 days
eventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound indexes for common queries
eventSchema.index({ ownerId: 1, timestamp: -1 });
eventSchema.index({ appId: 1, timestamp: -1 });
eventSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model('Event', eventSchema);
