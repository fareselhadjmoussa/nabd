const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/**
 * Socket.io Handler
 * Handles real-time messaging and presence
 */

const connectedUsers = new Map(); // Map<userId, socketId>
const userSockets = new Map(); // Map<socketId, userId>

/**
 * Initialize Socket.io handler
 * @param {Server} io - Socket.io server instance
 */
const socketHandler = (io) => {
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

    // Store socket mapping
    connectedUsers.set(socket.userId, socket.id);
    userSockets.set(socket.id, socket.userId);

    // Update user status to online
    await User.findByIdAndUpdate(socket.userId, { status: 'online' });

    // Join user's personal room for targeted messages
    socket.join(`user:${socket.userId}`);

    // Broadcast online status to all connected users
    io.emit('userOnline', { userId: socket.userId });

    // Handle joining a conversation room
    socket.on('joinConversation', async (data) => {
      try {
        const { conversationId } = data;

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
          conversation.unreadCount.set(socket.userId, 0);
          await conversation.save();

          // Notify others
          socket.to(`conversation:${conversationId}`).emit('messagesRead', {
            conversationId,
            userId: socket.userId,
          });
        }
      } catch (error) {
        console.error('JoinConversation error:', error);
      }
    });

    // Handle leaving a conversation room
    socket.on('leaveConversation', (data) => {
      const { conversationId } = data;
      socket.leave(`conversation:${conversationId}`);
      console.log(`👤 ${socket.user.username} left conversation ${conversationId}`);
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, content, type = 'text', mediaUrl, replyTo } = data;

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
          content: type === 'text' ? content : '',
          mediaUrl: mediaUrl || '',
          replyTo,
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastMessageText = type === 'text' ? content.substring(0, 100) : `[${type}]`;
        conversation.lastMessageTime = new Date();

        // Update unread count for other participants
        conversation.participants.forEach((p) => {
          if (!p.equals(socket.userId)) {
            const currentCount = conversation.unreadCount.get(p.toString()) || 0;
            conversation.unreadCount.set(p.toString(), currentCount + 1);
          }
        });

        await conversation.save();

        // Broadcast to conversation members
        io.to(`conversation:${conversationId}`).emit('newMessage', {
          message,
        });

        // Confirm to sender
        socket.emit('messageSent', {
          message,
          conversationId,
        });

        console.log(`📨 Message sent in ${conversationId}: ${message._id}`);
      } catch (error) {
        console.error('SendMessage error:', error);
        socket.emit('error', { message: 'خطأ في إرسال الرسالة' });
      }
    });

    // Handle typing start
    socket.on('typingStart', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        conversationId,
        userId: socket.userId,
        username: socket.user.username,
      });
    });

    // Handle typing stop
    socket.on('typingStop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('userStopTyping', {
        conversationId,
        userId: socket.userId,
      });
    });

    // Handle marking message as read
    socket.on('markRead', async (data) => {
      try {
        const { conversationId, messageId } = data;

        const message = await Message.findById(messageId);
        if (message && !message.readBy.some((r) => r.user.equals(socket.userId))) {
          message.readBy.push({ user: socket.userId, readAt: new Date() });
          await message.save();
        }

        // Broadcast read status
        io.to(`conversation:${conversationId}`).emit('messageRead', {
          conversationId,
          messageId,
          userId: socket.userId,
        });
      } catch (error) {
        console.error('MarkRead error:', error);
      }
    });

    // Handle adding reaction
    socket.on('addReaction', async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit('error', { message: 'الرسالة غير موجودة' });
        }

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
          (r) => !r.user.equals(socket.userId)
        );

        // Add new reaction
        message.reactions.push({ user: socket.userId, emoji });
        await message.save();
        await message.populate('sender', 'username avatar');

        // Broadcast to conversation
        io.to(`conversation:${message.conversationId}`).emit('reactionAdded', {
          message,
        });
      } catch (error) {
        console.error('AddReaction error:', error);
        socket.emit('error', { message: 'خطأ في إضافة رد الفعل' });
      }
    });

    // Handle message deletion
    socket.on('deleteMessage', async (data) => {
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

        // Broadcast to conversation
        io.to(`conversation:${message.conversationId}`).emit('messageDeleted', {
          messageId,
          conversationId: message.conversationId,
        });
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
    socket.on('directMessage', async (data) => {
      try {
        const { recipientId, content } = data;

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
          await conversation.populate('participants', 'username avatar status');
        }

        // Create message
        const message = new Message({
          conversationId: conversation._id,
          sender: socket.userId,
          type: 'text',
          content,
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastMessageText = content.substring(0, 100);
        conversation.lastMessageTime = new Date();

        const currentCount = conversation.unreadCount.get(recipientId) || 0;
        conversation.unreadCount.set(recipientId, currentCount + 1);
        await conversation.save();

        // Emit to sender
        socket.emit('newMessage', {
          message,
          conversationId: conversation._id,
        });

        // Emit to recipient if online
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(`user:${recipientId}`).emit('newMessage', {
            message,
            conversationId: conversation._id,
          });
        }
      } catch (error) {
        console.error('DirectMessage error:', error);
        socket.emit('error', { message: 'خطأ في إرسال الرسالة' });
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.username}`);

      // Remove from maps
      connectedUsers.delete(socket.userId);
      userSockets.delete(socket.id);

      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        lastSeen: new Date(),
      });

      // Broadcast offline status
      io.emit('userOffline', { userId: socket.userId });
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
const isUserOnline = (userId) => connectedUsers.has(userId);

/**
 * Get user's socket ID
 */
const getUserSocketId = (userId) => connectedUsers.get(userId);

module.exports = {
  socketHandler,
  getConnectedUsersCount,
  isUserOnline,
  getUserSocketId,
};
