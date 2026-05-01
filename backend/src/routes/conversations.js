const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');

const router = express.Router();

/**
 * @route   GET /api/conversations
 * @desc    Get all conversations
 * @access  Private
 */
router.get('/', authenticate, conversationController.getConversations);

/**
 * @route   GET /api/conversations/:id
 * @desc    Get single conversation
 * @access  Private
 */
router.get('/:id', authenticate, conversationController.getConversationById);

/**
 * @route   POST /api/conversations
 * @desc    Create new conversation
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
    body('participantId').optional().isMongoId(),
    body('type').optional().isIn(['direct', 'group']),
    body('name').optional().isString().trim(),
  ],
  conversationController.createConversation
);

/**
 * @route   PUT /api/conversations/:id/participants
 * @desc    Add participant to group
 * @access  Private
 */
router.put(
  '/:id/participants',
  authenticate,
  [body('participantId').isMongoId()],
  conversationController.addParticipant
);

/**
 * @route   DELETE /api/conversations/:id/participants/:participantId
 * @desc    Remove participant from group
 * @access  Private
 */
router.delete(
  '/:id/participants/:participantId',
  authenticate,
  conversationController.removeParticipant
);

/**
 * @route   PUT /api/conversations/:id/read
 * @desc    Mark conversation as read
 * @access  Private
 */
router.put('/:id/read', authenticate, conversationController.markAsRead);

/**
 * @route   DELETE /api/conversations/:id
 * @desc    Delete conversation
 * @access  Private
 */
router.delete('/:id', authenticate, conversationController.deleteConversation);

module.exports = router;
