const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const connectDB = require('./config/db');
const { socketHandler } = require('./socket/handler');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');
const blockRoutes = require('./routes/blocks');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();
const server = http.createServer(app);

const allowedOrigins = config.CORS_ORIGINS.length
  ? config.CORS_ORIGINS
  : ['http://localhost:3000'];

const isPrivateNetworkHost = (hostname) => (
  hostname === 'localhost'
  || hostname === '127.0.0.1'
  || hostname.startsWith('192.168.')
  || hostname.startsWith('10.')
  || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
);

const isDevelopmentOriginAllowed = (origin) => {
  if (config.NODE_ENV === 'production') return false;

  try {
    const parsed = new URL(origin);
    return isPrivateNetworkHost(parsed.hostname);
  } catch {
    return false;
  }
};

const corsOrigin = (origin, callback) => {
  // Allow server-to-server tools, curl, Postman, and same-origin requests with no Origin header.
  if (!origin) return callback(null, true);

  if (allowedOrigins.includes(origin) || isDevelopmentOriginAllowed(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`Not allowed by CORS: ${origin}`));
};

const corsOptions = {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: corsOptions.methods,
    credentials: true,
  },
});

// Store io instance in app for routes to access
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nabd Chat API is running' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Nabd Chat API is running', health: '/api/health' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'حدث خطأ في الخادم',
    error: config.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
  });
});

// Initialize Socket.io handler
socketHandler(io);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    server.listen(config.PORT, () => {
      console.log(`
      ╔════════════════════════════════════════════════╗
      ║                                                ║
      ║   🎉 Nabd Chat Server Started!                 ║
      ║                                                ║
      ║   📡 Port: ${config.PORT}                            ║
      ║   🌐 Environment: ${config.NODE_ENV}                    ║
      ║   🔐 CORS Origins: ${allowedOrigins.join(', ')}
      ║                                                ║
      ╚════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };
