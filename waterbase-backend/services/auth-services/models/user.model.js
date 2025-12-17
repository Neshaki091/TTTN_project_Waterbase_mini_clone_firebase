const mongoose = require('mongoose');
const tokenSchema = require('./token.model');

const userSchema = new mongoose.Schema({
    profile: {
        username: { type: String, default: '' },
        email: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    password: { type: String, required: true },
    appId: { type: String, required: true, index: true },
    role: { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
    tokens: [tokenSchema],
});

// CRITICAL: Unique constraint - same email can exist in different apps
userSchema.index({ "profile.email": 1, appId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);