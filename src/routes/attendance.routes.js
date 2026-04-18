const express = require('express');
const { body } = require('express-validator');
const {
  markAttendance, bulkMarkAttendance, getAllAttendance,
  getMyAttendance, getBatchAttendanceSummary,
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(protect);

// User: View own attendance
router.get('/my', authorize('user'), getMyAttendance);

// Admin only routes
router.use(authorize('admin'));

router.get('/', getAllAttendance);

router.post(
  '/',
  [
    body('student').isMongoId().withMessage('Valid student ID is required'),
    body('batch').isMongoId().withMessage('Valid batch ID is required'),
    body('date').isISO8601().withMessage('Valid date is required (ISO8601 format)'),
    body('status').isIn(['present', 'absent', 'late']).withMessage('Status must be present, absent, or late'),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  markAttendance
);

router.post(
  '/bulk',
  [
    body('batch').isMongoId().withMessage('Valid batch ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('records').isArray({ min: 1 }).withMessage('Records must be a non-empty array'),
    body('records.*.student').isMongoId().withMessage('Each record must have a valid student ID'),
    body('records.*.status').isIn(['present', 'absent', 'late']).withMessage('Each status must be present, absent, or late'),
  ],
  validate,
  bulkMarkAttendance
);

router.get('/summary/:batchId', getBatchAttendanceSummary);

module.exports = router;
