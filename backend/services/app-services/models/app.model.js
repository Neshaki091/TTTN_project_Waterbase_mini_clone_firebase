const mongoose = require('mongoose');
const appSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    version: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    ownerId: { type: String, required: true },
    APIkey: { type: String, required: true, unique: true },
});
module.exports = mongoose.model('App', appSchema);