const Attendance = require('../models/attendance.model');
const Batch = require('../models/batch.model');
const User = require('../models/user.model');
const { successResponse, errorResponse } = require('../utils/response.utils');

// @desc   Admin: Mark attendance for a student
// @route  POST /api/attendance
// @access Admin
const markAttendance = async (req, res, next) => {
  try {
    const { student, batch, date, status, notes } = req.body;

    // Verify batch exists
    const batchDoc = await Batch.findById(batch);
    if (!batchDoc) return errorResponse(res, 404, 'Batch not found.');

    // Verify student exists and belongs to this batch
    const studentDoc = await User.findById(student);
    if (!studentDoc) return errorResponse(res, 404, 'Student not found.');
    if (String(studentDoc.assignedBatch) !== String(batch)) {
      return errorResponse(res, 400, 'Student does not belong to this batch.');
    }

    // Normalize date to midnight UTC
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Upsert attendance (update if already marked, else create)
    const attendance = await Attendance.findOneAndUpdate(
      { student, batch, date: attendanceDate },
      { status, notes, markedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    )
      .populate('student', 'name email')
      .populate('batch', 'name')
      .populate('markedBy', 'name');

    return successResponse(res, 200, 'Attendance marked successfully.', { attendance });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Bulk mark attendance for an entire batch on a date
// @route  POST /api/attendance/bulk
// @access Admin
const bulkMarkAttendance = async (req, res, next) => {
  try {
    const { batch, date, records } = req.body;
    // records: [{ student, status, notes }]

    const batchDoc = await Batch.findById(batch).populate('students', '_id');
    if (!batchDoc) return errorResponse(res, 404, 'Batch not found.');

    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const validStudentIds = batchDoc.students.map((s) => String(s._id));

    const ops = records
      .filter((r) => validStudentIds.includes(String(r.student)))
      .map((r) => ({
        updateOne: {
          filter: { student: r.student, batch, date: attendanceDate },
          update: { $set: { status: r.status, notes: r.notes || '', markedBy: req.user._id } },
          upsert: true,
        },
      }));

    if (ops.length === 0) {
      return errorResponse(res, 400, 'No valid students found in the provided records.');
    }

    await Attendance.bulkWrite(ops);

    return successResponse(res, 200, `Attendance marked for ${ops.length} student(s).`, {
      processed: ops.length,
      date: attendanceDate,
      batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Get attendance records (filterable)
// @route  GET /api/attendance
// @access Admin
const getAllAttendance = async (req, res, next) => {
  try {
    const { batch, student, date, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (batch) query.batch = batch;
    if (student) query.student = student;
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      query.date = d;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('student', 'name email')
        .populate('batch', 'name')
        .populate('markedBy', 'name')
        .skip(skip)
        .limit(Number(limit))
        .sort({ date: -1 }),
      Attendance.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Attendance records fetched.', { records }, {
      total, page: Number(page), pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   User: View their own attendance
// @route  GET /api/attendance/my
// @access User
const getMyAttendance = async (req, res, next) => {
  try {
    if (!req.user.assignedBatch) {
      return errorResponse(res, 400, 'You are not assigned to any batch.');
    }

    const { page = 1, limit = 20, month, year } = req.query;
    const query = { student: req.user._id, batch: req.user.assignedBatch };

    // Optional filter by month/year
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      query.date = { $gte: start, $lt: end };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('batch', 'name')
        .populate('markedBy', 'name')
        .skip(skip)
        .limit(Number(limit))
        .sort({ date: -1 }),
      Attendance.countDocuments(query),
    ]);

    // Summary stats
    const allRecords = await Attendance.find({ student: req.user._id, batch: req.user.assignedBatch });
    const summary = {
      total: allRecords.length,
      present: allRecords.filter((r) => r.status === 'present').length,
      absent: allRecords.filter((r) => r.status === 'absent').length,
      late: allRecords.filter((r) => r.status === 'late').length,
    };
    summary.attendancePercentage =
      summary.total > 0 ? ((summary.present / summary.total) * 100).toFixed(1) : '0.0';

    return successResponse(res, 200, 'Attendance fetched.', { records, summary }, {
      total, page: Number(page), pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Get attendance summary for a batch
// @route  GET /api/attendance/summary/:batchId
// @access Admin
const getBatchAttendanceSummary = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.batchId).populate('students', 'name email');
    if (!batch) return errorResponse(res, 404, 'Batch not found.');

    const summary = await Promise.all(
      batch.students.map(async (student) => {
        const records = await Attendance.find({ student: student._id, batch: batch._id });
        const present = records.filter((r) => r.status === 'present').length;
        const absent = records.filter((r) => r.status === 'absent').length;
        const late = records.filter((r) => r.status === 'late').length;
        return {
          student: { id: student._id, name: student.name, email: student.email },
          total: records.length,
          present,
          absent,
          late,
          attendancePercentage: records.length > 0 ? ((present / records.length) * 100).toFixed(1) : '0.0',
        };
      })
    );

    return successResponse(res, 200, 'Batch attendance summary fetched.', { batch: batch.name, summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  getAllAttendance,
  getMyAttendance,
  getBatchAttendanceSummary,
};
