const mongoose = require('mongoose');

/**
 * Conversation Schema
 * Handles both direct messages and group chats
 */
const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    name: {
      type: String,
      trim: true,
      maxlength: [50, 'اسم المحادثة لا يمكن أن يتجاوز 50 حرف'],
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageText: {
      type: String,
      maxlength: 100,
    },
    lastMessageTime: {
      type: Date,
    },
    avatar: {
      type: String,
      default: '',
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageTime: -1 });

// Check if user is participant
conversationSchema.methods.isParticipant = function (userId) {
  return this.participants.some((p) => p.equals(userId));
};

// Get other participant in direct chat
conversationSchema.methods.getOtherParticipant = function (currentUserId) {
  if (this.type === 'direct') {
    return this.participants.find((p) => !p.equals(currentUserId));
  }
  return null;
};

// Static method to find or create direct conversation
conversationSchema.statics.findDirectConversation = async function (userId1, userId2) {
  const conversation = await this.findOne({
    type: 'direct',
    participants: { $all: [userId1, userId2], $size: 2 },
  });
  return conversation;
};

// Virtual for messages
conversationSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversationId',
});

module.exports = mongoose.model('Conversation', conversationSchema);
