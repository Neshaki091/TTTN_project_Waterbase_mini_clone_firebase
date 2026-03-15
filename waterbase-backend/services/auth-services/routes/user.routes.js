// routes/user.routes.js
const {
    getAllUsersInApp,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    changePassword,
    loginUser,
    logoutUser,
    getAppStats
} = require('../src/controller/user.controller');

const express = require('express');
const router = express.Router();
const { usermiddleware, ownermiddleware } = require('../util/middleware');
const { checkRole, checkAppAccess } = require('../util/authorization');

router.get('/', ownermiddleware, checkRole(2), getAllUsersInApp);

router.get('/:id', ownermiddleware, checkAppAccess, checkRole(2), getUserById);

router.post('', createUser);

router.put('/:id', ownermiddleware, checkAppAccess, checkRole(2), updateUser);

router.delete('/:id', ownermiddleware, checkAppAccess, checkRole(2), deleteUser);

// 🔒 Toggle user active status (lock/unlock)
router.put('/:id/status', ownermiddleware, checkAppAccess, checkRole(2), toggleUserStatus);

router.post('/:id/change-password', usermiddleware, checkRole(3), changePassword);

router.post('/login', loginUser);
router.post('/logout', usermiddleware, logoutUser);

// 🔄 Refresh Token
const { refreshUserAccessToken } = require('../util/newRefreshToken');
router.post('/refresh-token', refreshUserAccessToken);

// 📊 Stats
router.get('/stats', checkAppAccess, getAppStats);

module.exports = router;