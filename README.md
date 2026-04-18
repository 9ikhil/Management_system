# Management System — Backend API

A backend system built with **Node.js (Express)** and **MongoDB** to manage users, batches, learning resources, and attendance.

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16
- MongoDB (local or Atlas)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start the server
npm start          # production
npm run dev        # development (requires nodemon)
```

### Environment Variables (`.env`)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/management_system
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
```

---

## 📁 Project Structure

```
management-system/
├── server.js                      # Entry point
├── .env.example
├── uploads/                       # Uploaded PDF files (auto-created)
└── src/
    ├── app.js                     # Express app setup
    ├── config/
    │   └── db.js                  # MongoDB connection
    ├── models/
    │   ├── user.model.js          # User schema
    │   ├── batch.model.js         # Batch schema
    │   ├── resource.model.js      # Resource schema
    │   └── attendance.model.js    # Attendance schema
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── batch.controller.js
    │   ├── resource.controller.js
    │   └── attendance.controller.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── batch.routes.js
    │   ├── resource.routes.js
    │   └── attendance.routes.js
    ├── middleware/
    │   ├── auth.middleware.js      # JWT protect + role authorize
    │   ├── error.middleware.js     # Centralized error handler
    │   ├── upload.middleware.js    # Multer for PDF uploads
    │   └── validate.middleware.js  # express-validator handler
    └── utils/
        ├── jwt.utils.js
        └── response.utils.js
```

---

## 🗄️ Database Schema

### User
| Field         | Type     | Description                      |
|---------------|----------|----------------------------------|
| name          | String   | Required, 2–100 chars            |
| email         | String   | Unique, required                 |
| password      | String   | Hashed with bcrypt               |
| role          | String   | `admin` or `user` (default)      |
| assignedBatch | ObjectId | Reference to Batch               |
| isActive      | Boolean  | Soft-disable accounts            |

### Batch
| Field       | Type       | Description                               |
|-------------|------------|-------------------------------------------|
| name        | String     | Unique batch name                         |
| description | String     | Optional                                  |
| schedule    | Array      | `[{ day, startTime, endTime }]`           |
| students    | [ObjectId] | Array of User references                  |
| createdBy   | ObjectId   | Admin who created it                      |

### Resource
| Field       | Type     | Description                              |
|-------------|----------|------------------------------------------|
| title       | String   | Required                                 |
| type        | String   | `pdf`, `link`, `video`, `document`       |
| url         | String   | For links or file serving path           |
| filePath    | String   | Server disk path (PDFs)                  |
| batch       | ObjectId | Batch this resource belongs to           |
| uploadedBy  | ObjectId | Admin reference                          |

### Attendance
| Field    | Type     | Description                             |
|----------|----------|-----------------------------------------|
| student  | ObjectId | User reference                          |
| batch    | ObjectId | Batch reference                         |
| date     | Date     | Normalized to midnight UTC              |
| status   | String   | `present`, `absent`, `late`             |
| notes    | String   | Optional admin notes                    |
| markedBy | ObjectId | Admin who marked it                     |

> **Unique index**: `(student, batch, date)` prevents duplicate entries.

---

## 📡 API Documentation

All responses follow this structure:
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "meta": { "total": 100, "page": 1, "pages": 10 }
}
```

Errors:
```json
{
  "success": false,
  "message": "...",
  "errors": [{ "field": "email", "message": "Valid email is required" }]
}
```

---

### 🔐 Authentication

#### Register
```
POST /api/auth/register
```
**Body:**
```json
{
  "name": "John Admin",
  "email": "admin@example.com",
  "password": "secret123",
  "role": "admin"
}
```
**Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "...", "name": "John Admin", "email": "admin@example.com", "role": "admin" }
  }
}
```

---

#### Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```
**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "...", "name": "John Admin", "email": "admin@example.com", "role": "admin" }
  }
}
```

---

#### Get My Profile
```
GET /api/auth/me
Authorization: Bearer <token>
```

---

### 👤 User Management *(Admin only)*

#### Create User
```
POST /api/users
Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "pass123",
  "role": "user",
  "assignedBatch": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

---

#### Get All Users
```
GET /api/users?role=user&batch=<batchId>&page=1&limit=10&search=jane
Authorization: Bearer <admin-token>
```

---

#### Get User by ID
```
GET /api/users/:id
Authorization: Bearer <admin-token>
```

---

#### Update User
```
PUT /api/users/:id
Authorization: Bearer <admin-token>
```
**Body (any fields to update):**
```json
{
  "name": "Jane Updated",
  "assignedBatch": "64f1a2b3c4d5e6f7a8b9c0d2"
}
```

---

#### Delete User
```
DELETE /api/users/:id
Authorization: Bearer <admin-token>
```

---

### 🗂️ Batch Management *(Admin only)*

#### Create Batch
```
POST /api/batches
Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "name": "Batch A - Full Stack 2024",
  "description": "Morning full-stack cohort",
  "schedule": [
    { "day": "Monday", "startTime": "09:00", "endTime": "12:00" },
    { "day": "Wednesday", "startTime": "09:00", "endTime": "12:00" },
    { "day": "Friday", "startTime": "09:00", "endTime": "12:00" }
  ]
}
```

---

#### Get All Batches
```
GET /api/batches?page=1&limit=10&search=full
Authorization: Bearer <admin-token>
```

---

#### Get Batch by ID
```
GET /api/batches/:id
Authorization: Bearer <admin-token>
```

---

#### Update Batch
```
PUT /api/batches/:id
Authorization: Bearer <admin-token>
```

---

#### Assign User to Batch
```
POST /api/batches/:id/assign
Authorization: Bearer <admin-token>
```
**Body:**
```json
{ "userId": "64f1a2b3c4d5e6f7a8b9c0d1" }
```

---

#### Remove User from Batch
```
DELETE /api/batches/:id/remove/:userId
Authorization: Bearer <admin-token>
```

---

#### Delete Batch
```
DELETE /api/batches/:id
Authorization: Bearer <admin-token>
```

---

### 📚 Resource Management

#### Upload Resource *(Admin)*
```
POST /api/resources
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```
**Form fields (for PDF):**
```
title:  "Week 1 - Intro to Node.js"
type:   pdf
batch:  64f1a2b3c4d5e6f7a8b9c0d1
file:   [binary PDF file]
```

**Body (for link):**
```json
{
  "title": "MDN JavaScript Docs",
  "type": "link",
  "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  "batch": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

---

#### Get All Resources *(Admin)*
```
GET /api/resources?batch=<id>&type=pdf&page=1&limit=10
Authorization: Bearer <admin-token>
```

---

#### Get My Batch Resources *(User)*
```
GET /api/resources/my-batch?type=pdf&page=1&limit=10
Authorization: Bearer <user-token>
```

---

#### Get Resource by ID
```
GET /api/resources/:id
Authorization: Bearer <token>
```

---

#### Update Resource *(Admin)*
```
PUT /api/resources/:id
Authorization: Bearer <admin-token>
```

---

#### Delete Resource *(Admin)*
```
DELETE /api/resources/:id
Authorization: Bearer <admin-token>
```

---

### 📋 Attendance

#### Mark Attendance *(Admin)*
```
POST /api/attendance
Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "student": "64f1a2b3c4d5e6f7a8b9c0d1",
  "batch": "64f1a2b3c4d5e6f7a8b9c0d2",
  "date": "2024-11-20",
  "status": "present",
  "notes": "On time"
}
```

---

#### Bulk Mark Attendance *(Admin)*
```
POST /api/attendance/bulk
Authorization: Bearer <admin-token>
```
**Body:**
```json
{
  "batch": "64f1a2b3c4d5e6f7a8b9c0d2",
  "date": "2024-11-20",
  "records": [
    { "student": "64f1a2b3c4d5e6f7a8b9c0d1", "status": "present" },
    { "student": "64f1a2b3c4d5e6f7a8b9c0d3", "status": "absent" },
    { "student": "64f1a2b3c4d5e6f7a8b9c0d4", "status": "late", "notes": "10 min late" }
  ]
}
```

---

#### Get All Attendance *(Admin)*
```
GET /api/attendance?batch=<id>&student=<id>&date=2024-11-20&status=absent&page=1&limit=20
Authorization: Bearer <admin-token>
```

---

#### Get My Attendance *(User)*
```
GET /api/attendance/my?month=11&year=2024&page=1&limit=20
Authorization: Bearer <user-token>
```
**Response includes summary:**
```json
{
  "data": {
    "records": [...],
    "summary": {
      "total": 20,
      "present": 17,
      "absent": 2,
      "late": 1,
      "attendancePercentage": "85.0"
    }
  }
}
```

---

#### Get Batch Attendance Summary *(Admin)*
```
GET /api/attendance/summary/:batchId
Authorization: Bearer <admin-token>
```

---

## 🔒 Authorization Matrix

| Endpoint Group      | Admin | User |
|---------------------|-------|------|
| Auth (register/login) | ✅  | ✅   |
| User CRUD           | ✅    | ❌   |
| Batch CRUD          | ✅    | ❌   |
| Resource upload     | ✅    | ❌   |
| Resource (my batch) | ❌    | ✅   |
| Mark attendance     | ✅    | ❌   |
| View own attendance | ❌    | ✅   |
| Attendance summary  | ✅    | ❌   |

---

## ⚠️ Error Codes

| Code | Meaning                          |
|------|----------------------------------|
| 400  | Validation error / Bad request   |
| 401  | Unauthorized (invalid/missing token) |
| 403  | Forbidden (wrong role)           |
| 404  | Resource not found               |
| 409  | Conflict (duplicate entry)       |
| 500  | Internal server error            |

---

## 🛠️ Tech Stack

| Layer       | Technology                      |
|-------------|---------------------------------|
| Runtime     | Node.js                         |
| Framework   | Express.js                      |
| Database    | MongoDB + Mongoose              |
| Auth        | JWT + bcryptjs                  |
| Validation  | express-validator               |
| File Upload | Multer (PDF, max 20MB)          |
| Security    | helmet, cors                    |
| Logging     | morgan                          |
#   M a n a g e m e n t _ s y s t e m  
 