const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all announcements (with search and filter)
router.get('/', async (req, res) => {
  try {
    const { search, category, featured, urgent } = req.query;
    
    let where = {};
    
    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Category filter
    if (category) {
      where.category = category;
    }
    
    // Featured filter
    if (featured !== undefined) {
      where.isFeatured = featured === 'true';
    }
    
    // Urgent filter
    if (urgent !== undefined) {
      where.isUrgent = urgent === 'true';
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        author: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(announcements);
  } catch (error) {
    console.error('Announcements fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get featured announcements (for homepage)
router.get('/featured', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { 
        OR: [
          { isFeatured: true },
          { isUrgent: true }
        ]
      },
      include: {
        author: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    res.json(announcements);
  } catch (error) {
    console.error('Featured announcements fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch featured announcements' });
  }
});

// Get single announcement
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: { name: true, role: true }
        }
      }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Announcement fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

module.exports = router;