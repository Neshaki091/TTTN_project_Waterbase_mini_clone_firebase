// models/rule.model.js
const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
    appId: { type: String, required: true },
    ownerId: { type: String, required: true },
    role: { type: String, enum: ['owner', 'admin', 'user'], required: true },
    actions: [{ type: String }], // ['createUser','updateUser','readUser','deleteUser']
    updatedBy: { type: String }, // <--- THÊM: Người cuối cùng cập nhật
}, {
    timestamps: true // <--- THAY ĐỔI: Sử dụng timestamps tự động (createdAt, updatedAt)
});

// THÊM: Index kết hợp để đảm bảo chỉ có một Rule cho mỗi appId/role
ruleSchema.index({ appId: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Rule', ruleSchema);