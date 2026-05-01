const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config');
const { generateTokens, setTokenCookies, clearTokenCookies } = require('../middleware/auth');

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: errors.array().map((e) => e.msg),
      });
    }

    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم مستخدم بالفعل',
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id.toString());

    // Set cookies
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
      const duplicatedField = Object.keys(error.keyValue || {})[0] || 'field';
      const messages = {
        email: 'البريد الإلكتروني مستخدم بالفعل',
        username: 'اسم المستخدم مستخدم بالفعل',
        googleId: 'يوجد index قديم في MongoDB باسم googleId_1، شغّل: npm run fix:indexes ثم جرّب مرة أخرى',
      };

      return res.status(400).json({
        success: false,
        message: messages[duplicatedField] || `القيمة مستخدمة بالفعل: ${duplicatedField}`,
        duplicatedField,
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
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    // Update user status
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id);

    // Set cookies
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
    // Update user status
    if (req.user) {
      req.user.status = 'offline';
      req.user.lastSeen = new Date();
      await req.user.save();
    }

    // Clear cookies
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
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { username, avatar, language } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    // Update fields
    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    if (language) user.language = language;

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي',
      data: {
        user: user.getPublicProfile(),
      },
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);
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
        errors: errors.array().map((e) => e.msg),
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

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new tokens
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
