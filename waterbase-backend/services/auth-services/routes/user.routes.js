// routes/user.routes.js
const {
    getAllUsersInApp,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    loginUser,
    logoutUser,
    getAppStats
} = require('../src/user.controller');

const express = require('express');
const router = express.Router();
const { usermiddleware, ownermiddleware } = require('../util/middleware');
const { checkRole, checkAppAccess } = require('../util/authorization');

router.get('/', ownermiddleware, checkRole(2), getAllUsersInApp);

router.get('/:id', ownermiddleware, checkAppAccess, checkRole(2), getUserById);

router.post('', createUser);

router.put('/:id', ownermiddleware, checkAppAccess, checkRole(2), updateUser);

router.delete('/:id', ownermiddleware, checkAppAccess, checkRole(2), deleteUser);

router.post('/:id/change-password', usermiddleware, checkRole(3), changePassword);

router.post('/login', loginUser);
router.post('/logout', usermiddleware, logoutUser);

// 📊 Stats
router.get('/stats', checkAppAccess, getAppStats);

module.exports = router;