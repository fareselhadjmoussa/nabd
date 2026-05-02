const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
});

const User = require('../src/models/User');

async function makeAdmin() {
  try {
    const email = process.argv[2];

    if (!email) {
      console.log('❌ اكتب الإيميل');
      console.log('مثال: npm run make:admin -- user@example.com');
      process.exit(1);
    }

    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI غير موجود في backend/.env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      console.log('❌ المستخدم غير موجود:', email);
      process.exit(0);
    }

    user.role = 'admin';
    user.isAdmin = true;
    user.isBlocked = false;
    user.isBanned = false;

    await user.save();

    console.log('✅ تم جعل المستخدم Admin بنجاح');
    console.log({
      email: user.email,
      username: user.username,
      role: user.role,
      isAdmin: user.isAdmin,
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ makeAdmin error:', error);
    process.exit(1);
  }
}

makeAdmin();