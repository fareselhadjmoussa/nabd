const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Report = require('../models/Report');
const deleteUserCascade = require('../utils/deleteUserCascade');

const normalizeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getStats = async (req, res) => {
  try {
    const [users, bannedUsers, conversations, messages, pendingReports, totalReports] = await Promise.all([
      User.countDocuments({ deletedAt: { $exists: false } }),
      User.countDocuments({ isBanned: true, deletedAt: { $exists: false } }),
      Conversation.countDocuments(),
      Message.countDocuments({ deleted: false }),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments(),
    ]);

    res.json({
      success: true,
      data: { stats: { users, bannedUsers, conversations, messages, pendingReports, totalReports } },
    });
  } catch (error) {
    console.error('AdminStats error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
};

const getUsers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 25, status = 'all' } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);

    const query = {};
    if (status === 'banned') query.isBanned = true;
    if (status === 'admin') query.role = 'admin';
    if (status === 'active') query.isBanned = { $ne: true };

    if (search) {
      const regex = new RegExp(normalizeRegex(search), 'i');
      query.$or = [{ username: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email avatar status lastSeen role isBanned bannedReason bannedAt createdAt')
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    console.error('AdminGetUsers error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المستخدمين' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isBanned, bannedReason = '' } = req.body;

    if (id === req.userId.toString() && (isBanned === true || role === 'user')) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حظر نفسك أو إزالة صلاحيتك' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    if (role !== undefined) user.role = role === 'admin' ? 'admin' : 'user';
    if (isBanned !== undefined) {
      user.isBanned = Boolean(isBanned);
      user.bannedReason = user.isBanned ? String(bannedReason || 'تم حظر هذا الحساب من الإدارة') : '';
      user.bannedAt = user.isBanned ? new Date() : undefined;
      if (user.isBanned) user.status = 'offline';
    }

    await user.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('userProfileUpdated', { user: user.getPublicProfile() });
      if (user.isBanned) io.to(`user:${user._id}`).emit('accountBanned', { message: user.bannedReason });
    }

    res.json({ success: true, message: 'تم تحديث المستخدم', data: { user: user.getPublicProfile() } });
  } catch (error) {
    console.error('AdminUpdateUser error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المستخدم' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.userId.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك من لوحة الإدارة' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    const result = await deleteUserCascade(user._id);
    const io = req.app.get('io');
    if (io) io.emit('userDeleted', { userId: id });

    res.json({ success: true, message: 'تم حذف المستخدم', data: result });
  } catch (error) {
    console.error('AdminDeleteUser error:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف المستخدم' });
  }
};

const getReports = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25 } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const query = status === 'all' ? {} : { status };

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'username email avatar')
        .populate('reportedUser', 'username email avatar isBanned')
        .populate('reviewedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
      },
    });
  } catch (error) {
    console.error('AdminGetReports error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البلاغات' });
  }
};

const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote = '' } = req.body;
    const allowed = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة البلاغ غير صالحة' });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });

    report.status = status;
    report.adminNote = String(adminNote || '').trim();
    report.reviewedBy = req.userId;
    report.reviewedAt = new Date();
    await report.save();
    await report.populate('reporter', 'username email avatar');
    await report.populate('reportedUser', 'username email avatar isBanned');
    await report.populate('reviewedBy', 'username email');

    res.json({ success: true, message: 'تم تحديث البلاغ', data: { report } });
  } catch (error) {
    console.error('AdminUpdateReport error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث البلاغ' });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUser,
  deleteUser,
  getReports,
  updateReport,
};
