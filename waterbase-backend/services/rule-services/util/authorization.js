const Rule = require('../models/rule.model');

// middleware kiểm tra action theo appId và role
exports.checkAction = (action) => {
    return async (req, res, next) => {
        const { appId } = req.body; // hoặc req.params.appId
        const role = req.user.role;
        if (!appId) return res.status(400).json({ message: 'Missing appId' });

        const rule = await Rule.findOne({ appId, role });
        if (!rule) return res.status(403).json({ message: 'No rule found for this role' });
        if (!rule.actions.includes(action)) return res.status(403).json({ message: 'Action forbidden' });

        next();
    };
};
