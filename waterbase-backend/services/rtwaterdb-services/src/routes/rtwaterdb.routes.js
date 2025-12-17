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

    // Routes with Rule checking (new naming: documentId)
    router.get('/collections', checkAction('read'), controller.getCollections);
    router.get('/:collectionName', checkAction('read'), controller.getCollection);
    router.post('/:collectionName', checkQuota, checkAction('create'), controller.createDocument);
    router.get('/:collectionName/:documentId', checkAction('read'), controller.getDocument);
    router.put('/:collectionName/:documentId', checkQuota, checkAction('update'), controller.updateDocument);
    router.delete('/:collectionName/:documentId', checkAction('delete'), controller.deleteDocument);

    return router;
};
