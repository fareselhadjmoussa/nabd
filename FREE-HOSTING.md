# التشغيل على الخدمات المجانية

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas M0
- Media: Cloudinary Free

## Backend env on Render

NODE_ENV=production
MONGODB_URI=...
JWT_SECRET=...
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

## Frontend env on Vercel

VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
