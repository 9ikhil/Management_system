const Batch = require('../models/batch.model');
const User = require('../models/user.model');
const { successResponse, errorResponse } = require('../utils/response.utils');

// @desc   Admin: Create batch
// @route  POST /api/batches
// @access Admin
const createBatch = async (req, res, next) => {
  try {
    const { name, description, schedule } = req.body;

    const existing = await Batch.findOne({ name });
    if (existing) return errorResponse(res, 409, 'Batch with this name already exists.');

    const batch = await Batch.create({ name, description, schedule, createdBy: req.user._id });

    return successResponse(res, 201, 'Batch created successfully.', { batch });
  } catch (error) {
    next(error);
  }
};

// @desc   Get all batches
// @route  GET /api/batches
// @access Admin
const getAllBatches = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};

    if (search) query.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [batches, total] = await Promise.all([
      Batch.find(query)
        .populate('createdBy', 'name email')
        .populate('students', 'name email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Batch.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Batches fetched.', { batches }, {
      total, page: Number(page), pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single batch
// @route  GET /api/batches/:id
// @access Admin
const getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('students', 'name email');
    if (!batch) return errorResponse(res, 404, 'Batch not found.');
    return successResponse(res, 200, 'Batch fetched.', { batch });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Update batch
// @route  PUT /api/batches/:id
// @access Admin
const updateBatch = async (req, res, next) => {
  try {
    const { name, description, schedule, isActive } = req.body;
    const batch = await Batch.findById(req.params.id);
    if (!batch) return errorResponse(res, 404, 'Batch not found.');

    const updated = await Batch.findByIdAndUpdate(
      req.params.id,
      { name, description, schedule, isActive },
      { new: true, runValidators: true }
    ).populate('students', 'name email');

    return successResponse(res, 200, 'Batch updated.', { batch: updated });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Assign user to batch
// @route  POST /api/batches/:id/assign
// @access Admin
const assignUserToBatch = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const batch = await Batch.findById(req.params.id);
    if (!batch) return errorResponse(res, 404, 'Batch not found.');

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, 404, 'User not found.');

    // Remove from previous batch if any
    if (user.assignedBatch && String(user.assignedBatch) !== String(batch._id)) {
      await Batch.findByIdAndUpdate(user.assignedBatch, { $pull: { students: user._id } });
    }

    await Batch.findByIdAndUpdate(batch._id, { $addToSet: { students: user._id } });
    await User.findByIdAndUpdate(userId, { assignedBatch: batch._id });

    const updatedBatch = await Batch.findById(batch._id).populate('students', 'name email');
    return successResponse(res, 200, 'User assigned to batch.', { batch: updatedBatch });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Remove user from batch
// @route  DELETE /api/batches/:id/remove/:userId
// @access Admin
const removeUserFromBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return errorResponse(res, 404, 'Batch not found.');

    await Batch.findByIdAndUpdate(batch._id, { $pull: { students: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { assignedBatch: null });

    return successResponse(res, 200, 'User removed from batch.');
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Delete batch
// @route  DELETE /api/batches/:id
// @access Admin
const deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return errorResponse(res, 404, 'Batch not found.');

    // Unassign all students
    await User.updateMany({ assignedBatch: batch._id }, { assignedBatch: null });
    await batch.deleteOne();

    return successResponse(res, 200, 'Batch deleted.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBatch, getAllBatches, getBatchById, updateBatch,
  assignUserToBatch, removeUserFromBatch, deleteBatch,
};
