const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.post(
  '/',
  authenticate,
  [
    body('reportedUserId').isMongoId().withMessage('المستخدم غير صالح'),
    body('reason').optional().isIn(['spam', 'harassment', 'inappropriate', 'impersonation', 'other']),
    body('details').optional().isString().trim().isLength({ max: 1000 }),
  ],
  reportController.createReport
);

router.get('/me', authenticate, reportController.getMyReports);

module.exports = router;
