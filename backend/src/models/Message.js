const mongoose = require('mongoose');

/**
 * Message Schema
 * Stores all types of messages (text, image, video, audio)
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file'],
      default: 'text',
    },
    content: {
      type: String,
      maxlength: [5000, 'الرسالة لا يمكن أن تتجاوز 5000 حرف'],
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaThumbnail: {
      type: String,
      default: '',
    },
    mediaDuration: {
      type: Number, // in seconds for audio/video
      default: 0,
    },
    mediaSize: {
      type: Number, // in bytes
      default: 0,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: {
          type: String,
          default: '👍',
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient message fetching
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Check if user has read the message
messageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((r) => r.user.equals(userId));
};

// Mark message as read
messageSchema.methods.markAsRead = async function (userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push({ user: userId, readAt: new Date() });
    await this.save();
  }
  return this;
};

// Static method to get recent messages
messageSchema.statics.getRecentMessages = async function (conversationId, limit = 50) {
  return this.find({ conversationId, deleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'username avatar')
    .populate('replyTo', 'content sender')
    .lean();
};

// Static method to search messages
messageSchema.statics.searchMessages = async function (conversationId, query) {
  return this.find({
    conversationId,
    deleted: false,
    content: { $regex: query, $options: 'i' },
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'username avatar');
};

module.exports = mongoose.model('Message', messageSchema);
