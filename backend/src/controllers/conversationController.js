const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const formatConversationForUser = (conversation, userId) => {
  const conv = typeof conversation.toObject === 'function'
    ? conversation.toObject({ virtuals: true })
    : conversation;

  const currentUserId = userId.toString();
  const participants = conv.participants || [];
  const otherParticipants = participants.filter((participant) => (
    (participant._id?.toString?.() || participant.toString()) !== currentUserId
  ));

  const name = conv.type === 'direct'
    ? (otherParticipants[0]?.username || conv.name || 'محادثة')
    : (conv.name || 'مجموعة');

  const avatar = conv.type === 'direct'
    ? (otherParticipants[0]?.avatar || '')
    : (conv.avatar || '');

  return {
    _id: conv._id,
    type: conv.type,
    name,
    avatar,
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
    unreadCount: conv.unreadCount?.get?.(currentUserId) || conv.unreadCount?.[currentUserId] || 0,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt || conv.lastMessageTime || conv.createdAt,
  };
};

const populateConversation = (query) => query
  .populate('participants', 'username avatar status lastSeen email')
  .populate({
    path: 'lastMessage',
    populate: { path: 'sender', select: 'username avatar' },
  });

/**
 * Get all conversations for current user
 * GET /api/conversations
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    const conversations = await populateConversation(Conversation.find({
      participants: userId,
    }))
      .sort({ updatedAt: -1 });

    const formattedConversations = conversations.map((conv) => formatConversationForUser(conv, userId));

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

    const conversation = await populateConversation(Conversation.findOne({
      _id: id,
      participants: userId,
    }));

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: { conversation: formatConversationForUser(conversation, userId) },
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

    if (type === 'direct' && !participantId) {
      return res.status(400).json({
        success: false,
        message: 'يرجى اختيار مستخدم لبدء المحادثة',
      });
    }

    if (type === 'direct' && participantId === userId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك بدء محادثة مع نفسك',
      });
    }

    if (type === 'direct' && participantId) {
      let existingConversation = await Conversation.findDirectConversation(userId, participantId);

      if (existingConversation) {
        existingConversation = await populateConversation(Conversation.findById(existingConversation._id));
        return res.json({
          success: true,
          message: 'تم العثور على المحادثة',
          data: { conversation: formatConversationForUser(existingConversation, userId) },
        });
      }
    }

    const conversation = new Conversation({
      type,
      name: type === 'group' ? name : undefined,
      participants: type === 'direct' ? [userId, participantId] : [userId],
      admin: type === 'group' ? userId : undefined,
    });

    await conversation.save();

    const populatedConversation = await populateConversation(Conversation.findById(conversation._id));

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المحادثة',
      data: { conversation: formatConversationForUser(populatedConversation, userId) },
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

    if (conversation.participants.some((p) => p.equals(participantId))) {
      return res.status(400).json({
        success: false,
        message: 'المستخدم مشارك بالفعل',
      });
    }

    conversation.participants.push(participantId);
    await conversation.save();

    const populatedConversation = await populateConversation(Conversation.findById(conversation._id));

    res.json({
      success: true,
      message: 'تم إضافة المشارك',
      data: { conversation: formatConversationForUser(populatedConversation, userId) },
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

    if (!conversation.admin.equals(userId) && participantId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح',
      });
    }

    conversation.participants = conversation.participants.filter((p) => !p.equals(participantId));
    await conversation.save();

    const populatedConversation = await populateConversation(Conversation.findById(conversation._id));

    res.json({
      success: true,
      message: 'تم إزالة المشارك',
      data: { conversation: formatConversationForUser(populatedConversation, userId) },
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

    await Message.deleteMany({ conversationId: id });
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
