const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const compression     = require('compression');
const mongoSanitize   = require('express-mongo-sanitize');
const rateLimit       = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const logger    = require('./utils/logger');
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

// ── CORS — allow Vercel + localhost ──────────────────────────
// Strip any trailing slash from CLIENT_URL
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const allowedOrigins = [
  clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  // Allow any vercel.app subdomain as safety net
  /\.vercel\.app$/,
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Render health checks)
    if (!origin) return callback(null, true);
    // Check if origin matches any allowed origin
    const allowed = allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    if (allowed) return callback(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    // In production still allow — don't break the app
    callback(null, true);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  optionsSuccessStatus: 200,
};

const io = new Server(server, {
  cors: { origin: '*', methods:['GET','POST'], credentials:false },
});

connectDB();

// Trust Render's proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ contentSecurityPolicy:false, crossOriginEmbedderPolicy:false }));
app.use(mongoSanitize());

// Apply CORS BEFORE any other middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for ALL routes

// Rate limiting
const limiter  = rateLimit({ windowMs:15*60*1000, max:300, standardHeaders:true, legacyHeaders:false });
const aiLimiter= rateLimit({ windowMs:60*1000, max:30 });
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
  app.use(morgan('combined', { stream:{ write: m => logger.info(m.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Socket.io
initializeSocketHandlers(io);
app.set('io', io);

// ── Health check (Render + cron-job.org ping this) ────────────
app.get('/', (req, res) => res.json({ message:'AI Nexus API', status:'running', version:'1.0.0' }));
app.get('/health', (req, res) => res.json({ status:'OK', env:process.env.NODE_ENV, time:new Date().toISOString() }));

// ── API Routes ─────────────────────────────────────────────────
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

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(err.statusCode||500).json({
    success:false,
    message: process.env.NODE_ENV==='production' ? 'Internal server error' : err.message,
  });
});

const PORT = parseInt(process.env.PORT) || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 AI Nexus API running on port ${PORT} [${process.env.NODE_ENV||'development'}]`);
});

module.exports = { app, server };
