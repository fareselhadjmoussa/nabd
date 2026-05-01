const express = require('express');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

/**
 * @route   POST /api/upload/image
 * @desc    Upload image
 * @access  Private
 */
router.post('/image', authenticate, uploadLimiter, uploadController.uploadImage);

/**
 * @route   POST /api/upload/video
 * @desc    Upload video
 * @access  Private
 */
router.post('/video', authenticate, uploadLimiter, uploadController.uploadVideo);

/**
 * @route   POST /api/upload/audio
 * @desc    Upload audio
 * @access  Private
 */
router.post('/audio', authenticate, uploadLimiter, uploadController.uploadAudio);

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload avatar
 * @access  Private
 */
router.post('/avatar', authenticate, uploadLimiter, uploadController.uploadAvatar);

module.exports = router;
