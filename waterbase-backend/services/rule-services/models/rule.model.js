
// models/rule.model.js
const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
    appId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true },
    role: { type: String, required: true },
    actions: [{ type: String }], // ['createUser','updateUser','readUser','deleteUser']
    conditions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    updatedBy: { type: String }, // <--- THÊM: Người cuối cùng cập nhật
}, {
    timestamps: true // <--- THAY ĐỔI: Sử dụng timestamps tự động (createdAt, updatedAt)
});

// Unique constraint: one rule per appId + role combination
ruleSchema.index({ appId: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Rule', ruleSchema);
