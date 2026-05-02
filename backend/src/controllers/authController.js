const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config');
const { generateTokens, setTokenCookies, clearTokenCookies } = require('../middleware/auth');

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getValidationMessages = (errors) => errors.array().map((e) => e.msg);

const getDuplicateMessage = (error) => {
  const duplicatedField = Object.keys(error.keyValue || {})[0] || 'field';
  const messages = {
    email: 'البريد الإلكتروني مستخدم بالفعل',
    username: 'اسم المستخدم مستخدم بالفعل',
    googleId: 'يوجد index قديم في MongoDB باسم googleId_1، شغّل: npm run fix:indexes ثم جرّب مرة أخرى',
  };

  return {
    duplicatedField,
    message: messages[duplicatedField] || `القيمة مستخدمة بالفعل: ${duplicatedField}`,
  };
};

const emitProfileUpdate = (req, user) => {
  const io = req.app.get('io');
  if (!io || !user) return;

  io.emit('userProfileUpdated', {
    user: user.getPublicProfile(),
  });
};

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: getValidationMessages(errors),
      });
    }

    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل',
        duplicatedField: 'email',
      });
    }

    // Case-insensitive username check so Fares/fares cannot both be used.
    const existingUsername = await User.findOne({
      username: new RegExp(`^${escapeRegExp(username)}$`, 'i'),
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم مستخدم بالفعل',
        duplicatedField: 'username',
      });
    }

    const user = new User({ username, email, password });
    await user.save();

    const tokens = generateTokens(user._id.toString());
    setTokenCookies(res, tokens);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: user.getPublicProfile(),
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Register error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
      keyValue: error.keyValue,
      errors: error.errors,
      stack: error.stack,
    });

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    if (error.code === 11000) {
      const duplicate = getDuplicateMessage(error);
      return res.status(400).json({
        success: false,
        message: duplicate.message,
        duplicatedField: duplicate.duplicatedField,
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الحساب',
      error: config.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: getValidationMessages(errors),
      });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني غير مسجل',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور غير صحيحة',
      });
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const tokens = generateTokens(user._id);
    setTokenCookies(res, tokens);

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: user.getPublicProfile(),
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الدخول',
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    if (req.user) {
      req.user.status = 'offline';
      req.user.lastSeen = new Date();
      await req.user.save();
      emitProfileUpdate(req, req.user);
    }

    clearTokenCookies(res);

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الخروج',
    });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب البيانات',
    });
  }
};

/**
 * Update profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: getValidationMessages(errors),
      });
    }

    const username = req.body.username !== undefined ? String(req.body.username).trim() : undefined;
    const avatar = req.body.avatar;
    const language = req.body.language;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    if (username !== undefined && username !== user.username) {
      const usernameExists = await User.findOne({
        _id: { $ne: user._id },
        username: new RegExp(`^${escapeRegExp(username)}$`, 'i'),
      });

      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'اسم المستخدم مستخدم بالفعل',
          duplicatedField: 'username',
        });
      }

      user.username = username;
    }

    if (avatar !== undefined) user.avatar = avatar;
    if (language !== undefined) user.language = language;

    await user.save();

    emitProfileUpdate(req, user);

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي',
      data: {
        user: user.getPublicProfile(),
      },
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    if (error.code === 11000) {
      const duplicate = getDuplicateMessage(error);
      return res.status(400).json({
        success: false,
        message: duplicate.message,
        duplicatedField: duplicate.duplicatedField,
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'انتهت الجلسة - يرجى تسجيل الدخول مرة أخرى',
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'رمز غير صالح',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    const tokens = generateTokens(user._id);
    setTokenCookies(res, tokens);

    return res.json({
      success: true,
      message: 'تم تجديد الجلسة',
      data: {
        user: user.getPublicProfile(),
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'انتهت الجلسة - يرجى تسجيل الدخول مرة أخرى',
    });
  }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: getValidationMessages(errors),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    user.password = newPassword;
    await user.save();

    const tokens = generateTokens(user._id);
    setTokenCookies(res, tokens);

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور',
    });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  updateProfile,
  changePassword,
};
