const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserRoles,
  toggleUserStatus,
  getAuditLogs
} = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

router.get('/admin/audit-logs', authenticate, authorize('admin'), getAuditLogs);
router.get('/', authenticate, authorize('admin'), getAllUsers);
router.put('/:id/roles', authenticate, authorize('admin'), updateUserRoles);
router.patch('/:id/status', authenticate, authorize('admin'), toggleUserStatus);

router.get('/:id', authenticate, getUserById);

module.exports = router;
