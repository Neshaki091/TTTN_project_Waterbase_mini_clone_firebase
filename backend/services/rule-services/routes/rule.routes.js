const express = require('express');
const router = express.Router();
const ruleController = require('../src/rule.controller');
const { authMiddleware } = require('../util/auth.middleware');
const { checkAction } = require('../util/authorization');

// WaterbaseAdmin và owner có token hợp lệ
router.get('/', authMiddleware(['waterbaseAdmin']), ruleController.getAllRules);
router.get('/:appId/:role', authMiddleware(['waterbaseAdmin','owner']), ruleController.getRule);
router.post('/', authMiddleware(['waterbaseAdmin','owner']), ruleController.createRule);
router.put('/', authMiddleware(['waterbaseAdmin','owner']), ruleController.updateRule);
router.delete('/:appId/:role', authMiddleware(['waterbaseAdmin','owner']), ruleController.deleteRule);

module.exports = router;
