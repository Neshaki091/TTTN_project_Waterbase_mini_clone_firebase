const mongoose = require('mongoose');
const tokenSchema = require('./token.model');
const userSchema = new mongoose.Schema({
    profile: {
        username: { type: String, default: '' },
        email: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    password: { type: String },
    appId: { type: String, require: true },
    role: { type: String, enum: ['user', 'admin', 'guest'], default: 'user' },
    tokens: [tokenSchema],
});

module.exports = mongoose.model('User', userSchema);