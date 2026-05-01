# نبض شات - موقع دردشة كامل

موقع دردشة عربي كامل: تسجيل/دخول، محادثات فردية وجماعية، رسائل لحظية Socket.IO، حالة اتصال، كتابة الآن، تفاعلات، رفع صور/فيديو/صوت، واجهة RTL متجاوبة.

## الخدمات المجانية المقترحة

- Frontend: Vercel Hobby
- Backend: Render Free Web Service
- Database: MongoDB Atlas M0
- Media Uploads: Cloudinary Free

## التشغيل المحلي

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

ثم في نافذة أخرى:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

افتح: http://localhost:3000

## إعداد الإنتاج المختصر

Backend على Render:

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_long_random_secret
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
CLOUDINARY_CLOUD_NAME=optional
CLOUDINARY_API_KEY=optional
CLOUDINARY_API_SECRET=optional
```

Frontend على Vercel:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```
