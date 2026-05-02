const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

async function deleteUser() {
  try {
    const emailOrUsername = process.argv[2];

    if (!emailOrUsername) {
      console.log('❌ اكتب email أو username');
      console.log('مثال: node scripts/deleteUser.js user@test.com');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername },
      ],
    });

    if (!user) {
      console.log('❌ المستخدم غير موجود');
      process.exit(0);
    }

    const userId = user._id;

    const conversations = await Conversation.find({
      participants: userId,
    }).select('_id');

    const conversationIds = conversations.map((c) => c._id);

    await Message.deleteMany({
      $or: [
        { sender: userId },
        { conversationId: { $in: conversationIds } },
      ],
    });

    await Conversation.deleteMany({
      participants: userId,
    });

    await User.findByIdAndDelete(userId);

    console.log(`✅ تم حذف المستخدم: ${user.username} - ${user.email}`);
    console.log(`✅ تم حذف ${conversationIds.length} محادثة مرتبطة به`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Delete user error:', error);
    process.exit(1);
  }
}

deleteUser();