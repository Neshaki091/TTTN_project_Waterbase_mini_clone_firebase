const mongoose = require('mongoose');
const tokenSchema = require('./token.model');

const OwnerSchema = new mongoose.Schema({
    profile: {
        username: { type: String, default: '' },
        email: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    password: { type: String, required: true },
    apps: [{ appId: String, apiKey: String, name: String, createdAt: { type: Date, default: Date.now } }],
    createdAt: { type: Date, default: Date.now },
    role: {
        type: String,
        enum: ['admin', 'owner'],
        default: 'owner',
    },
    tokens: [tokenSchema],
});
module.exports = mongoose.model('Owner', OwnerSchema);