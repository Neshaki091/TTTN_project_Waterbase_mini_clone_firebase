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

// Public access route - MUST be before auth middleware
// This allows public access to uploaded images
router.get('/:appId/:filename', storageController.getFile);

// Middleware for protected routes
router.use(verifyApp);
router.use(authenticateUser);

// Protected routes
router.post('/upload', upload.single('file'), storageController.uploadFile);
router.get('/files', storageController.listFiles);
router.get('/stats', storageController.getStats);
router.delete('/files/:filename', storageController.deleteFile);

module.exports = router;
