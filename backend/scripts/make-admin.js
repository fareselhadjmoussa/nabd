const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/User');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.log('❌ اكتب البريد: node scripts/make-admin.js email@example.com');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI غير موجود في backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email });
  if (!user) {
    console.log('❌ المستخدم غير موجود');
    process.exit(1);
  }

  user.role = 'admin';
  user.isBanned = false;
  user.bannedReason = '';
  user.bannedAt = undefined;
  await user.save();

  console.log(`✅ أصبح ${user.email} مديراً`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
