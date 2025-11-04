// routes/user.routes.js
const { 
  getAllUsersInApp, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  changePassword, 
  loginUser, 
  logoutUser 
} = require('../src/user.controller');

const express = require('express');
const router = express.Router();
const { usermiddleware, ownermiddleware } = require('../util/middleware'); 
const { checkRole, checkAppAccess } = require('../util/authorization'); 
router.get('/', ownermiddleware, checkRole(2), getAllUsersInApp); // **ĐÃ SỬA**

router.get('/:id', ownermiddleware, checkAppAccess, checkRole(2), getUserById); // **ĐÃ SỬA** (Ưu tiên Owner/Admin quản lý)


router.post('', createUser);

router.put('/:id', ownermiddleware, checkAppAccess, checkRole(2), updateUser); // **ĐÃ SỬA**


router.delete('/:id', ownermiddleware, checkAppAccess, checkRole(2), deleteUser); // **ĐÃ SỬA**


router.post('/:id/change-password', usermiddleware, checkRole(3), changePassword); // GIỮ NGUYÊN

router.post('/login', loginUser); 
router.post('/logout', usermiddleware, logoutUser); 

module.exports = router;