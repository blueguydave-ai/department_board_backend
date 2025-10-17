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
  try {
    console.log('🔍 Checking database connection...');
    
    // Test raw database connection first
    await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log('✅ Database connection test passed');
    
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        matricNumber: true,
        role: true
      },
      take: 5 // Limit to 5 users
    });
    
    console.log(`✅ Found ${userCount} users in database`);
    
    res.json({
      success: true,
      userCount: userCount,
      users: users,
      hasJWTSecret: !!process.env.JWT_SECRET,
      database: 'connected',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('❌ Database check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message,
      code: error.code,
      environment: process.env.NODE_ENV
    });
  }
});

// Enhanced test user creation
router.post('/create-test-user', async (req, res) => {
  try {
    console.log('👤 Creating test user...');
    
    const hashedPassword = await bcrypt.hash('test123', 12);
    
    const user = await prisma.user.create({
      data: {
        name: 'Test Student',
        email: 'test@student.edu.ng',
        matricNumber: 'CS2024999',
        level: 200,
        password: hashedPassword,
        studentType: 'Undergraduate',
        role: 'student',
        department: 'Computer Science',
        phone: '+2348000000000'
      },
      select: {
        id: true,
        name: true,
        email: true,
        matricNumber: true
      }
    });
    
    console.log('✅ Test user created:', user);
    
    res.json({
      success: true,
      message: 'Test user created successfully',
      user: user,
      loginCredentials: {
        email: 'test@student.edu.ng',
        password: 'test123'
      }
    });
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test user',
      details: error.message,
      code: error.code
    });
  }
});

// Enhanced login with database error handling
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, email, matricNumber } = req.body;
    
    console.log('🔐 Login attempt received:', { 
      identifier, 
      email, 
      matricNumber, 
      hasPassword: !!password 
    });

    // Database connection test
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return res.status(500).json({ 
        success: false,
        error: 'Database connection failed',
        details: 'Please check if database tables are created'
      });
    }

    // Determine the identifier
    let searchIdentifier;
    if (identifier) {
      searchIdentifier = identifier;
    } else if (email) {
      searchIdentifier = email;
    } else if (matricNumber) {
      searchIdentifier = matricNumber;
    }

    if (!searchIdentifier || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email/matric number and password are required'
      });
    }

    console.log('🔍 Searching for user with identifier:', searchIdentifier);

    // Find user by email OR matric number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchIdentifier.toLowerCase().trim() },
          { matricNumber: searchIdentifier.trim() }
        ]
      }
    });

    if (!user) {
      console.log('❌ User not found for identifier:', searchIdentifier);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email/matric number or password'
      });
    }

    console.log('✅ User found:', { 
      id: user.id, 
      name: user.name, 
      email: user.email 
    });

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔑 Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user.email);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email/matric number or password' 
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.warn('⚠️ JWT_SECRET not found in environment variables');
    }

    const token = jwt.sign(
      { userId: user.id }, 
      jwtSecret || 'fallback-secret-for-development', 
      { expiresIn: '7d' }
    );

    // Return user data (excluding password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      matricNumber: user.matricNumber,
      level: user.level,
      studentType: user.studentType,
      role: user.role,
      department: user.department,
      phone: user.phone,
      profileImage: user.profileImage
    };

    console.log('🎉 Login successful for:', userData.name);

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2021') {
      return res.status(500).json({
        success: false,
        error: 'Database tables not found',
        details: 'Please run database migration'
      });
    }
    
    if (error.code === 'P1001') {
      return res.status(500).json({
        success: false,
        error: 'Cannot connect to database',
        details: 'Check your database connection string'
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Internal server error during login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Keep your existing signup, verify, and health routes as they are...

module.exports = router;
