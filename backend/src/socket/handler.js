const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/**
 * Socket.io Handler
 * Handles real-time messaging and presence
 */

// Map<userId, Set<socketId>> so one user can be online from several tabs/devices.
const connectedUsers = new Map();
const userSockets = new Map(); // Map<socketId, userId>
let ioInstance = null;

const toIdString = (value) => {
  if (!value) return '';
  if (value._id) return value._id.toString();
  return value.toString();
};

const getParticipantIds = (conversation) => {
  if (!conversation?.participants) return [];
  return conversation.participants
    .map((participant) => toIdString(participant))
    .filter(Boolean);
};

const addConnectedSocket = (userId, socketId) => {
  const id = userId.toString();
  const sockets = connectedUsers.get(id) || new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId);
  connectedUsers.set(id, sockets);
  userSockets.set(socketId, id);
  return wasOffline;
};

const removeConnectedSocket = (socketId) => {
  const userId = userSockets.get(socketId);
  if (!userId) return { userId: null, isOffline: false };

  const sockets = connectedUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      connectedUsers.delete(userId);
      userSockets.delete(socketId);
      return { userId, isOffline: true };
    }
  }

  userSockets.delete(socketId);
  return { userId, isOffline: false };
};

const getConversationWithParticipants = async (conversationId) => {
  return Conversation.findById(conversationId)
    .populate('participants', 'username avatar status')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username avatar' },
    });
};

const buildMessagePayload = async (conversationId, message) => {
  const populatedConversation = await getConversationWithParticipants(conversationId);

  if (message?.populate && !message.sender?.username) {
    await message.populate('sender', 'username avatar');
  }

  return {
    message,
    conversationId: toIdString(conversationId),
    conversation: populatedConversation,
  };
};

const emitToConversationParticipants = (conversation, eventName, payload, ioOverride) => {
  const io = ioOverride || ioInstance;
  if (!io || !conversation) return false;

  const conversationId = toIdString(conversation._id || conversation);
  const participantRooms = getParticipantIds(conversation).map((id) => `user:${id}`);
  const rooms = Array.from(new Set([`conversation:${conversationId}`, ...participantRooms]));

  io.to(rooms).emit(eventName, payload);
  return true;
};

const emitMessageToParticipants = async (conversation, message, eventName = 'newMessage', ioOverride) => {
  const populatedConversation = conversation?.participants?.[0]?.username
    ? conversation
    : await getConversationWithParticipants(conversation._id || conversation);

  const payload = await buildMessagePayload(populatedConversation._id, message);
  emitToConversationParticipants(populatedConversation, eventName, payload, ioOverride);
  return payload;
};

/**
 * Initialize Socket.io handler
 * @param {Server} io - Socket.io server instance
 */
const socketHandler = (io) => {
  ioInstance = io;

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        next(new Error('Token expired'));
      } else {
        next(new Error('Invalid token'));
      }
    }
  });

  // Connection handler
  io.on('connection', async (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.userId})`);

    const wasOffline = addConnectedSocket(socket.userId, socket.id);

    // Join user's personal room for targeted messages/conversation updates.
    socket.join(`user:${socket.userId}`);

    if (wasOffline) {
      await User.findByIdAndUpdate(socket.userId, { status: 'online' });
      io.emit('userOnline', { userId: socket.userId });
    }

    // Handle joining a conversation room
    socket.on('joinConversation', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (conversation) {
          socket.join(`conversation:${conversationId}`);
          console.log(`👤 ${socket.user.username} joined conversation ${conversationId}`);

          // Mark messages as read
          await Message.updateMany(
            {
              conversationId,
              sender: { $ne: socket.userId },
              'readBy.user': { $ne: socket.userId },
            },
            {
              $push: {
                readBy: { user: socket.userId, readAt: new Date() },
              },
            }
          );

          // Reset unread count
          if (conversation.unreadCount?.set) {
            conversation.unreadCount.set(socket.userId, 0);
            await conversation.save();
          }

          // Notify participants that messages were read
          emitToConversationParticipants(conversation, 'messagesRead', {
            conversationId: toIdString(conversationId),
            userId: socket.userId,
          }, io);
        }
      } catch (error) {
        console.error('JoinConversation error:', error);
      }
    });

    // Handle leaving a conversation room
    socket.on('leaveConversation', (data = {}) => {
      const { conversationId } = data;
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
      console.log(`👤 ${socket.user.username} left conversation ${conversationId}`);
    });

    // Handle sending a message
    socket.on('sendMessage', async (data = {}) => {
      try {
        const { conversationId, content = '', type = 'text', mediaUrl = '', replyTo } = data;

        if (!conversationId) {
          return socket.emit('error', { message: 'المحادثة غير موجودة' });
        }

        if (type === 'text' && !content.trim()) {
          return socket.emit('error', { message: 'لا يمكن إرسال رسالة فارغة' });
        }

        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return socket.emit('error', { message: 'المحادثة غير موجودة' });
        }

        // Create message
        const message = new Message({
          conversationId,
          sender: socket.userId,
          type,
          content: type === 'text' ? content.trim() : '',
          mediaUrl: mediaUrl || '',
          replyTo,
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastMessageText = type === 'text' ? content.trim().substring(0, 100) : `[${type}]`;
        conversation.lastMessageTime = new Date();

        // Update unread count for other participants
        if (!conversation.unreadCount) conversation.unreadCount = new Map();
        conversation.participants.forEach((participant) => {
          const participantId = toIdString(participant);
          if (participantId && participantId !== socket.userId) {
            const currentCount = conversation.unreadCount?.get(participantId) || 0;
            conversation.unreadCount.set(participantId, currentCount + 1);
          }
        });

        await conversation.save();

        const payload = await emitMessageToParticipants(conversation, message, 'newMessage', io);

        // Confirm to sender. The frontend deduplicates, so this will not create duplicates.
        socket.emit('messageSent', payload);

        console.log(`📨 Message sent in ${conversationId}: ${message._id}`);
      } catch (error) {
        console.error('SendMessage error:', error);
        socket.emit('error', { message: 'خطأ في إرسال الرسالة' });
      }
    });

    // Handle typing start
    socket.on('typingStart', (data = {}) => {
      const { conversationId } = data;
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        conversationId,
        userId: socket.userId,
        username: socket.user.username,
      });
    });

    // Handle typing stop
    socket.on('typingStop', (data = {}) => {
      const { conversationId } = data;
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('userStopTyping', {
        conversationId,
        userId: socket.userId,
      });
    });

    // Handle marking message as read
    socket.on('markRead', async (data = {}) => {
      try {
        const { conversationId, messageId } = data;
        if (!conversationId || !messageId) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) return;

        const message = await Message.findOne({ _id: messageId, conversationId });
        if (message && !message.readBy.some((r) => r.user.equals(socket.userId))) {
          message.readBy.push({ user: socket.userId, readAt: new Date() });
          await message.save();
        }

        // Broadcast read status
        emitToConversationParticipants(conversation, 'messageRead', {
          conversationId,
          messageId,
          userId: socket.userId,
        }, io);
      } catch (error) {
        console.error('MarkRead error:', error);
      }
    });

    // Handle adding reaction
    socket.on('addReaction', async (data = {}) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit('error', { message: 'الرسالة غير موجودة' });
        }

        const conversation = await Conversation.findOne({
          _id: message.conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return socket.emit('error', { message: 'غير مصرح' });
        }

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
          (r) => !r.user.equals(socket.userId)
        );

        // Add new reaction
        message.reactions.push({ user: socket.userId, emoji });
        await message.save();
        await message.populate('sender', 'username avatar');

        // Broadcast to participants
        emitToConversationParticipants(conversation, 'reactionAdded', {
          message,
          conversationId: toIdString(message.conversationId),
        }, io);
      } catch (error) {
        console.error('AddReaction error:', error);
        socket.emit('error', { message: 'خطأ في إضافة رد الفعل' });
      }
    });

    // Handle message deletion
    socket.on('deleteMessage', async (data = {}) => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit('error', { message: 'الرسالة غير موجودة' });
        }

        if (!message.sender.equals(socket.userId)) {
          return socket.emit('error', { message: 'غير مصرح' });
        }

        const conversation = await Conversation.findOne({
          _id: message.conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return socket.emit('error', { message: 'غير مصرح' });
        }

        message.deleted = true;
        message.deletedBy = socket.userId;
        message.content = 'تم حذف هذه الرسالة';
        message.mediaUrl = '';
        await message.save();

        // Broadcast to participants
        emitToConversationParticipants(conversation, 'messageDeleted', {
          messageId,
          conversationId: toIdString(message.conversationId),
        }, io);
      } catch (error) {
        console.error('DeleteMessage error:', error);
        socket.emit('error', { message: 'خطأ في حذف الرسالة' });
      }
    });

    // Handle getting online users
    socket.on('getOnlineUsers', () => {
      const onlineUsers = Array.from(connectedUsers.keys());
      socket.emit('onlineUsersList', { users: onlineUsers });
    });

    // Handle direct message to a user
    socket.on('directMessage', async (data = {}) => {
      try {
        const { recipientId, content = '' } = data;

        if (!recipientId || !content.trim()) {
          return socket.emit('error', { message: 'لا يمكن إرسال رسالة فارغة' });
        }

        // Find or create conversation
        let conversation = await Conversation.findDirectConversation(
          socket.userId,
          recipientId
        );

        if (!conversation) {
          conversation = new Conversation({
            type: 'direct',
            participants: [socket.userId, recipientId],
          });
          await conversation.save();
        }

        // Create message
        const message = new Message({
          conversationId: conversation._id,
          sender: socket.userId,
          type: 'text',
          content: content.trim(),
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastMessageText = content.trim().substring(0, 100);
        conversation.lastMessageTime = new Date();

        if (!conversation.unreadCount) conversation.unreadCount = new Map();
        const currentCount = conversation.unreadCount?.get(recipientId) || 0;
        conversation.unreadCount.set(recipientId, currentCount + 1);
        await conversation.save();

        const payload = await emitMessageToParticipants(conversation, message, 'newMessage', io);
        socket.emit('messageSent', payload);
      } catch (error) {
        console.error('DirectMessage error:', error);
        socket.emit('error', { message: 'خطأ في إرسال الرسالة' });
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.username}`);

      const { userId, isOffline } = removeConnectedSocket(socket.id);

      if (userId && isOffline) {
        // Update user status to offline only after all sockets/tabs are closed.
        await User.findByIdAndUpdate(userId, {
          status: 'offline',
          lastSeen: new Date(),
        });

        io.emit('userOffline', { userId });
      }
    });
  });
};

/**
 * Get connected users count
 */
const getConnectedUsersCount = () => connectedUsers.size;

/**
 * Check if user is online
 */
const isUserOnline = (userId) => {
  const sockets = connectedUsers.get(userId?.toString());
  return Boolean(sockets && sockets.size > 0);
};

/**
 * Get user's first socket ID
 */
const getUserSocketId = (userId) => {
  const sockets = connectedUsers.get(userId?.toString());
  return sockets ? Array.from(sockets)[0] : undefined;
};

/**
 * Get user's all socket IDs
 */
const getUserSocketIds = (userId) => {
  const sockets = connectedUsers.get(userId?.toString());
  return sockets ? Array.from(sockets) : [];
};

const getIO = () => ioInstance;

module.exports = {
  socketHandler,
  getConnectedUsersCount,
  isUserOnline,
  getUserSocketId,
  getUserSocketIds,
  getIO,
  emitToConversationParticipants,
  emitMessageToParticipants,
};
