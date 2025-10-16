const express = require('express');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireStudent } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get student profile
router.get('/profile', authenticateToken, requireStudent, async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        matricNumber: true,
        department: true,
        studentType: true,
        level: true,
        phone: true,
        profileImage: true,
        createdAt: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update student profile - FIXED VERSION
router.put('/profile', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const updatedStudent = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name,
        email: email,
        phone: phone || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        matricNumber: true,
        department: true,
        studentType: true,
        level: true,
        phone: true,
        profileImage: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedStudent
    });
  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update profile picture
router.put('/profile/picture', authenticateToken, requireStudent, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const profileImage = `/uploads/${req.file.filename}`;

    const updatedStudent = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage },
      select: {
        id: true,
        name: true,
        profileImage: true
      }
    });

    res.json({
      message: 'Profile picture updated successfully',
      student: updatedStudent
    });
  } catch (error) {
    console.error('Profile picture update error:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

// Get student's results
router.get('/results', authenticateToken, requireStudent, async (req, res) => {
  try {
    const results = await prisma.result.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(results);
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Archive an announcement - FIXED VERSION
router.post('/archives/:announcementId', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { announcementId } = req.params;

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Check if already archived by this student
    const existingArchive = await prisma.archive.findFirst({
      where: {
        studentId: req.user.id,
        announcementId: announcementId
      }
    });

    if (existingArchive) {
      return res.status(400).json({ error: 'Announcement already archived' });
    }

    // Create the archive
    const archive = await prisma.archive.create({
      data: {
        studentId: req.user.id,
        announcementId: announcementId
      },
      include: {
        announcement: {
          include: {
            author: {
              select: { name: true }
            }
          }
        }
      }
    });

    res.json({
      message: 'Announcement archived successfully',
      archive: archive
    });
  } catch (error) {
    console.error('Archive error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Announcement already archived' });
    }
    
    res.status(500).json({ error: 'Failed to archive announcement' });
  }
});

// Get archived announcements
router.get('/archives', authenticateToken, requireStudent, async (req, res) => {
  try {
    const archives = await prisma.archive.findMany({
      where: { studentId: req.user.id },
      include: {
        announcement: {
          include: {
            author: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { archivedAt: 'desc' }
    });

    res.json(archives);
  } catch (error) {
    console.error('Archives fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch archived announcements' });
  }
});

// Remove from archive
router.delete('/archives/:archiveId', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { archiveId } = req.params;

    await prisma.archive.delete({
      where: { id: archiveId }
    });

    res.json({ message: 'Removed from archive successfully' });
  } catch (error) {
    console.error('Remove from archive error:', error);
    res.status(500).json({ error: 'Failed to remove from archive' });
  }
});

// GET TIMETABLE FOR STUDENT
router.get('/timetable', authenticateToken, requireStudent, async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { level: true }
    });

    if (!student || !student.level) {
      return res.status(400).json({ error: 'Student level not found' });
    }

    const timetable = await prisma.timetable.findFirst({
      where: { 
        level: student.level
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found for your level' });
    }

    res.json(timetable);
  } catch (error) {
    console.error('Timetable fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

module.exports = router;