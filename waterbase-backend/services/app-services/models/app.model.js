
const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
    appId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    ownerId: { type: String, required: true, index: true },
    apiKey: { type: String, required: true, unique: true },
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'deleted'],
        default: 'active'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('App', appSchema);
