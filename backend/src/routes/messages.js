const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

const router = express.Router();

/**
 * @route   GET /api/messages/:conversationId
 * @desc    Get messages for conversation
 * @access  Private
 */
router.get('/:conversationId', authenticate, messageController.getMessages);

/**
 * @route   POST /api/messages
 * @desc    Send message
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
    body('conversationId').isMongoId(),
    body('content').optional().isString(),
    body('type').optional().isIn(['text', 'image', 'video', 'audio', 'file']),
    body('mediaUrl').optional().isString(),
    body('replyTo').optional().isMongoId(),
  ],
  messageController.sendMessage
);

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put('/:id/read', authenticate, messageController.markAsRead);

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message
 * @access  Private
 */
router.delete('/:id', authenticate, messageController.deleteMessage);

/**
 * @route   PUT /api/messages/:id/reaction
 * @desc    Add reaction to message
 * @access  Private
 */
router.put(
  '/:id/reaction',
  authenticate,
  [body('emoji').isString()],
  messageController.addReaction
);

module.exports = router;
