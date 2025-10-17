require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/students');
const announcementRoutes = require('./routes/announcements');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cscdepartmentboardgroup19a.netlify.app';

// ✅ FIXED CORS Configuration - Allows multiple frontend URLs
const allowedOrigins = [
  'https://68f141352a41df9fff97049d--stellular-kitsune-4475e0.netlify.app',
  'https://cscdepartmentboardgroup19a.netlify.app',
  'https://cscdepartmentboardgroup19.netlify.app',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database test route
app.get('/api/test-db', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userCount = await prisma.user.count();
    res.json({ 
      message: 'Database test',
      userCount: userCount,
      database: 'connected'
    });
  } catch (error) {
    res.json({ 
      message: 'Database test failed',
      error: error.message 
    });
  }
});

// ✅ ADDED: Debug environment route
app.get('/api/debug-env', (req, res) => {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const databaseUrlPreview = process.env.DATABASE_URL ? 
    process.env.DATABASE_URL.substring(0, 50) + '...' : 
    'NOT SET';
  
  res.json({
    environment: process.env.NODE_ENV,
    hasDatabaseUrl: hasDatabaseUrl,
    databaseUrlPreview: databaseUrlPreview,
    databaseUrlStartsCorrectly: process.env.DATABASE_URL ? 
      (process.env.DATABASE_URL.startsWith('postgresql://') || 
       process.env.DATABASE_URL.startsWith('postgres://')) : 
      false,
    port: process.env.PORT,
    hasJwtSecret: !!process.env.JWT_SECRET,
    frontendUrl: process.env.FRONTEND_URL
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/announcements', announcementRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Department Board API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ FIXED: Only one app.listen() call
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
