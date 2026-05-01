# نبض شات (Nabd Chat)

تطبيق مراسلة فوري آمن وسريع يدعم اللغة العربية (RTL).

![Nabd Chat](https://img.shields.io/badge/Nabd%20Chat-v1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green)

## 📋 الفهرس

- [المميزات](#-المميزات)
- [المتطلبات](#-المتطلبات)
- [التثبيت](#-التثبيت)
- [التشغيل المحلي](#-التشغيل-المحلي)
- [النشر](#-النشر)
- [API Routes](#-api-routes)
- [WebSocket Events](#-websocket-events)
- [الأمان](#-الأمان)

## 🌟 المميزات

- ✅ تسجيل الدخول والتسجيل
- ✅ محادثات خاصة ومجموعات
- ✅ رسائل نصية وصور وفيديو ورسائل صوتية
- ✅ القراءة/عدم القراءة
- ✅ ردود الفعل على الرسائل
- ✅ حذف الرسائل
- ✅ مؤشر الكتابة
- ✅ حالة الاتصال (متصل/غير متصل)
- ✅ البحث عن المستخدمين
- ✅ واجهة RTL كاملة للغة العربية
- ✅ تصميم عصري داكن
- ✅ رسائل فورية عبر WebSocket

## 📦 المتطلبات

- Node.js 18+
- MongoDB Atlas أو MongoDB محلي
- npm أو yarn

## 🛠️ التثبيت

### 1. استنساخ المشروع

```bash
git clone https://github.com/yourusername/nabd-chat.git
cd nabd-chat
```

### 2. إعداد Backend

```bash
cd backend
npm install
```

### 3. إعداد المتغيرات البيئية

```bash
cd backend
cp .env.example .env
```

عدّل ملف `.env`:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/nabd-chat

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary (اختياري)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. إعداد Frontend

```bash
cd ../frontend
npm install
```

## 🚀 التشغيل المحلي

### Backend

```bash
cd backend
npm run dev
```

الخادم سيعمل على http://localhost:5000

### Frontend

```bash
cd frontend
npm run dev
```

التطبيق سيعمل على http://localhost:3000

## ☁️ النشر

### Backend - Railway

1. أنشئ حساب على [Railway](https://railway.app)
2. اربط مستودع GitHub
3. أضف متغيرات البيئة:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLOUDINARY_*` (اختياري)
   - `NODE_ENV=production`
4. اضبط أمر البدء: `cd backend && npm start`

### Frontend - Vercel

1. أنشئ حساب على [Vercel](https://vercel.com)
2. اربط مستودع GitHub
3. أضف متغير البيئة:
   - `VITE_API_URL` = رابط Backend المنشور
   - `VITE_SOCKET_URL` = رابط Backend المنشور
4. انشر

### Database - MongoDB Atlas

1. أنشئ حساب على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. أنشئ Cluster مجاني
3. أنشئ Database User
4. احصل على رابط الاتصال

## 📡 API Routes

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | تسجيل مستخدم جديد |
| POST | `/api/auth/login` | تسجيل الدخول |
| POST | `/api/auth/logout` | تسجيل الخروج |
| GET | `/api/auth/me` | جلب المستخدم الحالي |
| PUT | `/api/auth/profile` | تحديث الملف الشخصي |
| PUT | `/api/auth/change-password` | تغيير كلمة المرور |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | جلب جميع المستخدمين |
| GET | `/api/users/search` | البحث عن مستخدمين |
| GET | `/api/users/:id` | جلب مستخدم |
| PUT | `/api/users/status` | تحديث الحالة |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | جلب المحادثات |
| POST | `/api/conversations` | إنشاء محادثة |
| GET | `/api/conversations/:id` | جلب محادثة |
| PUT | `/api/conversations/:id/read` | تعليم كمقروء |
| DELETE | `/api/conversations/:id` | حذف محادثة |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:conversationId` | جلب الرسائل |
| POST | `/api/messages` | إرسال رسالة |
| PUT | `/api/messages/:id/read` | تعليم كمقروء |
| DELETE | `/api/messages/:id` | حذف رسالة |
| PUT | `/api/messages/:id/reaction` | إضافة رد فعل |

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/image` | رفع صورة |
| POST | `/api/upload/video` | رفع فيديو |
| POST | `/api/upload/audio` | رفع صوت |
| POST | `/api/upload/avatar` | رفع صورة شخصية |

## 🔌 WebSocket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `joinConversation` | `{conversationId}` | الانضمام لمحادثة |
| `leaveConversation` | `{conversationId}` | مغادرة محادثة |
| `sendMessage` | `{conversationId, content, type}` | إرسال رسالة |
| `typingStart` | `{conversationId}` | بدء الكتابة |
| `typingStop` | `{conversationId}` | إيقاف الكتابة |
| `markRead` | `{conversationId, messageId}` | تعليم كمقروء |
| `addReaction` | `{messageId, emoji}` | إضافة رد فعل |
| `deleteMessage` | `{messageId}` | حذف رسالة |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `newMessage` | `{message}` | رسالة جديدة |
| `messageSent` | `{message, conversationId}` | تأكيد الإرسال |
| `messageRead` | `{conversationId, messageId, userId}` | قراءة الرسالة |
| `messageDeleted` | `{messageId, conversationId}` | حذف الرسالة |
| `reactionAdded` | `{message}` | رد فعل جديد |
| `userTyping` | `{conversationId, userId, username}` | مستخدم يكتب |
| `userStopTyping` | `{conversationId, userId}` | إيقاف الكتابة |
| `userOnline` | `{userId}` | مستخدم متصل |
| `userOffline` | `{userId}` | مستخدم غير متصل |

## 🔒 الأمان

- **JWT Authentication** - رموز وصول قصيرة الأمد
- **bcrypt** - تشفير كلمات المرور
- **Rate Limiting** - تقييد الطلبات
- **Input Validation** - التحقق من المدخلات
- **CORS** - حماية الطلبات
- **Helmet** - أمان HTTP headers
- **File Validation** - التحقق من أنواع الملفات

## 📁 هيكل المشروع

```
nabd-chat/
├── backend/
│   ├── src/
│   │   ├── config/         # إعدادات التطبيق
│   │   ├── controllers/    # منطق التحكم
│   │   ├── middleware/     # الوسطاء
│   │   ├── models/         # نماذج قاعدة البيانات
│   │   ├── routes/         # مسارات API
│   │   ├── socket/         # معالج WebSocket
│   │   └── server.js       # نقطة البدء
│   ├── .env                # المتغيرات البيئية
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # مكونات React
│   │   ├── pages/          # صفحات التطبيق
│   │   ├── services/       # خدمات API و Socket
│   │   ├── stores/         # إدارة الحالة
│   │   └── App.jsx         # المكون الرئيسي
│   ├── .env                # المتغيرات البيئية
│   └── package.json
├── ARCHITECTURE.md         # توثيق الهندسة
└── README.md
```

## 🧪 الاختبار

### اختبار API

```bash
# تسجيل مستخدم
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# تسجيل الدخول
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### اختبار WebSocket

استخدم [Socket.io Client](https://socket.io/docs/client-api/) في المتصفح:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
  socket.emit('joinConversation', { conversationId: 'CONVERSATION_ID' });
});
```

## 📝 الترخيص

MIT License

## 👥 المساهمة

نرحب بمساهماتكم! يرجى فتح Issue أو Pull Request.

---

**تم التطوير بـ ❤️ للغة العربية**
