const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();

// Initialize Prisma with error handling
let prisma;
try {
  prisma = new PrismaClient();
  console.log('✅ Prisma client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Prisma client:', error);
  // Create a mock prisma client to prevent crashes
  prisma = {
    user: {
      findFirst: () => { throw new Error('Prisma not initialized'); },
      count: () => { throw new Error('Prisma not initialized'); },
      findMany: () => { throw new Error('Prisma not initialized'); },
      create: () => { throw new Error('Prisma not initialized'); },
      findUnique: () => { throw new Error('Prisma not initialized'); }
    }
  };
}

// Enhanced database status check
router.get('/check-db', async (req, res) => {
  // ... your existing check-db code ...
});

// Enhanced test user creation
router.post('/create-test-user', async (req, res) => {
  // ... your existing create-test-user code ...
});

// Enhanced login with database error handling
router.post('/login', async (req, res) => {
  // ... your existing login code ...
});

// ✅ ADD THIS: Student Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, matricNumber, level, password, studentType, phone } = req.body;

    // Validation
    if (!name || !email || !matricNumber || !level || !password || !studentType) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { matricNumber }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User already exists with this email or matric number' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        matricNumber,
        level: parseInt(level),
        password: hashedPassword,
        studentType,
        phone: phone || null,
        role: 'student',
        department: 'Computer Science'
      },
      select: {
        id: true,
        name: true,
        email: true,
        matricNumber: true,
        level: true,
        studentType: true,
        role: true,
        department: true,
        phone: true
      }
    });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { userId: user.id }, 
      jwtSecret || 'fallback-secret-key-for-development', 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      user,
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ ADD THIS: Health check endpoint for auth routes
router.get('/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    hasJWTSecret: !!process.env.JWT_SECRET
  });
});

module.exports = router;
