const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

/**
 * Get all conversations for current user
 * GET /api/conversations
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username avatar status lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Format conversations with additional info
    const formattedConversations = conversations.map((conv) => {
      const otherParticipants = conv.participants.filter(
        (p) => !p._id.equals(userId)
      );

      return {
        _id: conv._id,
        type: conv.type,
        name: conv.name || otherParticipants.map((p) => p.username).join(', '),
        avatar: conv.avatar || otherParticipants[0]?.avatar,
        participants: otherParticipants,
        lastMessage: conv.lastMessage
          ? {
              _id: conv.lastMessage._id,
              content: conv.lastMessage.content,
              type: conv.lastMessage.type,
              sender: conv.lastMessage.sender,
              createdAt: conv.lastMessage.createdAt,
            }
          : null,
        unreadCount: conv.unreadCount?.get(userId.toString()) || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    res.json({
      success: true,
      data: { conversations: formattedConversations },
    });
  } catch (error) {
    console.error('GetConversations error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المحادثات',
    });
  }
};

/**
 * Get single conversation
 * GET /api/conversations/:id
 */
const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    }).populate('participants', 'username avatar status lastSeen');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    console.error('GetConversationById error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المحادثة',
    });
  }
};

/**
 * Create new conversation
 * POST /api/conversations
 */
const createConversation = async (req, res) => {
  try {
    const { participantId, type = 'direct', name } = req.body;
    const userId = req.userId;

    // For direct messages, check if conversation already exists
    if (type === 'direct' && participantId) {
      const existingConversation = await Conversation.findDirectConversation(
        userId,
        participantId
      );

      if (existingConversation) {
        return res.json({
          success: true,
          message: 'تم العثور على المحادثة',
          data: { conversation: existingConversation },
        });
      }
    }

    // Create new conversation
    const conversation = new Conversation({
      type,
      name: type === 'group' ? name : undefined,
      participants: type === 'direct' ? [userId, participantId] : [userId],
      admin: type === 'group' ? userId : undefined,
    });

    await conversation.save();

    // Populate participants
    await conversation.populate('participants', 'username avatar status lastSeen');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المحادثة',
      data: { conversation },
    });
  } catch (error) {
    console.error('CreateConversation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المحادثة',
    });
  }
};

/**
 * Add participant to group
 * PUT /api/conversations/:id/participants
 */
const addParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const { participantId } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إضافة مشاركين لمحادثة خاصة',
      });
    }

    if (!conversation.admin.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'فقط المسؤول يمكنه إضافة مشاركين',
      });
    }

    if (conversation.participants.includes(participantId)) {
      return res.status(400).json({
        success: false,
        message: 'المستخدم مشارك بالفعل',
      });
    }

    conversation.participants.push(participantId);
    await conversation.save();
    await conversation.populate('participants', 'username avatar status lastSeen');

    res.json({
      success: true,
      message: 'تم إضافة المشارك',
      data: { conversation },
    });
  } catch (error) {
    console.error('AddParticipant error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة المشارك',
    });
  }
};

/**
 * Remove participant from group
 * DELETE /api/conversations/:id/participants/:participantId
 */
const removeParticipant = async (req, res) => {
  try {
    const { id, participantId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إزالة مشاركين من محادثة خاصة',
      });
    }

    if (!conversation.admin.equals(userId) && !participantId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
      });
    }

    conversation.participants = conversation.participants.filter(
      (p) => !p.equals(participantId)
    );
    await conversation.save();
    await conversation.populate('participants', 'username avatar status lastSeen');

    res.json({
      success: true,
      message: 'تم إزالة المشارك',
      data: { conversation },
    });
  } catch (error) {
    console.error('RemoveParticipant error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إزالة المشارك',
    });
  }
};

/**
 * Mark conversation as read
 * PUT /api/conversations/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    // Reset unread count
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();

    res.json({
      success: true,
      message: 'تم تحديث المحادثة كمقروءة',
    });
  } catch (error) {
    console.error('MarkAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المحادثة',
    });
  }
};

/**
 * Delete conversation
 * DELETE /api/conversations/:id
 */
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    // Delete all messages in conversation
    await Message.deleteMany({ conversationId: id });

    // Delete conversation
    await conversation.deleteOne();

    res.json({
      success: true,
      message: 'تم حذف المحادثة',
    });
  } catch (error) {
    console.error('DeleteConversation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المحادثة',
    });
  }
};

module.exports = {
  getConversations,
  getConversationById,
  createConversation,
  addParticipant,
  removeParticipant,
  markAsRead,
  deleteConversation,
};
