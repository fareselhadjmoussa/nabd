const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Report = require('../models/Report');

const createReport = async (req, res) => {
  try {
    const {
      reportedUserId,
      conversationId,
      messageId,
      reason = 'other',
      details = '',
    } = req.body;

    if (!reportedUserId) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار المستخدم المراد الإبلاغ عنه' });
    }

    if (reportedUserId === req.userId.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك الإبلاغ عن نفسك' });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser || reportedUser.deletedAt) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (conversationId) {
      const conversation = await Conversation.findOne({ _id: conversationId, participants: req.userId });
      if (!conversation) {
        return res.status(403).json({ success: false, message: 'غير مصرح بالإبلاغ من هذه المحادثة' });
      }
    }

    if (messageId) {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
      }
    }

    const report = await Report.create({
      reporter: req.userId,
      reportedUser: reportedUserId,
      conversation: conversationId || undefined,
      message: messageId || undefined,
      reason,
      details: String(details || '').trim(),
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال البلاغ للإدارة',
      data: { report },
    });
  } catch (error) {
    console.error('CreateReport error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إرسال البلاغ' });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.userId })
      .populate('reportedUser', 'username avatar status')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: { reports } });
  } catch (error) {
    console.error('GetMyReports error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البلاغات' });
  }
};

module.exports = {
  createReport,
  getMyReports,
};
