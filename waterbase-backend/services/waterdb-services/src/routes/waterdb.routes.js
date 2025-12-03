const express = require('express');
const router = express.Router();

const controller = require('../controllers/waterdb.controller');
const { authenticateUser } = require('../../shared/middlewares/auth.middleware');
const { checkAction } = require('../../shared/middlewares/rule.middleware');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// All routes require app context + optional auth
router.use(authenticateUser);

// /stats
router.get('/stats', asyncHandler(controller.getStats));
router.get('/admin/stats', asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'adminWaterbase') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
}), asyncHandler(controller.getSystemStats));

router.post('/stats/aggregate', asyncHandler(async (req, res, next) => {
    // Allow admin or owner (who has valid token)
    if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'adminWaterbase')) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
}), asyncHandler(controller.getAggregateStats));

router.post('/stats/per-app', asyncHandler(async (req, res, next) => {
    // Allow admin or owner (who has valid token)
    if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'adminWaterbase')) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
}), asyncHandler(controller.getStatsPerApp));

// /collections
router.get('/collections', checkAction('read'), asyncHandler(controller.getCollections));

// /:collectionName
router.get('/:collectionName', checkAction('read'), asyncHandler(controller.getCollection));
router.post('/:collectionName', checkAction('create'), asyncHandler(controller.createDocument));

// /:collectionName/:docId
router.get('/:collectionName/:documentId', checkAction('read'), asyncHandler(controller.getDocument));
router.put('/:collectionName/:documentId', checkAction('update'), asyncHandler(controller.updateDocument));
router.delete('/:collectionName/:documentId', checkAction('delete'), asyncHandler(controller.deleteDocument));

module.exports = router;

