const express = require('express');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create announcement
router.post('/announcements', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, content, category, isFeatured, isUrgent } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        category,
        isFeatured: isFeatured === 'true',
        isUrgent: isUrgent === 'true',
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
        authorId: req.user.id
      },
      include: {
        author: {
          select: { name: true }
        }
      }
    });

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('Announcement creation error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/announcements/:id', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, isFeatured, isUrgent } = req.body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title: title || undefined,
        content: content || undefined,
        category: category || undefined,
        isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
        isUrgent: isUrgent !== undefined ? isUrgent === 'true' : undefined,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : undefined
      },
      include: {
        author: {
          select: { name: true }
        }
      }
    });

    res.json({
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    console.error('Announcement update error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id }
    });

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Announcement deletion error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Upload timetable
router.post('/timetables', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, level, semester } = req.body;
    
    if (!title || !level || !semester || !req.file) {
      return res.status(400).json({ error: 'Title, level, semester, and file are required' });
    }

    const timetable = await prisma.timetable.create({
      data: {
        title,
        level: parseInt(level),
        semester,
        fileUrl: `/uploads/${req.file.filename}`
      }
    });

    res.status(201).json({
      message: 'Timetable uploaded successfully',
      timetable
    });
  } catch (error) {
    console.error('Timetable upload error:', error);
    res.status(500).json({ error: 'Failed to upload timetable' });
  }
});

// Get timetables by level
router.get('/timetables/:level', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { level } = req.params;
    
    const timetables = await prisma.timetable.findMany({
      where: { level: parseInt(level) },
      orderBy: { createdAt: 'desc' }
    });

    res.json(timetables);
  } catch (error) {
    console.error('Timetables fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch timetables' });
  }
});

// Create event
router.post('/events', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, date, venue } = req.body;
    
    if (!title || !description || !date || !venue) {
      return res.status(400).json({ error: 'All event fields are required' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        venue,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null
      }
    });

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Upload results (basic implementation)
router.post('/results', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    // Note: This is a basic implementation. In production, you'd want to parse CSV/Excel files
    const { studentId, courseCode, courseTitle, grade, semester, session, level } = req.body;
    
    if (!studentId || !courseCode || !courseTitle || !grade) {
      return res.status(400).json({ error: 'Required result fields are missing' });
    }

    const result = await prisma.result.create({
      data: {
        studentId,
        courseCode,
        courseTitle,
        grade,
        semester: semester || 'first',
        session: session || '2023/2024',
        level: parseInt(level) || 100
      }
    });

    res.status(201).json({
      message: 'Result uploaded successfully',
      result
    });
  } catch (error) {
    console.error('Result upload error:', error);
    res.status(500).json({ error: 'Failed to upload result' });
  }
});

module.exports = router;