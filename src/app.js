const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const batchRoutes = require('./routes/batch.routes');
const resourceRoutes = require('./routes/resource.routes');
const attendanceRoutes = require('./routes/attendance.routes');

const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use(errorHandler);

module.exports = app;
