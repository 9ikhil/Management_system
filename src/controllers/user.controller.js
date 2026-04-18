const User = require('../models/user.model');
const Batch = require('../models/batch.model');
const { successResponse, errorResponse } = require('../utils/response.utils');

// @desc   Admin: Create a new user
// @route  POST /api/users
// @access Admin
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, assignedBatch, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return errorResponse(res, 409, 'Email is already registered.');

    if (assignedBatch) {
      const batch = await Batch.findById(assignedBatch);
      if (!batch) return errorResponse(res, 404, 'Batch not found.');
    }

    const user = await User.create({ name, email, password, assignedBatch, role: role || 'user' });

    // Add user to batch's students array
    if (assignedBatch) {
      await Batch.findByIdAndUpdate(assignedBatch, { $addToSet: { students: user._id } });
    }

    const populatedUser = await User.findById(user._id).populate('assignedBatch', 'name schedule');

    return successResponse(res, 201, 'User created successfully.', { user: populatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Get all users
// @route  GET /api/users
// @access Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { role, batch, page = 1, limit = 10, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (batch) query.assignedBatch = batch;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .populate('assignedBatch', 'name schedule')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Users fetched.', { users }, {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Get single user
// @route  GET /api/users/:id
// @access Admin
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('assignedBatch', 'name schedule');
    if (!user) return errorResponse(res, 404, 'User not found.');
    return successResponse(res, 200, 'User fetched.', { user });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Update user
// @route  PUT /api/users/:id
// @access Admin
const updateUser = async (req, res, next) => {
  try {
    const { name, email, assignedBatch, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 404, 'User not found.');

    // Handle batch reassignment
    if (assignedBatch !== undefined && String(user.assignedBatch) !== String(assignedBatch)) {
      // Remove from old batch
      if (user.assignedBatch) {
        await Batch.findByIdAndUpdate(user.assignedBatch, { $pull: { students: user._id } });
      }
      // Add to new batch
      if (assignedBatch) {
        const batch = await Batch.findById(assignedBatch);
        if (!batch) return errorResponse(res, 404, 'New batch not found.');
        await Batch.findByIdAndUpdate(assignedBatch, { $addToSet: { students: user._id } });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, assignedBatch, role, isActive },
      { new: true, runValidators: true }
    ).populate('assignedBatch', 'name schedule');

    return successResponse(res, 200, 'User updated.', { user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Delete user
// @route  DELETE /api/users/:id
// @access Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 404, 'User not found.');

    if (user.assignedBatch) {
      await Batch.findByIdAndUpdate(user.assignedBatch, { $pull: { students: user._id } });
    }

    await user.deleteOne();
    return successResponse(res, 200, 'User deleted successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = { createUser, getAllUsers, getUserById, updateUser, deleteUser };
