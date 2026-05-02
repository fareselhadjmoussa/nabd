const User = require('../models/User');
const Block = require('../models/Block');

const getBlockedUsers = async (req, res) => {
  try {
    const blocks = await Block.find({ blocker: req.userId })
      .populate('blocked', 'username email avatar status lastSeen')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { users: blocks.map((block) => block.blocked).filter(Boolean) },
    });
  } catch (error) {
    console.error('GetBlockedUsers error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المحظورين' });
  }
};

const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حظر نفسك' });
    }

    const target = await User.findOne({ _id: userId, deletedAt: { $exists: false } });
    if (!target) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await Block.updateOne(
      { blocker: req.userId, blocked: userId },
      { $setOnInsert: { blocker: req.userId, blocked: userId } },
      { upsert: true }
    );

    res.json({ success: true, message: 'تم حظر المستخدم' });
  } catch (error) {
    console.error('BlockUser error:', error);
    res.status(500).json({ success: false, message: 'خطأ في حظر المستخدم' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await Block.deleteOne({ blocker: req.userId, blocked: userId });
    res.json({ success: true, message: 'تم إلغاء الحظر' });
  } catch (error) {
    console.error('UnblockUser error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إلغاء الحظر' });
  }
};

module.exports = {
  getBlockedUsers,
  blockUser,
  unblockUser,
};
