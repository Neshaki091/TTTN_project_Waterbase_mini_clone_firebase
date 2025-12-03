const express = require('express');
const router = express.Router();
const { authenticateUser, verifyApp } = require('../../shared/middlewares/auth.middleware');

module.exports = (io) => {
    const controller = require('../controllers/rtwaterdb.controller')(io);

    // Apply middlewares
    router.use(verifyApp);
    router.use(authenticateUser);

    // Routes
    router.get('/collections', controller.getCollections);
    router.get('/:collectionName', controller.getCollection);
    router.post('/:collectionName', controller.createDocument);
    router.get('/:collectionName/:docId', controller.getDocument);
    router.put('/:collectionName/:docId', controller.updateDocument);
    router.delete('/:collectionName/:docId', controller.deleteDocument);

    return router;
};
