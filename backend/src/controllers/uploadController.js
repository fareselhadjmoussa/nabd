const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const cloudinary = require('../config/cloudinary');
const config = require('../config');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم'), false);
  }
};

// Upload middleware factory
const createUpload = (options) => multer({
  storage,
  limits: { fileSize: options.maxSize },
  fileFilter: fileFilter(options.allowedTypes),
});

/**
 * Upload image
 * POST /api/upload/image
 */
const uploadImage = async (req, res) => {
  try {
    const upload = createUpload({
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: config.MAX_IMAGE_SIZE,
    });

    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'خطأ في رفع الصورة',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'يرجى اختيار صورة',
        });
      }

      // If Cloudinary is configured, upload to cloud
      if (cloudinary.config().cloud_name) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'nabd-chat/images',
          public_id: uuidv4(),
          resource_type: 'auto',
        });

        return res.json({
          success: true,
          message: 'تم رفع الصورة',
          data: {
            url: result.secure_url,
            publicId: result.public_id,
          },
        });
      }

      // Fallback: return base64 (not recommended for production)
      const base64 = Buffer.from(req.file.buffer).toString('base64');
      res.json({
        success: true,
        message: 'تم رفع الصورة',
        data: {
          url: `data:${req.file.mimetype};base64,${base64}`,
        },
      });
    });
  } catch (error) {
    console.error('UploadImage error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الصورة',
    });
  }
};

/**
 * Upload video
 * POST /api/upload/video
 */
const uploadVideo = async (req, res) => {
  try {
    const upload = createUpload({
      allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      maxSize: config.MAX_VIDEO_SIZE,
    });

    upload.single('video')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'خطأ في رفع الفيديو',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'يرجى اختيار فيديو',
        });
      }

      if (cloudinary.config().cloud_name) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'nabd-chat/videos',
          public_id: uuidv4(),
          resource_type: 'video',
        });

        return res.json({
          success: true,
          message: 'تم رفع الفيديو',
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
          },
        });
      }

      const base64 = Buffer.from(req.file.buffer).toString('base64');
      res.json({
        success: true,
        message: 'تم رفع الفيديو',
        data: {
          url: `data:${req.file.mimetype};base64,${base64}`,
        },
      });
    });
  } catch (error) {
    console.error('UploadVideo error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الفيديو',
    });
  }
};

/**
 * Upload audio
 * POST /api/upload/audio
 */
const uploadAudio = async (req, res) => {
  try {
    const upload = createUpload({
      allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/webm'],
      maxSize: config.MAX_AUDIO_SIZE,
    });

    upload.single('audio')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'خطأ في رفع الصوت',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'يرجى اختيار ملف صوتي',
        });
      }

      if (cloudinary.config().cloud_name) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'nabd-chat/audio',
          public_id: uuidv4(),
          resource_type: 'video', // Cloudinary uses video resource for audio
        });

        return res.json({
          success: true,
          message: 'تم رفع الملف الصوتي',
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
          },
        });
      }

      const base64 = Buffer.from(req.file.buffer).toString('base64');
      res.json({
        success: true,
        message: 'تم رفع الملف الصوتي',
        data: {
          url: `data:${req.file.mimetype};base64,${base64}`,
        },
      });
    });
  } catch (error) {
    console.error('UploadAudio error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الملف الصوتي',
    });
  }
};

/**
 * Upload avatar
 * POST /api/upload/avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    const upload = createUpload({
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: config.MAX_IMAGE_SIZE,
    });

    upload.single('avatar')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'خطأ في رفع الصورة',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'يرجى اختيار صورة',
        });
      }

      if (cloudinary.config().cloud_name) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'nabd-chat/avatars',
          public_id: uuidv4(),
          resource_type: 'auto',
          transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' },
          ],
        });

        return res.json({
          success: true,
          message: 'تم رفع الصورة الشخصية',
          data: {
            url: result.secure_url,
            publicId: result.public_id,
          },
        });
      }

      const base64 = Buffer.from(req.file.buffer).toString('base64');
      res.json({
        success: true,
        message: 'تم رفع الصورة الشخصية',
        data: {
          url: `data:${req.file.mimetype};base64,${base64}`,
        },
      });
    });
  } catch (error) {
    console.error('UploadAvatar error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الصورة الشخصية',
    });
  }
};

module.exports = {
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadAvatar,
};
