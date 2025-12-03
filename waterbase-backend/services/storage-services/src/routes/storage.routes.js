const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const storageController = require('../controllers/storage.controller');
const { authenticateUser, verifyApp } = require('../../shared/middlewares/auth.middleware');

// Multer setup for temp storage
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Middleware
router.use(verifyApp);
router.use(authenticateUser);

// Routes
router.post('/upload', upload.single('file'), storageController.uploadFile);
router.get('/files', storageController.listFiles);
router.get('/stats', storageController.getStats);
router.delete('/files/:filename', storageController.deleteFile);

// Public access route (can be protected if needed, but usually for serving images)
// Note: This route might need to bypass auth middleware if public access is desired.
// For now, we keep it here but Nginx might route /api/v1/storage/:appId/:filename directly if configured,
// or we handle it here.
router.get('/:appId/:filename', storageController.getFile);

module.exports = router;
