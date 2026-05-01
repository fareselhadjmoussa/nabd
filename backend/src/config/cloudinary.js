const cloudinary = require('cloudinary').v2;
const config = require('./index');

// Configure Cloudinary
if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });

  console.log('✅ Cloudinary configured');
} else {
  console.log('⚠️ Cloudinary not configured - media uploads will be disabled');
}

module.exports = cloudinary;
