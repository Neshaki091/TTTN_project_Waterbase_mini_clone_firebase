const express = require('express');
const router = express.Router();
const ruleController = require('../src/rule.controller');
const { authMiddleware } = require('../util/auth.middleware');
const { checkAction } = require('../util/authorization');

// WaterbaseAdmin và owner có token hợp lệ
console.log('Controller Function Exists:', typeof ruleController.createRule === 'function');
if (typeof ruleController.createRule !== 'function') {
    console.error('CRITICAL ERROR: ruleController.createRule is missing or not a function!');
}
router.get('/', authMiddleware(['waterbaseAdmin']), ruleController.getAllRules);
router.get('/:appId/:role', authMiddleware(['waterbaseAdmin', 'owner']), ruleController.getRule);
router.post('/', authMiddleware(['waterbaseAdmin', 'owner']), ruleController.createRule);
router.put('/', authMiddleware(['waterbaseAdmin', 'owner']), ruleController.updateRule);
router.delete('/:appId/:role', authMiddleware(['waterbaseAdmin', 'owner']), ruleController.deleteRule);
router.post('/check-action', authMiddleware(['waterbaseAdmin', 'owner', 'user']), ruleController.checkActionRule);
module.exports = router;
