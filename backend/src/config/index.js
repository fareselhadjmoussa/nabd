const path = require('path');
const dotenv = require('dotenv');

// Always load backend/.env, even if npm is started from the project root.
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const parseOrigins = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const CORS_ORIGINS = parseOrigins(process.env.CORS_ORIGINS || FRONTEND_URL);

module.exports = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // CORS
  FRONTEND_URL,
  CORS_ORIGINS,

  // Upload Limits (in bytes)
  MAX_IMAGE_SIZE: parseInt(process.env.MAX_IMAGE_SIZE, 10) || 5242880, // 5MB
  MAX_VIDEO_SIZE: parseInt(process.env.MAX_VIDEO_SIZE, 10) || 52428800, // 50MB
  MAX_AUDIO_SIZE: parseInt(process.env.MAX_AUDIO_SIZE, 10) || 10485760, // 10MB
};
