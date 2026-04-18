const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt.utils');
const { successResponse, errorResponse } = require('../utils/response.utils');

// @desc   Register a new user (admin only via user management, this is admin self-register)
// @route  POST /api/auth/register
// @access Public (first admin bootstrap)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 409, 'Email is already registered.');
    }

    const user = await User.create({ name, email, password, role: role || 'user' });

    const token = generateToken({ id: user._id, role: user.role });

    return successResponse(res, 201, 'Registration successful.', {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Login
// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account has been deactivated. Contact admin.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    const token = generateToken({ id: user._id, role: user.role });

    return successResponse(res, 200, 'Login successful.', {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get logged-in user profile
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('assignedBatch', 'name schedule');
    return successResponse(res, 200, 'Profile fetched.', { user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
