const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Student Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, matricNumber, level, password, studentType, phone } = req.body;

    // Validation
    if (!name || !email || !matricNumber || !level || !password || !studentType) {
      return res.status(400).json({ error: 'All fields are required' });
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
      return res.status(400).json({ error: 'User already exists with this email or matric number' });
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

    // Generate JWT token with fallback secret
    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET || 'fallback-secret-key-for-development', 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Student registered successfully',
      user,
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// ✅ FIXED Login Route - Properly handles both email and matricNumber
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, email, matricNumber } = req.body;
    
    console.log('Login attempt received:', { 
      identifier, 
      email, 
      matricNumber, 
      hasPassword: !!password 
    });

    // Determine the identifier - handle all possible cases
    let searchIdentifier;
    if (identifier) {
      // Frontend sends 'identifier' field (could be email or matric)
      searchIdentifier = identifier;
    } else if (email) {
      // Frontend sends 'email' field
      searchIdentifier = email;
    } else if (matricNumber) {
      // Frontend sends 'matricNumber' field  
      searchIdentifier = matricNumber;
    }

    if (!searchIdentifier || !password) {
      return res.status(400).json({ 
        error: 'Email/matric number and password are required',
        received: { identifier, email, matricNumber, hasPassword: !!password }
      });
    }

    console.log('Searching for user with identifier:', searchIdentifier);

    // Find user by email OR matric number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchIdentifier },
          { matricNumber: searchIdentifier }
        ]
      }
    });

    if (!user) {
      console.log('❌ User not found for identifier:', searchIdentifier);
      return res.status(401).json({ 
        error: 'Invalid credentials - user not found',
        attemptedIdentifier: searchIdentifier
      });
    }

    console.log('✅ User found:', { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      matricNumber: user.matricNumber 
    });

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user.email);
      return res.status(401).json({ error: 'Invalid credentials - wrong password' });
    }

    // ✅ Generate JWT token with proper secret check
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.warn('⚠️ JWT_SECRET not found in environment, using fallback');
    }

    const token = jwt.sign(
      { userId: user.id }, 
      jwtSecret || 'fallback-secret-key-for-development', 
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
      message: 'Login successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error during login',
      details: error.message 
    });
  }
});

// ✅ Add token verification endpoint
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Find user to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: user
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      valid: false,
      error: 'Invalid or expired token' 
    });
  }
});

// Health check endpoint for auth routes
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    hasJWTSecret: !!process.env.JWT_SECRET
  });
});

module.exports = router;