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

// App init
const app = express();
const server = http.createServer(app);


// 🔥🔥🔥 حل مشكلة Render Proxy
app.set('trust proxy', 1);


/* =========================
   🌐 CORS CONFIG (FIXED)
========================= */

const allowedOrigins = [
  ...(config.CORS_ORIGINS || []),

  // 🔧 Local
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',

  // 🔥 موقعك الحقيقي
  'https://nabd-chat-sigma.vercel.app'
];

// تنظيف
const cleanOrigins = [...new Set(allowedOrigins.filter(Boolean))];

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);

  if (cleanOrigins.includes(origin)) {
    return callback(null, true);
  }

  console.log("❌ Blocked CORS:", origin);
  return callback(new Error(`CORS blocked: ${origin}`));
};

const corsOptions = {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};


/* =========================
   🔌 SOCKET.IO
========================= */

const io = new Server(server, {
  cors: corsOptions
});

app.set('io', io);


/* =========================
   🛡️ MIDDLEWARE
========================= */

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());


/* =========================
   📦 ROUTES
========================= */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);


/* =========================
   ❤️ HEALTH CHECK
========================= */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nabd Chat API is running'
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nabd Chat API is running',
    health: '/api/health'
  });
});


/* =========================
   ❌ ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error('🔥 Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    error: config.NODE_ENV === 'development' ? err.message : undefined
  });
});


/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


/* =========================
   🔌 SOCKET HANDLER
========================= */

socketHandler(io);


/* =========================
   🚀 START SERVER
========================= */

const startServer = async () => {
  try {
    await connectDB();

    server.listen(config.PORT, () => {
      console.log(`
╔════════════════════════════════════╗
║     🎉 Nabd Chat Server Live      ║
╠════════════════════════════════════╣
║ Port: ${config.PORT}
║ Env: ${config.NODE_ENV}
║ CORS OK ✔
╚════════════════════════════════════╝
      `);
    });

  } catch (err) {
    console.error('❌ Server failed:', err);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };