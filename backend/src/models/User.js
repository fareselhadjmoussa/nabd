const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Stores user account information
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'اسم المستخدم مطلوب'],
      unique: true,
      trim: true,
      minlength: [3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'],
      maxlength: [30, 'اسم المستخدم لا يمكن أن يتجاوز 30 حرف'],
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'يرجى إدخال بريد إلكتروني صحيح'],
    },
    password: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
      select: false, // Don't include password in queries by default
    },
    avatar: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    bannedReason: {
      type: String,
      default: '',
      maxlength: 500,
    },
    bannedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    // For RTL support
    language: {
      type: String,
      enum: ['ar', 'en'],
      default: 'ar',
    },
    // Google OAuth (optional)
    googleId: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
// Important: do NOT use MongoDB's default language_override field name (`language`).
// This app stores user.language as `ar`/`en`, and MongoDB text indexes do not
// support `ar` as a built-in text-search language. Using a different
// language_override field plus default_language: 'none' prevents registration
// failures such as: "language override unsupported: ar".
userSchema.index(
  { username: 'text', email: 'text' },
  { default_language: 'none', language_override: 'textSearchLanguage' }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    status: this.status,
    lastSeen: this.lastSeen,
    language: this.language,
    role: this.role,
    isBanned: this.isBanned,
    createdAt: this.createdAt,
  };
};

// Virtual for conversations
userSchema.virtual('conversations', {
  ref: 'Conversation',
  localField: '_id',
  foreignField: 'participants',
});

module.exports = mongoose.model('User', userSchema);
