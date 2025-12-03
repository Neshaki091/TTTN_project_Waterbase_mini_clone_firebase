const express = require('express');
const router = express.Router();
const Rule = require('../models/rule.model');

// Internal endpoint to create rules (no auth required - for service-to-service communication)
router.post('/rules', async (req, res) => {
    const { appId, ownerId, role, actions } = req.body;

    if (!appId || !ownerId || !role || !actions) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check if rule already exists
        const existing = await Rule.findOne({ appId, role });
        if (existing) {
            return res.status(200).json({ message: 'Rule already exists', rule: existing });
        }

        const rule = new Rule({
            appId,
            ownerId,
            role,
            actions
        });

        await rule.save();
        res.status(201).json({ message: 'Rule created', rule });
    } catch (err) {
        res.status(500).json({ message: 'Error creating rule', error: err.message });
    }
});

module.exports = router;
