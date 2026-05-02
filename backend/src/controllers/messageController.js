const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { isBlockedBetween } = require('../utils/blocking');

const buildMessageForClient = (message, clientId) => {
  const messageObject = typeof message.toObject === 'function'
    ? message.toObject({ virtuals: true })
    : { ...message };

  if (clientId) messageObject.clientId = clientId;
  return messageObject;
};

const getPopulatedConversation = async (conversationId) => Conversation.findById(conversationId)
  .populate('participants', 'username avatar status lastSeen')
  .populate({
    path: 'lastMessage',
    populate: { path: 'sender', select: 'username avatar' },
  });

const emitMessageToParticipants = async (req, conversation, message, clientId) => {
  const io = req.app.get('io');
  if (!io) return null;

  const populatedConversation = await getPopulatedConversation(conversation._id);
  if (!populatedConversation) return null;

  const payload = {
    message: buildMessageForClient(message, clientId),
    conversationId: conversation._id.toString(),
    conversation: populatedConversation,
  };

  const participantRooms = populatedConversation.participants.map((participant) => (
    `user:${participant._id.toString()}`
  ));

  io.to([`conversation:${conversation._id}`, ...participantRooms]).emit('newMessage', payload);
  return payload;
};

/**
 * Get messages for a conversation
 * GET /api/messages/:conversationId
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const messages = await Message.find({
      conversationId,
      deleted: false,
    })
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean();

    const total = await Message.countDocuments({
      conversationId,
      deleted: false,
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    console.error('GetMessages error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الرسائل',
    });
  }
};

/**
 * Send a message
 * POST /api/messages
 */
const sendMessage = async (req, res) => {
  try {
    const {
      conversationId,
      content = '',
      type = 'text',
      mediaUrl = '',
      replyTo,
      clientId,
    } = req.body;
    const userId = req.userId;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'المحادثة مطلوبة',
      });
    }

    if (type === 'text' && !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إرسال رسالة فارغة',
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    if (conversation.type === 'direct' && conversation.participants.length === 2) {
      const otherUserId = conversation.participants.find((participantId) => !participantId.equals(userId));
      if (otherUserId && await isBlockedBetween(userId, otherUserId)) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكن إرسال رسالة بسبب الحظر',
        });
      }
    }

    const message = new Message({
      conversationId,
      sender: userId,
      type,
      content: type === 'text' ? String(content).trim() : '',
      mediaUrl: mediaUrl || '',
      replyTo,
    });

    await message.save();
    await message.populate('sender', 'username avatar');

    conversation.lastMessage = message._id;
    conversation.lastMessageText = type === 'text'
      ? String(content).trim().substring(0, 100)
      : `[${type}]`;
    conversation.lastMessageTime = new Date();

    conversation.participants.forEach((participantId) => {
      if (!participantId.equals(userId)) {
        const key = participantId.toString();
        const currentCount = conversation.unreadCount.get(key) || 0;
        conversation.unreadCount.set(key, currentCount + 1);
      }
    });

    await conversation.save();

    const socketPayload = await emitMessageToParticipants(req, conversation, message, clientId);
    const populatedConversation = socketPayload?.conversation || await getPopulatedConversation(conversation._id);
    const messageForClient = socketPayload?.message || buildMessageForClient(message, clientId);

    res.status(201).json({
      success: true,
      message: 'تم إرسال الرسالة',
      data: {
        message: messageForClient,
        conversation: populatedConversation,
      },
    });
  } catch (error) {
    console.error('SendMessage error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الرسالة',
    });
  }
};

/**
 * Mark message as read
 * PUT /api/messages/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'الرسالة غير موجودة',
      });
    }

    if (!message.readBy.some((r) => r.user.equals(userId))) {
      message.readBy.push({ user: userId, readAt: new Date() });
      await message.save();
    }

    res.json({
      success: true,
      data: { message },
    });
  } catch (error) {
    console.error('MarkAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الرسالة',
    });
  }
};

/**
 * Delete message (soft delete)
 * DELETE /api/messages/:id
 */
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'الرسالة غير موجودة',
      });
    }

    if (!message.sender.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بحذف هذه الرسالة',
      });
    }

    message.deleted = true;
    message.deletedBy = userId;
    message.content = 'تم حذف هذه الرسالة';
    message.mediaUrl = '';
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversationId}`).emit('messageDeleted', {
        messageId: message._id,
        conversationId: message.conversationId,
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الرسالة',
    });
  } catch (error) {
    console.error('DeleteMessage error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الرسالة',
    });
  }
};

/**
 * Add reaction to message
 * PUT /api/messages/:id/reaction
 */
const addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'الرسالة غير موجودة',
      });
    }

    message.reactions = message.reactions.filter((r) => !r.user.equals(userId));
    message.reactions.push({ user: userId, emoji });
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversationId}`).emit('reactionAdded', { message });
    }

    res.json({
      success: true,
      data: { message },
    });
  } catch (error) {
    console.error('AddReaction error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة رد الفعل',
    });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  addReaction,
};
