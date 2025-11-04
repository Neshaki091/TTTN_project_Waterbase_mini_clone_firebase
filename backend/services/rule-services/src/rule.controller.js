// src/rule.controller.js
const Rule = require('../models/rule.model');

// --- HÀM HELPER: Lấy ID người sở hữu Rule ---
function getRuleOwnerId(req) {
    const userRole = req.user.role;

    if (userRole === 'owner') {
        // Owner chỉ có thể tạo rule cho chính mình
        return req.user.id;
    }

    // THAY ĐỔI: Gộp kiểm tra vai trò cấp cao nhất
    if (userRole === 'admin' || userRole === 'waterbaseAdmin') {
        // Admin có thể chỉ định ownerId
        return req.body.ownerId || 'SYSTEM_ADMIN';
    }

    return null;
}


// Lấy tất cả rule (admin)
exports.getAllRules = async (req, res) => {
    try {
        // Nếu là owner, chỉ thấy rule của mình (req.user.role đã được xác thực trong authMiddleware)
        if (req.user.role === 'owner') {
            const rules = await Rule.find({ ownerId: req.user.id });
            return res.status(200).json(rules);
        }

        // Admin/WaterbaseAdmin thấy tất cả
        const rules = await Rule.find();
        res.status(200).json(rules);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching rules', error: err });
    }
};

// Lấy rule theo appId và role
exports.getRule = async (req, res) => {
    const { appId, role } = req.params;
    try {
        const rule = await Rule.findOne({ appId, role });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });

        // KIỂM TRA QUYỀN TRUY CẬP (Nếu là Owner, chỉ được xem Rule của mình)
        if (req.user.role === 'owner' && rule.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: Cannot view rule of another owner' });
        }

        res.status(200).json(rule);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching rule', error: err });
    }
};

// Tạo rule mới 
exports.createRule = async (req, res) => {
    const { appId, role, actions } = req.body;

    const ruleOwnerId = getRuleOwnerId(req); // Lấy ownerId theo logic phân quyền

    if (!appId || !role || !actions || !ruleOwnerId) return res.status(400).json({ message: 'Missing required fields or invalid role for creation' });

    try {
        const existing = await Rule.findOne({ appId, role });
        if (existing) return res.status(400).json({ message: 'Rule already exists for this app and role' });

        // KIỂM TRA QUYỀN TRUY CẬP APP (Nếu Auth Service cung cấp req.user.apps)
        // Lưu ý: Logic này bị bỏ qua nếu Auth Service không truyền req.user.apps
        /*
        if (req.user.role === 'owner' && req.user.apps && !req.user.apps.map(a => a.appId).includes(appId)) {
            return res.status(403).json({ message: 'Forbidden: Owner does not manage this app' });
        }
        */

        const rule = new Rule({
            appId,
            role,
            actions,
            ownerId: ruleOwnerId,
            updatedBy: req.user.id // Lưu ID người tạo
        });
        await rule.save();
        res.status(201).json(rule);
    } catch (err) {
        // Lỗi 11000 (Duplicate Index) sẽ bị bắt ở đây
        res.status(500).json({ message: 'Error creating rule', error: err });
    }
};

// Cập nhật rule
exports.updateRule = async (req, res) => {
    const { appId, role, actions } = req.body;

    if (!appId || !role || !actions) return res.status(400).json({ message: 'Missing fields' });

    try {
        const rule = await Rule.findOne({ appId, role });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });

        // owner chỉ update rule app của mình
        if (req.user.role === 'owner' && rule.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Cannot update rule of another owner' });
        }

        rule.actions = actions;
        rule.updatedBy = req.user.id;
        // updatedAt sẽ tự động được cập nhật nhờ timestamps: true

        await rule.save();
        res.status(200).json(rule);
    } catch (err) {
        res.status(500).json({ message: 'Error updating rule', error: err });
    }
};

// Xóa rule
exports.deleteRule = async (req, res) => {
    const { appId, role } = req.params;

    try {
        const rule = await Rule.findOne({ appId, role });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });

        if (req.user.role === 'owner' && rule.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Cannot delete rule of another owner' });
        }

        await rule.deleteOne();
        res.status(200).json({ message: 'Rule deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting rule', error: err });
    }
};