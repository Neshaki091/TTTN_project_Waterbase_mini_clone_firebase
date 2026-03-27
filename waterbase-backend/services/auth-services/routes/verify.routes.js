const express = require('express');
const router = express.Router();
const verifyController = require('../src/controller/verify.controller');

// GET /verify - Verify token from Authorization header
router.get('/', verifyController.verifyTokenFromHeader);

// POST /verify-token - Verify token from body (for backward compatibility)
router.post('/verify-token', verifyController.verifyTokenFromBody);

module.exports = router;
