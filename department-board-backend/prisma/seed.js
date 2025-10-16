const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.archive.deleteMany();
  await prisma.result.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin (without matricNumber since they're admin)
  const admin = await prisma.user.create({
    data: {
      name: 'HOD INFORMATION TECHNOLOGY',
      email: 'admin@cs.edu.ng',
      role: 'admin',
      department: 'Computer Science',
      phone: '+2348067890123',
      password: await bcrypt.hash('admin123', 10),
    }
  });

  // Create Students
  const student1 = await prisma.user.create({
    data: {
      name: 'Eboh David',
      email: 'daavideboh5@gmail.com',
      matricNumber: '20221314455',
      level: 200,
      studentType: 'Undergraduate',
      role: 'student',
      department: 'Computer Science',
      phone: '+2348012345678',
      password: await bcrypt.hash('password123', 10),
    }
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Aisha Bello',
      email: 'aisha.bello@student.edu.ng',
      matricNumber: 'CS2024002',
      level: 300,
      studentType: 'Undergraduate',
      role: 'student',
      department: 'Computer Science',
      phone: '+2348023456789',
      password: await bcrypt.hash('password123', 10),
    }
  });

  // Create Announcements
  const announcements = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'First Semester Examination Schedule',
        content: 'The first semester examination timetable has been released. All students are advised to check the schedule and prepare accordingly. Exams will commence on March 15th, 2026.',
        category: 'exam',
        isFeatured: true,
        isUrgent: false,
        fileUrl: '/files/exam-timetable.pdf',
        authorId: admin.id,
      }
    }),
    prisma.announcement.create({
      data: {
        title: 'Course Registration Deadline Extension',
        content: 'The deadline for course registration has been extended to Friday, January 12th, 2026. All students must complete their registration before this date.',
        category: 'registration',
        isFeatured: true,
        isUrgent: true,
        authorId: admin.id,
      }
    }),
    prisma.announcement.create({
      data: {
        title: 'Computer Laboratory Maintenance',
        content: 'The main computer laboratory will be closed for maintenance from January 10th to January 12th, 2026. Alternative arrangements have been made in Lab B.',
        category: 'general',
        isFeatured: false,
        isUrgent: false,
        authorId: admin.id,
      }
    }),
    prisma.announcement.create({
      data: {
        title: 'Cybersecurity Awareness Workshop',
        content: 'The department is organizing a cybersecurity awareness workshop on January 20th, 2026. All students are encouraged to attend. Venue: Lecture Theater 3, Time: 10:00 AM.',
        category: 'event',
        isFeatured: true,
        isUrgent: false,
        fileUrl: 'https://www.google.com/search?sca_esv=922155461cbe86eb&sxsrf=AE3TifODjx9vW-M91IlL3XsLU9EnU14Srg%3A1760617569962&q=cyber%20security%20awareness%20for%20students&ved=2ahUKEwiG8N7G26iQAxVgTaQEHW_2J-UQmoICKAF6BAh-EAI',
        authorId: admin.id,
      }
    })
  ]);

  // Create Timetables
  const timetables = await Promise.all([
    prisma.timetable.create({
      data: {
        title: '100 Level First Semester Timetable CSC',
        level: 100,
        semester: 'first',
        fileUrl: '/files/timetable-100-first.pdf',
      }
    }),
    prisma.timetable.create({
      data: {
        title: '200 Level First Semester Timetable CSC',
        level: 200,
        semester: 'first',
        fileUrl: '/files/timetable-200-first.pdf',
      }
    }),
    prisma.timetable.create({
      data: {
        title: '300 Level First Semester Timetable CSC',
        level: 300,
        semester: 'first',
        fileUrl: '/files/timetable-300-first.pdf',
      }
    })
  ]);

  // Create Results
  const results = await Promise.all([
    prisma.result.create({
      data: {
        studentId: student1.id,
        courseCode: 'CSC201',
        courseTitle: 'Data Structures and Algorithms',
        grade: 'A',
        semester: 'First Semester 2024/2025',
        session: '2024/2025',
        level: 200
      }
    }),
    prisma.result.create({
      data: {
        studentId: student1.id,
        courseCode: 'CIT306',
        courseTitle: 'WEB PROGRAMMING',
        grade: 'B',
        semester: 'First Semester 2024/2025',
        session: '2024/2025',
        level: 200
      }
    })
  ]);

  // Create Archives
  const archives = await Promise.all([
    prisma.archive.create({
      data: {
        studentId: student1.id,
        announcementId: announcements[0].id,
      }
    }),
    prisma.archive.create({
      data: {
        studentId: student1.id,
        announcementId: announcements[3].id,
      }
    })
  ]);

  console.log('Seed completed successfully!');
  console.log(`Created: 2 students, 1 admin, ${announcements.length} announcements, ${timetables.length} timetables, ${results.length} results, ${archives.length} archives`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });