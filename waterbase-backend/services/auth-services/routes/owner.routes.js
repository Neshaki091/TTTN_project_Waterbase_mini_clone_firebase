// routes/owner.routes.js
const {
  getAllOwners,
  getOwnerById,
  createOwner,
  createWaterbaseAdmin,
  updateOwner,
  deleteOwner,
  updateOwnerApps,
  loginOwner,
  logoutOwner,
  getSystemStats,
  getOwnerUsage,
  lockOwner,
  getDashboardStats,
  getAllAppsWithStats
} = require('../src/owner.controller');

const express = require('express');
const router = express.Router();
const { ownermiddleware } = require('../util/middleware');
const { checkRole } = require('../util/authorization');

// Chỉ admin mới xem tất cả owners
router.get('/', ownermiddleware, checkRole(1), getAllOwners);

// Tạo owner mới chỉ admin mới được
router.post('/', createOwner);

// Chỉ admin mới tạo admin
router.post('/administrator', createWaterbaseAdmin);

// Auth
router.post('/login', loginOwner);
router.post('/logout', ownermiddleware, logoutOwner);

// 🔄 Refresh Token
const { refreshOwnerAccessToken } = require('../util/newRefreshToken');
router.post('/refresh-token', refreshOwnerAccessToken);

// 📊 Admin Stats - MUST come before /:id routes
router.get('/admin/stats', ownermiddleware, checkRole(1), getSystemStats);

// 📊 Dashboard Stats - MUST come before /:id routes
router.get('/admin/dashboard-stats', ownermiddleware, checkRole(1), getDashboardStats);

// 📊 All Apps with Stats - MUST come before /:id routes
router.get('/admin/apps-stats', ownermiddleware, checkRole(1), getAllAppsWithStats);

// 📊 Owner Usage Stats - MUST come before /:id routes
router.get('/:id/usage', ownermiddleware, getOwnerUsage);

// 🔒 Lock/Unlock owner account - MUST come before /:id routes
router.put('/:id/lock', ownermiddleware, checkRole(1), lockOwner);

// Owner hoặc admin xem chính mình hoặc bất kỳ owner nào (admin)
router.get('/:id', ownermiddleware, checkRole(2), getOwnerById);

// Cập nhật owner (admin hoặc chính owner)
router.put('/:id', ownermiddleware, checkRole(2), updateOwner);

// Xóa owner chỉ admin
router.delete('/:id', ownermiddleware, checkRole(1), deleteOwner);

// Thêm/xóa apps chỉ admin hoặc owner chính
router.put('/:id/apps', ownermiddleware, checkRole(2), updateOwnerApps);

module.exports = router;
