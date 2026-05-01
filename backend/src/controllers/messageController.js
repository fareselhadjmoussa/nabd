const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/**
 * Get messages for a conversation
 * GET /api/messages/:conversationId
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.userId;

    // Verify user is part of conversation
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

    const messages = await Message.find({
      conversationId,
      deleted: false,
    })
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({
      conversationId,
      deleted: false,
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
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
    const { conversationId, content, type = 'text', mediaUrl, replyTo } = req.body;
    const userId = req.userId;

    // Verify user is part of conversation
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

    // Create message
    const message = new Message({
      conversationId,
      sender: userId,
      type,
      content: type === 'text' ? content : '',
      mediaUrl: mediaUrl || '',
      replyTo,
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageText = type === 'text' ? content.substring(0, 100) : `[${type}]`;
    conversation.lastMessageTime = new Date();

    // Update unread count for other participants
    conversation.participants.forEach((p) => {
      if (!p.equals(userId)) {
        const currentCount = conversation.unreadCount.get(p.toString()) || 0;
        conversation.unreadCount.set(p.toString(), currentCount + 1);
      }
    });

    await conversation.save();

    // Populate message
    await message.populate('sender', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'تم إرسال الرسالة',
      data: { message },
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

    // Add user to readBy if not already there
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

    // Only sender can delete
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

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (r) => !r.user.equals(userId)
    );

    // Add new reaction
    message.reactions.push({ user: userId, emoji });
    await message.save();

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
