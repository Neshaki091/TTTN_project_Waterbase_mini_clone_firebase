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
  logoutOwner
} = require('../src/owner.controller');

const express = require('express');
const router = express.Router();
const { ownermiddleware } = require('../util/middleware');
const { checkRole } = require('../util/authorization'); // dùng checkRole thay cho authorizeRole cũ

// Chỉ admin mới xem tất cả owners
router.get('/', ownermiddleware, checkRole(1), getAllOwners);

// Owner hoặc admin xem chính mình hoặc bất kỳ owner nào (admin)
router.get('/:id', ownermiddleware, checkRole(2), getOwnerById);

// Tạo owner mới chỉ admin mới được
router.post('/', createOwner);

// Chỉ admin mới tạo admin
router.post('/administrator', createWaterbaseAdmin);

// Cập nhật owner (admin hoặc chính owner)
router.put('/:id', ownermiddleware, checkRole(2), updateOwner);

// Xóa owner chỉ admin
router.delete('/:id', ownermiddleware, checkRole(1), deleteOwner);

// Thêm/xóa apps chỉ admin hoặc owner chính

router.put('/:id/apps', ownermiddleware, checkRole(2), updateOwnerApps);

// Auth
router.post('/login', loginOwner);
router.post('/logout', ownermiddleware, logoutOwner);

module.exports = router;
