const express = require('express');
const router = express.Router();
const { authenticateUser, verifyApp } = require('../../shared/middlewares/auth.middleware');
const { checkAction } = require('../../shared/middlewares/rule.middleware');
const { checkQuota } = require('../middlewares/quota.middleware');

module.exports = (io) => {
    const controller = require('../controllers/rtwaterdb.controller')(io);

    // Apply middlewares
    router.use(verifyApp);
    router.use(authenticateUser);

    // Stats route
    router.get('/stats', controller.getStats);

    // Routes with Rule checking
    router.get('/collections', checkAction('read'), controller.getCollections);
    router.get('/:collectionName', checkAction('read'), controller.getCollection);
    router.post('/:collectionName', checkQuota, checkAction('create'), controller.createDocument);
    router.get('/:collectionName/:docId', checkAction('read'), controller.getDocument);
    router.put('/:collectionName/:docId', checkQuota, checkAction('update'), controller.updateDocument);
    router.delete('/:collectionName/:docId', checkAction('delete'), controller.deleteDocument);

    return router;
};
