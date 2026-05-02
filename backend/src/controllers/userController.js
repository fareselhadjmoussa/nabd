const User = require('../models/User');
const { getBlockedUserIdsFor } = require('../utils/blocking');

/**
 * Get all users (except current user)
 * GET /api/users
 */
const getUsers = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { search, page = 1, limit = 20 } = req.query;

    const blockedIds = await getBlockedUserIdsFor(currentUserId);
    let query = {
      _id: { $nin: [currentUserId, ...blockedIds] },
      isBanned: { $ne: true },
      deletedAt: { $exists: false },
    };

    // Search by username or email
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('username email avatar status lastSeen')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GetUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين',
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isBanned: { $ne: true }, deletedAt: { $exists: false } }).select(
      'username email avatar status lastSeen'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('GetUserById error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم',
    });
  }
};

/**
 * Search users
 * GET /api/users/search?q=query
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.userId;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال حرفين على الأقل للبحث',
      });
    }

    const blockedIds = await getBlockedUserIdsFor(currentUserId);

    const users = await User.find({
      _id: { $nin: [currentUserId, ...blockedIds] },
      isBanned: { $ne: true },
      deletedAt: { $exists: false },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username email avatar status lastSeen')
      .limit(20);

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('SearchUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في البحث',
    });
  }
};

/**
 * Update user status
 * PUT /api/users/status
 */
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة غير صالحة',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        status,
        lastSeen: new Date(),
      },
      { new: true }
    ).select('username email avatar status lastSeen');

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('UpdateStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الحالة',
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  searchUsers,
  updateStatus,
};
