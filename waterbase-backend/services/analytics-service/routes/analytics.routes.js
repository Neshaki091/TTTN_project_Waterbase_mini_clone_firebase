const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// System analytics (Admin only - middleware should be applied here)
router.get('/system', analyticsController.getSystemAnalytics);

// Owner analytics
router.get('/owner/:ownerId', analyticsController.getOwnerAnalytics);

// App analytics
router.get('/app/:appId', analyticsController.getAppAnalytics);

// Direct tracking (if needed)
router.post('/track', analyticsController.trackEvent);

module.exports = router;
