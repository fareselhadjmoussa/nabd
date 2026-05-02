const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Block = require('../models/Block');
const Report = require('../models/Report');

const deleteUserCascade = async (userId) => {
  const conversations = await Conversation.find({ participants: userId }).select('_id');
  const conversationIds = conversations.map((conversation) => conversation._id);

  await Message.deleteMany({
    $or: [
      { sender: userId },
      { conversationId: { $in: conversationIds } },
    ],
  });

  await Conversation.deleteMany({ participants: userId });
  await Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] });
  await Report.updateMany(
    { $or: [{ reporter: userId }, { reportedUser: userId }] },
    { $set: { status: 'dismissed', adminNote: 'تم حذف مستخدم مرتبط بهذا البلاغ' } }
  );

  await User.findByIdAndDelete(userId);

  return {
    deletedConversations: conversationIds.length,
  };
};

module.exports = deleteUserCascade;
