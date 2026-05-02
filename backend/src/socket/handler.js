const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/**
 * Socket.io Handler
 * Handles real-time messaging and presence
 */

// userId -> Set<socketId>. A user can open the site from more than one tab/device.
const connectedUsers = new Map();
const userSockets = new Map(); // socketId -> userId

const addSocketForUser = (userId, socketId) => {
  const id = userId.toString();
  if (!connectedUsers.has(id)) connectedUsers.set(id, new Set());
  connectedUsers.get(id).add(socketId);
  userSockets.set(socketId, id);
};

const removeSocketForUser = (socketId) => {
  const userId = userSockets.get(socketId);
  if (!userId) return null;

  const sockets = connectedUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) connectedUsers.delete(userId);
  }

  userSockets.delete(socketId);
  return userId;
};

const getParticipantRooms = (participants = []) =>
  participants.map((participant) => `user:${participant._id?.toString?.() || participant.toString()}`);

const getOnlineUsers = () => Array.from(connectedUsers.keys());

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

const emitMessageToConversationParticipants = async (io, conversation, message, clientId) => {
  const populatedConversation = await getPopulatedConversation(conversation._id);
  const messageForClient = buildMessageForClient(message, clientId);

  const payload = {
    message: messageForClient,
    conversationId: conversation._id.toString(),
    conversation: populatedConversation,
  };

  const participantRooms = getParticipantRooms(populatedConversation.participants);

  // Emit to the opened conversation room and to each participant personal room.
  // This makes messages reach the recipient even when their chat is not currently open.
  io.to([`conversation:${conversation._id}`, ...participantRooms]).emit('newMessage', payload);

  return payload;
};

/**
 * Initialize Socket.io handler
 * @param {Server} io - Socket.io server instance
 */
const socketHandler = (io) => {
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

  io.on('connection', async (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.userId})`);

    addSocketForUser(socket.userId, socket.id);
    socket.join(`user:${socket.userId}`);

    await User.findByIdAndUpdate(socket.userId, { status: 'online', lastSeen: new Date() });
    io.emit('userOnline', { userId: socket.userId });

    socket.on('joinConversation', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) return;

        socket.join(`conversation:${conversationId}`);
        console.log(`👤 ${socket.user.username} joined conversation ${conversationId}`);

        await Message.updateMany(
          {
            conversationId,
            sender: { $ne: socket.userId },
            'readBy.user': { $ne: socket.userId },
          },
          {
            $push: { readBy: { user: socket.userId, readAt: new Date() } },
          }
        );

        conversation.unreadCount.set(socket.userId, 0);
        await conversation.save();

        socket.to(`conversation:${conversationId}`).emit('messagesRead', {
          conversationId,
          userId: socket.userId,
        });
      } catch (error) {
        console.error('JoinConversation error:', error);
      }
    });

    socket.on('leaveConversation', (data = {}) => {
      const { conversationId } = data;
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
      console.log(`👤 ${socket.user.username} left conversation ${conversationId}`);
    });

    socket.on('sendMessage', async (data = {}) => {
      try {
        const {
          conversationId,
          content = '',
          type = 'text',
          mediaUrl = '',
          replyTo,
          clientId,
        } = data;

        if (!conversationId) {
          return socket.emit('error', { message: 'المحادثة غير موجودة' });
        }

        if (type === 'text' && !String(content).trim()) {
          return socket.emit('error', { message: 'لا يمكن إرسال رسالة فارغة', clientId });
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          return socket.emit('error', { message: 'المحادثة غير موجودة', clientId });
        }

        const message = new Message({
          conversationId,
          sender: socket.userId,
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
          if (!participantId.equals(socket.userId)) {
            const key = participantId.toString();
            const currentCount = conversation.unreadCount.get(key) || 0;
            conversation.unreadCount.set(key, currentCount + 1);
          }
        });

        await conversation.save();

        const payload = await emitMessageToConversationParticipants(io, conversation, message, clientId);
        socket.emit('messageSent', payload);

        console.log(`📨 Message sent in ${conversationId}: ${message._id}`);
      } catch (error) {
        console.error('SendMessage error:', error);
        socket.emit('error', { message: 'خطأ في إرسال الرسالة', clientId: data?.clientId });
      }
    });

    socket.on('typingStart', (data = {}) => {
      const { conversationId } = data;
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        conversationId,
        userId: socket.userId,
        username: socket.user.username,
      });
    });

    socket.on('typingStop', (data = {}) => {
      const { conversationId } = data;
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('userStopTyping', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('markRead', async (data = {}) => {
      try {
        const { conversationId, messageId } = data;
        if (!conversationId || !messageId) return;

        const message = await Message.findById(messageId);
        if (message && !message.readBy.some((r) => r.user.equals(socket.userId))) {
          message.readBy.push({ user: socket.userId, readAt: new Date() });
          await message.save();
        }

        io.to(`conversation:${conversationId}`).emit('messageRead', {
          conversationId,
          messageId,
          userId: socket.userId,
        });
      } catch (error) {
        console.error('MarkRead error:', error);
      }
    });

    socket.on('addReaction', async (data = {}) => {
      try {
        const { messageId, emoji } = data;
        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit('error', { message: 'الرسالة غير موجودة' });
        }

        message.reactions = message.reactions.filter((r) => !r.user.equals(socket.userId));
        message.reactions.push({ user: socket.userId, emoji });
        await message.save();
        await message.populate('sender', 'username avatar');

        io.to(`conversation:${message.conversationId}`).emit('reactionAdded', { message });
      } catch (error) {
        console.error('AddReaction error:', error);
        socket.emit('error', { message: 'خطأ في إضافة رد الفعل' });
      }
    });

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

        message.deleted = true;
        message.deletedBy = socket.userId;
        message.content = 'تم حذف هذه الرسالة';
        message.mediaUrl = '';
        await message.save();

        io.to(`conversation:${message.conversationId}`).emit('messageDeleted', {
          messageId,
          conversationId: message.conversationId,
        });
      } catch (error) {
        console.error('DeleteMessage error:', error);
        socket.emit('error', { message: 'خطأ في حذف الرسالة' });
      }
    });

    socket.on('getOnlineUsers', () => {
      socket.emit('onlineUsersList', { users: getOnlineUsers() });
    });

    socket.on('directMessage', async (data = {}) => {
      try {
        const { recipientId, content, clientId } = data;
        if (!recipientId || !String(content || '').trim()) {
          return socket.emit('error', { message: 'بيانات الرسالة غير صالحة', clientId });
        }

        let conversation = await Conversation.findDirectConversation(socket.userId, recipientId);

        if (!conversation) {
          conversation = new Conversation({
            type: 'direct',
            participants: [socket.userId, recipientId],
          });
          await conversation.save();
        }

        const message = new Message({
          conversationId: conversation._id,
          sender: socket.userId,
          type: 'text',
          content: String(content).trim(),
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        conversation.lastMessage = message._id;
        conversation.lastMessageText = String(content).trim().substring(0, 100);
        conversation.lastMessageTime = new Date();
        const currentCount = conversation.unreadCount.get(recipientId) || 0;
        conversation.unreadCount.set(recipientId, currentCount + 1);
        await conversation.save();

        const payload = await emitMessageToConversationParticipants(io, conversation, message, clientId);
        socket.emit('messageSent', payload);
      } catch (error) {
        console.error('DirectMessage error:', error);
        socket.emit('error', { message: 'خطأ في إرسال الرسالة', clientId: data?.clientId });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.username}`);

      const userId = removeSocketForUser(socket.id);
      if (!userId || connectedUsers.has(userId)) return;

      await User.findByIdAndUpdate(userId, {
        status: 'offline',
        lastSeen: new Date(),
      });

      io.emit('userOffline', { userId });
    });
  });
};

const getConnectedUsersCount = () => connectedUsers.size;
const isUserOnline = (userId) => connectedUsers.has(userId?.toString?.() || userId);
const getUserSocketId = (userId) => {
  const sockets = connectedUsers.get(userId?.toString?.() || userId);
  return sockets ? Array.from(sockets)[0] : undefined;
};

module.exports = {
  socketHandler,
  getConnectedUsersCount,
  isUserOnline,
  getUserSocketId,
};
