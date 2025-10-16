# Departmental Student Information Board - Backend

A robust Node.js/Express backend for the Departmental Student Information Board system.

## Features

- **Student Authentication** (Signup/Login with JWT)
- **Role-based Access Control** (Student/Admin)
- **Announcement Management** (CRUD operations with file uploads)
- **Timetable Management** (Level-based timetable upload/view)
- **Result Management** (Secure student result access)
- **Event Management** (Department events calendar)
- **Archive System** (Students can save important announcements)
- **File Upload** (Profile pictures, announcement attachments, timetables)
- **Search & Filter** (Announcements by category, urgency, etc.)

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

## Installation & Setup

### 1. Clone and Setup Project

```bash
# Create project directory
mkdir department-board-backend
cd department-board-backend

# Copy all the provided files into this directory

# Install dependencies
npm install