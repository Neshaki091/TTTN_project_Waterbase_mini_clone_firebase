const express = require('express');
const router = express.Router();
const appController = require('../src/app.controller');
const { authenticateOwner } = require('../middlewares/auth.middleware');

// All routes require owner authentication
router.use(authenticateOwner);

// GET all apps
router.get('/', appController.getAllApps);

// Admin-only routes for managing deleted apps (must be before /:id routes)
// GET all deleted apps (Admin only)
router.get('/deleted', appController.getDeletedApps);

// GET app by ID
router.get('/:id', appController.getAppById);

// CREATE app
router.post('/', appController.createApp);

// UPDATE app
router.put('/:id', appController.updateApp);

// DELETE app (soft delete)
router.delete('/:id', appController.deleteApp);

// Permanently delete an app (Admin only)
router.delete('/:id/permanent', appController.permanentlyDeleteApp);


// GET API key
router.get('/:id/api-key', appController.getAppAPIKey);

// Regenerate API key
router.post('/:id/regenerate-key', appController.regenerateAPIKey);

// Download service.json (keeps current API key)
router.get('/:id/service-json', appController.downloadServiceJson);

// Regenerate service.json with new API key
router.post('/:id/service-json/regenerate', appController.regenerateServiceJson);

module.exports = router;




