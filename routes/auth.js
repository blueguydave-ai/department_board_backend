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

// Enhanced login with comprehensive debugging
router.post('/login', async (req, res) => {
  console.log('🔐 LOGIN STARTED - Request received at:', new Date().toISOString());
  
  try {
    const { identifier, password, email, matricNumber } = req.body;
    
    console.log('📦 Request body received:', { 
      identifier, 
      email, 
      matricNumber, 
      hasPassword: !!password 
    });

    console.log('🔄 Testing database connection...');
    // Database connection test
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return res.status(500).json({ 
        success: false,
        error: 'Database connection failed'
      });
    }

    console.log('🔍 Starting user search...');
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
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false,
        error: 'Email/matric number and password are required'
      });
    }

    console.log('🎯 Searching for user with identifier:', searchIdentifier);

    // Find user by email OR matric number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchIdentifier.toLowerCase().trim() },
          { matricNumber: searchIdentifier.trim() }
        ]
      }
    });

    console.log('👤 User search result:', user ? `User found: ${user.email}` : 'User not found');

    if (!user) {
      console.log('❌ User not found for identifier:', searchIdentifier);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email/matric number or password'
      });
    }

    console.log('🔑 Checking password...');
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

    console.log('🎉 Login successful, generating token...');
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

    console.log('✅ LOGIN COMPLETED - Sending response for:', userData.name);

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('💥 LOGIN ERROR:', error);
    
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

// Student Signup Route
router.post('/signup', async (req, res) => {
  console.log('📝 SIGNUP STARTED - Request received at:', new Date().toISOString());
  
  try {
    const { name, email, matricNumber, level, password, studentType, phone } = req.body;

    console.log('📦 Signup request data:', { name, email, matricNumber, level, studentType });

    // Validation
    if (!name || !email || !matricNumber || !level || !password || !studentType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    console.log('🔍 Checking for existing user...');
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
      console.log('❌ User already exists:', existingUser.email);
      return res.status(400).json({ 
        success: false,
        error: 'User already exists with this email or matric number' 
      });
    }

    console.log('🔐 Hashing password...');
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('👤 Creating user...');
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

    console.log('🎫 Generating token...');
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { userId: user.id }, 
      jwtSecret || 'fallback-secret-key-for-development', 
      { expiresIn: '7d' }
    );

    console.log('✅ SIGNUP COMPLETED - User created:', user.email);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      user,
      token
    });

  } catch (error) {
    console.error('💥 SIGNUP ERROR:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Simple test endpoint
router.post('/test-simple', (req, res) => {
  console.log('🧪 Simple test endpoint hit at:', new Date().toISOString());
  res.json({ 
    success: true, 
    message: 'Backend is responding',
    timestamp: new Date().toISOString()
  });
});

// Database performance test
router.get('/test-db-performance', async (req, res) => {
  console.log('⚡ Testing database performance...');
  console.time('DBQueryTime');
  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.timeEnd('DBQueryTime');
    console.log('✅ Database performance test completed');
    res.json({ 
      success: true, 
      queryTime: 'check console',
      userCount: users.length 
    });
  } catch (error) {
    console.timeEnd('DBQueryTime');
    console.error('❌ Database performance test failed:', error);
    res.json({ success: false, error: error.message });
  }
});

// Health check endpoint for auth routes
router.get('/health', (req, res) => {
  console.log('❤️ Auth health check');
  res.json({ 
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    hasJWTSecret: !!process.env.JWT_SECRET
  });
});

module.exports = router;
