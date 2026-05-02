const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.patch(
  '/users/:id',
  [
    body('username').optional().isString().trim().isLength({ min: 3, max: 30 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('avatar').optional().isString().trim().isLength({ max: 5000 }),
    body('role').optional().isIn(['user', 'admin']),
    body('status').optional().isIn(['online', 'offline', 'away']),
    body('language').optional().isIn(['ar', 'en']),
    body('isBanned').optional().isBoolean(),
    body('bannedReason').optional().isString().trim().isLength({ max: 500 }),
  ],
  adminController.updateUser
);
router.delete('/users/:id', adminController.deleteUser);
router.get('/reports', adminController.getReports);
router.patch(
  '/reports/:id',
  [
    body('status').isIn(['pending', 'reviewed', 'resolved', 'dismissed']),
    body('adminNote').optional().isString().trim().isLength({ max: 1000 }),
  ],
  adminController.updateReport
);
router.delete('/messages/:id', adminController.deleteMessage);

module.exports = router;
