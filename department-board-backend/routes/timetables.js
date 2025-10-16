const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get timetable for any level (public or authenticated)
router.get('/:level', async (req, res) => {
    try {
        const { level } = req.params;
        
        const timetable = await prisma.timetable.findFirst({
            where: { 
                level: parseInt(level),
                semester: 'first'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!timetable) {
            return res.status(404).json({ error: 'Timetable not found for this level' });
        }

        res.json(timetable);
    } catch (error) {
        console.error('Timetable fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
});

module.exports = router;