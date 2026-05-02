const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 🔍 البحث عن المستخدمين
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    // إذا ماكانش بحث
    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: { users: [] }
      });
    }

    // 🔥 البحث الذكي
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('-password') // 🔒 حماية
      .limit(20);

    return res.json({
      success: true,
      data: { users }
    });

  } catch (error) {
    console.error('Search error:', error);

    return res.status(500).json({
      success: false,
      message: 'خطأ في البحث'
    });
  }
});

module.exports = router;