const ruleService = require('./services/rule.service');
const ruleMapper = require('./mappers/rule.mapper');

// Lấy tất cả rule
exports.getAllRules = async (req, res) => {
    try {
        const rules = await ruleService.getAllRules(req.user);
        res.status(200).json(ruleMapper.toDTOList(rules));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching rules', error: err.message });
    }
};

// Lấy rule theo appId và role
exports.getRule = async (req, res) => {
    const { appId, role } = req.params;
    try {
        const rule = await ruleService.getRule(appId, role, req.user);
        res.status(200).json(ruleMapper.toDTO(rule));
    } catch (err) {
        if (err.message.includes('Forbidden')) return res.status(403).json({ message: err.message });
        if (err.message === 'Rule not found') return res.status(404).json({ message: err.message });
        res.status(500).json({ message: 'Error fetching rule', error: err.message });
    }
};

// Tạo rule mới 
exports.createRule = async (req, res) => {
    try {
        const rule = await ruleService.createRule(req.body, req.user);
        res.status(201).json(ruleMapper.toDTO(rule));
    } catch (err) {
        if (err.message.includes('Forbidden')) return res.status(403).json({ message: err.message });
        if (err.message.includes('already exists')) return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Error creating rule', error: err.message });
    }
};

// Cập nhật rule
exports.updateRule = async (req, res) => {
    const { appId, role, actions } = req.body;
    if (!appId || !role || !actions) return res.status(400).json({ message: 'Missing fields' });

    try {
        const rule = await ruleService.updateRule(appId, role, actions, req.user);
        res.status(200).json(ruleMapper.toDTO(rule));
    } catch (err) {
        if (err.message.includes('Forbidden')) return res.status(403).json({ message: err.message });
        if (err.message === 'Rule not found') return res.status(404).json({ message: err.message });
        res.status(500).json({ message: 'Error updating rule', error: err.message });
    }
};

// Xóa rule
exports.deleteRule = async (req, res) => {
    const { appId, role } = req.params;
    try {
        await ruleService.deleteRule(appId, role, req.user);
        res.status(200).json({ message: 'Rule deleted' });
    } catch (err) {
        if (err.message.includes('Forbidden')) return res.status(403).json({ message: err.message });
        if (err.message === 'Rule not found') return res.status(404).json({ message: err.message });
        res.status(500).json({ message: 'Error deleting rule', error: err.message });
    }
};

// Kiểm tra quyền truy cập (Internal/External check)
exports.checkActionRule = async (req, res) => {
    const { appId, role, action } = req.body;
    if (!appId || !role || !action) return res.status(400).json({ message: 'Missing appId, role, or action' });

    try {
        await ruleService.checkAction(appId, role, action);
        return res.status(204).send();
    } catch (err) {
        console.log(`❌ Rule Check Failed: ${err.message}`);
        if (err.message.includes('forbidden') || err.message.includes('No rule found')) {
            return res.status(403).json({ message: err.message });
        }
        res.status(500).json({ message: 'Error checking rule', error: err.message });
    }
};