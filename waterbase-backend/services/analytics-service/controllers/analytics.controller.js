const analyticsService = require('../services/analytics.service');

// Get system-wide analytics (Admin only)
exports.getSystemAnalytics = async (req, res) => {
    try {
        const stats = await analyticsService.getSystemAnalytics();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error getting system analytics:', error);
        res.status(500).json({ message: 'Error retrieving system analytics', error: error.message });
    }
};

// Get owner-specific analytics
exports.getOwnerAnalytics = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const stats = await analyticsService.getOwnerAnalytics(ownerId);
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error getting owner analytics:', error);
        res.status(500).json({ message: 'Error retrieving owner analytics', error: error.message });
    }
};

// Get app-specific analytics
exports.getAppAnalytics = async (req, res) => {
    try {
        const { appId } = req.params;
        const stats = await analyticsService.getAppAnalytics(appId);
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error getting app analytics:', error);
        res.status(500).json({ message: 'Error retrieving app analytics', error: error.message });
    }
};

// Track analytics event
exports.trackEvent = async (req, res) => {
    try {
        const event = await analyticsService.processEvent(req.body);
        res.status(201).json({ message: 'Event tracked successfully', eventId: event._id });
    } catch (error) {
        console.error('Error tracking event:', error);
        res.status(500).json({ message: 'Error tracking event', error: error.message });
    }
};
