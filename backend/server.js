const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB  = require('./config/database');
const logger     = require('./utils/logger');
const { initializeSocketHandlers } = require('./services/socketService');

// Routes
const authRoutes      = require('./routes/auth');
const chatRoutes      = require('./routes/chat');
const messageRoutes   = require('./routes/message');
const imageRoutes     = require('./routes/image');
const userRoutes      = require('./routes/user');
const searchRoutes    = require('./routes/search');
const agentRoutes     = require('./routes/agent');
const workspaceRoutes = require('./routes/workspace');
const uploadRoutes    = require('./routes/upload');
const paymentRoutes   = require('./routes/payment');
const settingsRoutes  = require('./routes/settings');
const adminRoutes     = require('./routes/admin');

const app    = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

connectDB();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize());
app.set('trust proxy', 1); // needed for Render

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Rate limiting
const limiter  = rateLimit({ windowMs:15*60*1000, max:200, standardHeaders:true, legacyHeaders:false });
const aiLimiter= rateLimit({ windowMs:60*1000,    max:30 });
app.use('/api/', limiter);
app.use('/api/chats', aiLimiter);
app.use('/api/agents/chat', aiLimiter);
app.use('/api/images', aiLimiter);

// Body parsing
app.use(express.json({ limit:'50mb' }));
app.use(express.urlencoded({ extended:true, limit:'50mb' }));
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream:{ write: msg => logger.info(msg.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Static uploads
app.use('/uploads', express.static('uploads'));

// Socket.io
initializeSocketHandlers(io);
app.set('io', io);

// Health check — Render uses this + cron-job.org pings this
app.get('/health', (req, res) => {
  res.json({ status:'OK', env:process.env.NODE_ENV, time:new Date().toISOString() });
});

// API Routes
app.use('/api/auth',       authRoutes);
app.use('/api/chats',      chatRoutes);
app.use('/api/messages',   messageRoutes);
app.use('/api/images',     imageRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/search',     searchRoutes);
app.use('/api/agents',     agentRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/admin',      adminRoutes);

// 404
app.use((req, res) => res.status(404).json({ success:false, message:'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Use PORT from env (Render sets this automatically)
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 AI Nexus running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = { app, server };
